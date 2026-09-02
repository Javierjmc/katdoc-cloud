// hooks/useCalendarEvents.ts
// ============================================================
// Eventos del calendario (S23): reúne citas, próximas vacunas/
// desparasitaciones y controles de exámenes en un rango de fechas.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type CalendarEvent = {
  id: string;
  type: 'cita' | 'vacuna' | 'desparasitacion' | 'examen';
  fecha: string;          // YYYY-MM-DD
  hora?: string;
  titulo: string;
  subtitulo?: string;
  estado?: string;
  patientId: string;
  patientNombre: string;
};

type MaybePatient = { id: string; nombre: string } | { id: string; nombre: string }[] | null;

function asPatient(p: MaybePatient): { id: string; nombre: string } | null {
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
}

type ApptRow = {
  id: string;
  fecha: string;
  hora?: string | null;
  motivo?: string | null;
  estado: string;
  nombre_paciente?: string | null;
  patient: MaybePatient;
};

type VacRow = {
  id: string;
  vacuna: string;
  categoria?: string | null;
  fecha_proxima_dosis: string;
  patient: MaybePatient;
};

type ExamRow = {
  id: string;
  nombre_examen: string;
  fecha_proximo_control: string;
  patient: MaybePatient;
};

const DEWORM_KEYWORDS = [
  'desparasit', 'drontal', 'milbemax', 'ivermectina', 'bravecto', 'nexgard', 'simparica', 'febendazol', 'praziquantel',
];

function guessTipo(nombre: string): 'vacuna' | 'desparasitacion' {
  const n = nombre.toLowerCase();
  return DEWORM_KEYWORDS.some(k => n.includes(k)) ? 'desparasitacion' : 'vacuna';
}

export function useCalendarEvents(from: string, to: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [appt, vac, exam] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, fecha, hora, motivo, estado, nombre_paciente, patient:patients(id, nombre)')
        .gte('fecha', from)
        .lte('fecha', to),
      supabase
        .from('vaccinations')
        .select('id, vacuna, categoria, fecha_proxima_dosis, patient:patients!inner(id, nombre, active)')
        .not('fecha_proxima_dosis', 'is', null)
        .eq('patient.active', true)
        .gte('fecha_proxima_dosis', from)
        .lte('fecha_proxima_dosis', to),
      supabase
        .from('laboratory_exams')
        .select('id, nombre_examen, fecha_proximo_control, patient:patients!inner(id, nombre, active)')
        .not('fecha_proximo_control', 'is', null)
        .eq('patient.active', true)
        .gte('fecha_proximo_control', from)
        .lte('fecha_proximo_control', to),
    ]);

    if (appt.error || vac.error || exam.error) {
      setError(appt.error?.message ?? vac.error?.message ?? exam.error?.message ?? 'Error cargando eventos');
      setLoading(false);
      return;
    }

    const citas: CalendarEvent[] = ((appt.data ?? []) as ApptRow[]).map(a => {
      const p = asPatient(a.patient);
      return {
        id: a.id,
        type: 'cita' as const,
        fecha: a.fecha,
        hora: a.hora ?? undefined,
        titulo: a.motivo || (p?.nombre ?? a.nombre_paciente ?? 'Cita'),
        estado: a.estado,
        patientId: p?.id ?? '',
        patientNombre: p?.nombre ?? a.nombre_paciente ?? 'Paciente sin ficha',
      };
    });

    const vacunas: CalendarEvent[] = ((vac.data ?? []) as VacRow[]).map(v => {
      const p = asPatient(v.patient);
      const tipo = (v.categoria === 'vacuna' || v.categoria === 'desparasitacion'
        ? v.categoria
        : guessTipo(v.vacuna)) as CalendarEvent['type'];
      return {
        id: v.id,
        type: tipo,
        fecha: v.fecha_proxima_dosis,
        titulo: v.vacuna,
        subtitulo: tipo === 'desparasitacion' ? 'Próxima desparasitación' : 'Próxima dosis',
        patientId: p?.id ?? '',
        patientNombre: p?.nombre ?? '—',
      };
    });

    const examenes: CalendarEvent[] = ((exam.data ?? []) as ExamRow[]).map(e => {
      const p = asPatient(e.patient);
      return {
        id: e.id,
        type: 'examen' as const,
        fecha: e.fecha_proximo_control,
        titulo: e.nombre_examen,
        subtitulo: 'Próximo control',
        patientId: p?.id ?? '',
        patientNombre: p?.nombre ?? '—',
      };
    });

    setEvents([...citas, ...vacunas, ...examenes].sort((a, b) =>
      a.fecha.localeCompare(b.fecha) || (a.hora ?? '').localeCompare(b.hora ?? '')
    ));
    setLoading(false);
  }, [from, to]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
