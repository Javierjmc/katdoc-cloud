// lib/notifications/scan.ts
// ============================================================
// Motor de recordatorios (S14) — server-only.
// Escanea vacunas y exámenes con fecha de próximo evento y crea
// recordatorios pendientes dentro de las ventanas configurables.
// IDEMPOTENTE gracias al UNIQUE (patient_id, tipo, fecha_evento, titulo).
// ============================================================

import { supabase } from '@/lib/supabase';
import type { NotificationConfig } from '@/types';

// Palabras que identifican desparasitantes en el nombre de la vacuna
const DEWORM_KEYWORDS = [
  'desparasit', 'drontal', 'milbemax', 'ivermectina', 'bravecto', 'nexgard', 'simparica', 'febendazol', 'praziquantel',
];

function guessTipo(vacuna: string): string {
  const n = vacuna.toLowerCase();
  return DEWORM_KEYWORDS.some(k => n.includes(k)) ? 'desparasitacion' : 'vacuna';
}

export type ScanResult = { creados: number; existentes: number; errores: number };

export async function scanReminders(): Promise<ScanResult> {
  let creados = 0;
  let existentes = 0;
  let errores = 0;

  // 1. Configuración habilitada
  const { data: configs, error: cfgErr } = await supabase
    .from('notification_config')
    .select('*')
    .eq('enabled', true);

  if (cfgErr) throw new Error(`Error leyendo configuración: ${cfgErr.message}`);
  const configMap = new Map<string, NotificationConfig>((configs ?? []).map(c => [c.tipo, c]));

  // 2. Vacunas con próxima dosis (solo pacientes activos)
  const { data: vaccinations, error: vacErr } = await supabase
    .from('vaccinations')
    .select('id, vacuna, fecha_proxima_dosis, patient:patients!inner(id, nombre, active, tutor:tutors!inner(id, nombre, telefono, email))')
    .not('fecha_proxima_dosis', 'is', null)
    .eq('patient.active', true);

  if (vacErr) throw new Error(`Error leyendo vacunas: ${vacErr.message}`);

  for (const v of (vaccinations ?? []) as unknown as {
    vacuna: string; fecha_proxima_dosis: string;
    patient: { id: string; nombre: string; tutor: { id: string; nombre: string; telefono?: string; email?: string } };
  }[]) {
    const tipo = guessTipo(v.vacuna);
    const cfg = configMap.get(tipo);
    if (!cfg) continue;

    const titulo = `Vacuna ${v.vacuna} próxima`;
    const ok = await insertIfInWindow({
      patient_id: v.patient.id,
      tutor_id: v.patient.tutor.id,
      tipo,
      titulo,
      descripcion: `Paciente ${v.patient.nombre}`,
      fecha_evento: v.fecha_proxima_dosis,
      cfg,
    });
    if (ok === 'created') creados++;
    else if (ok === 'exists') existentes++;
    else errores++;
  }

  // 3. Exámenes con próximo control (solo pacientes activos)
  const { data: exams, error: exErr } = await supabase
    .from('laboratory_exams')
    .select('id, nombre_examen, fecha_proximo_control, patient:patients!inner(id, nombre, active, tutor:tutors!inner(id, nombre, telefono, email))')
    .not('fecha_proximo_control', 'is', null)
    .eq('patient.active', true);

  if (exErr) throw new Error(`Error leyendo exámenes: ${exErr.message}`);

  for (const e of (exams ?? []) as unknown as {
    nombre_examen: string; fecha_proximo_control: string;
    patient: { id: string; nombre: string; tutor: { id: string; nombre: string; telefono?: string; email?: string } };
  }[]) {
    const cfg = configMap.get('examen');
    if (!cfg) continue;

    const titulo = `Examen ${e.nombre_examen} — próximo control`;
    const ok = await insertIfInWindow({
      patient_id: e.patient.id,
      tutor_id: e.patient.tutor.id,
      tipo: 'examen',
      titulo,
      descripcion: `Paciente ${e.patient.nombre}`,
      fecha_evento: e.fecha_proximo_control,
      cfg,
    });
    if (ok === 'created') creados++;
    else if (ok === 'exists') existentes++;
    else errores++;
  }

  // 4. Citas agendadas (S22/S24): programadas o confirmadas
  const { data: citas, error: citErr } = await supabase
    .from('appointments')
    .select('id, fecha, hora, motivo, estado, patient:patients!inner(id, nombre, active, tutor:tutors!inner(id, nombre, telefono, email))')
    .or('estado.eq.programada,estado.eq.confirmada')
    .eq('patient.active', true);

  if (citErr) throw new Error(`Error leyendo citas: ${citErr.message}`);

  for (const c of (citas ?? []) as unknown as {
    fecha: string; hora?: string; motivo?: string;
    patient: { id: string; nombre: string; tutor: { id: string; nombre: string; telefono?: string; email?: string } };
  }[]) {
    const cfg = configMap.get('cita');
    if (!cfg) continue;

    const titulo = c.motivo || 'Cita agendada';
    const ok = await insertIfInWindow({
      patient_id: c.patient.id,
      tutor_id: c.patient.tutor.id,
      tipo: 'cita',
      titulo,
      descripcion: c.hora ? `Paciente ${c.patient.nombre} · ${c.hora}` : `Paciente ${c.patient.nombre}`,
      fecha_evento: c.fecha,
      cfg,
    });
    if (ok === 'created') creados++;
    else if (ok === 'exists') existentes++;
    else errores++;
  }

  return { creados, existentes, errores };
}

type InWindow = {
  patient_id: string;
  tutor_id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  fecha_evento: string;
  cfg: NotificationConfig;
};

async function insertIfInWindow(input: InWindow): Promise<'created' | 'exists' | 'error'> {
  const hoy = startOfDay(new Date());
  const evento = startOfDay(new Date(input.fecha_evento));
  const ventana = addDays(evento, -input.cfg.dias_antes);
  const grace = addDays(evento, Math.max(input.cfg.dias_despues, 3));

  // En ventana (próximo) o recién vencido dentro de la tolerancia
  const inWindow = hoy >= ventana && hoy <= grace;
  if (!inWindow) return 'exists'; // no corresponde aún

  const { error } = await supabase.from('reminders').insert({
    patient_id: input.patient_id,
    tutor_id: input.tutor_id,
    tipo: input.tipo,
    titulo: input.titulo,
    descripcion: input.descripcion,
    fecha_evento: input.fecha_evento,
    fecha_ventana: ventana.toISOString().split('T')[0],
    estado: 'pendiente',
  });

  if (error) {
    // Violación de UNIQUE = ya existía
    if (error.message.includes('duplicate key')) return 'exists';
    console.error('Error creando recordatorio:', error.message);
    return 'error';
  }
  return 'created';
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}
