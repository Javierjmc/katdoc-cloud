'use client';
// app/agenda/page.tsx
// Calendario mensual (S23): citas + próximas vacunas/desparasitaciones
// + controles de exámenes. Click en un día → detalle + "Agendar cita".

import { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea, Select } from '@/components/ui/Input';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents';
import { usePatients } from '@/hooks/usePatients';
import { createAppointment } from '@/hooks/useAppointments';
import { appointmentSchema, validateSchema, type FieldErrors } from '@/lib/schemas';
import { isPastDateTime, normalizePhoneForWhatsApp } from '@/lib/utils';
import Link from 'next/link';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const TYPE_META: Record<CalendarEvent['type'], { label: string; dot: string; badge: string }> = {
  cita:            { label: 'Cita',            dot: 'bg-brand-500',          badge: 'bg-brand-50 text-brand-600 border-brand-200' },
  vacuna:          { label: 'Vacuna',          dot: 'bg-blue-500',           badge: 'bg-blue-50 text-blue-600 border-blue-200' },
  desparasitacion: { label: 'Desparasitación', dot: 'bg-green-500',          badge: 'bg-green-50 text-green-700 border-green-200' },
  examen:          { label: 'Control examen',  dot: 'bg-yellow-500',         badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
};

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildGrid(year: number, month: number): (string | null)[] {
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function AgendaPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(toYMD(today));
  const [dayModal, setDayModal] = useState<string | null>(null);
  const { toast } = useToast();

  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;

  const { events, loading } = useCalendarEvents(from, to);
  const { patients } = usePatients({ active: true });

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.fecha) ?? [];
      list.push(e);
      map.set(e.fecha, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    hora: '',
    motivo: '',
    notas: '',
    nombre_paciente: '',
    tutor_nombre: '',
    telefono: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  // S38: valor centinela para "paciente no registrado".
  const FREE_PATIENT = '__free__';

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelected(toYMD(t));
  };

  const openCreate = (day: string) => {
    setForm({ patient_id: '', hora: '', motivo: '', notas: '', nombre_paciente: '', tutor_nombre: '', telefono: '' });
    setFieldErrors({});
    setSelected(day);
    setDayModal(null);
    setShowCreate(true);
  };

  const setFormField = (key: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setFieldErrors({});
  };

  const handleCreate = async () => {
    if (!selected) return;
    if (isPastDateTime(selected, form.hora)) {
      toast('No se puede agendar en una fecha/hora pasada', 'error');
      setFieldErrors({ hora: 'Fecha/hora en el pasado' });
      return;
    }
    const errors = validateSchema(appointmentSchema, { ...form, fecha: selected });
    if (errors) { setFieldErrors(errors); toast('Revisa los campos marcados', 'error'); return; }

    // S38: cita libre (sin ficha) o cita normal con paciente.
    const isFree = form.patient_id === FREE_PATIENT;
    if (!form.patient_id) {
      toast('Seleccioná un paciente o usá "Paciente no registrado"', 'error');
      return;
    }
    if (isFree && !form.nombre_paciente.trim()) {
      toast('Escribí el nombre de la mascota', 'error');
      setFieldErrors({ nombre_paciente: 'Indicá el nombre de la mascota' });
      return;
    }

    const patient = patients.find(p => p.id === form.patient_id);
    setSaving(true);
    const { error } = await createAppointment(
      isFree
        ? {
            patient_id: null,
            tutor_id: null,
            nombre_paciente: form.nombre_paciente.trim(),
            tutor_nombre: form.tutor_nombre.trim() || undefined,
            telefono_tutor: normalizePhoneForWhatsApp(form.telefono) ?? (form.telefono.trim() || undefined),
            fecha: selected,
            hora: form.hora || undefined,
            motivo: form.motivo.trim() || undefined,
            notas: form.notas.trim() || undefined,
            estado: 'programada',
          }
        : {
            patient_id: form.patient_id,
            tutor_id: patient?.tutor?.id,
            fecha: selected,
            hora: form.hora || undefined,
            motivo: form.motivo.trim() || undefined,
            notas: form.notas.trim() || undefined,
            estado: 'programada',
          }
    );
    setSaving(false);
    if (error) toast(`Error al agendar: ${error}`, 'error');
    else { toast('Cita agendada', 'success'); setShowCreate(false); }
  };

  const todayStr = toYMD(today);

  return (
    <AppShell>
      <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-surface-800 dark:text-white">Agenda</h1>
          <p className="text-xs text-surface-400 dark:text-surface-500">Citas, vacunas y controles del mes</p>
        </div>
        <button onClick={goToday} className="px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-sm font-bold transition-colors">
          Hoy
        </button>
      </header>

      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto">
        {/* Navegación de mes */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => { setMonth(m => m === 0 ? 11 : m - 1); setYear(y => (month === 0 ? y - 1 : y)); }}
              className="w-9 h-9 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 font-bold">‹</button>
            <button onClick={() => { setMonth(m => m === 11 ? 0 : m + 1); setYear(y => (month === 11 ? y + 1 : y)); }}
              className="w-9 h-9 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 font-bold">›</button>
            <h2 className="text-lg font-black text-surface-800 dark:text-white ml-2">{MONTHS[month]} {year}</h2>
          </div>
          <div className="hidden sm:flex gap-3 text-xs text-surface-500 dark:text-surface-400">
            {(Object.keys(TYPE_META) as CalendarEvent['type'][]).map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${TYPE_META[t].dot}`} /> {TYPE_META[t].label}
              </span>
            ))}
          </div>
        </div>

        {/* Grid del mes */}
        {loading ? <PageLoader /> : (
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-2 text-center text-[11px] font-black uppercase tracking-wide text-surface-400 dark:text-surface-500">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="min-h-[72px] sm:min-h-[104px] border-b border-r border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/50" />;
                const dayEvents = byDay.get(date) ?? [];
                const isToday = date === todayStr;
                const isSelected = date === selected;
                return (
                  <button
                    key={date}
                    onClick={() => { setSelected(date); setDayModal(date); }}
                    className={`min-h-[72px] sm:min-h-[104px] p-1.5 sm:p-2 text-left border-b border-r border-surface-100 dark:border-surface-800 transition-colors hover:bg-brand-50/40 ${isSelected ? 'bg-brand-50 ring-2 ring-inset ring-brand-400' : ''}`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${isToday ? 'bg-brand-500 text-white' : 'text-surface-600 dark:text-surface-300'}`}>
                      {Number(date.slice(8))}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={`${e.type}-${e.id}`} className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold truncate ${TYPE_META[e.type].badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_META[e.type].dot}`} />
                          <span className="truncate">{e.titulo}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="hidden sm:block text-[10px] font-bold text-surface-400 dark:text-surface-500 px-1">+{dayEvents.length - 3} más</p>
                      )}
                      {dayEvents.length > 0 && (
                        <p className="sm:hidden text-[10px] font-bold text-surface-500 dark:text-surface-400 px-1">{dayEvents.length} ▲</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Detalle del día en modal (S37) */}
        {dayModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDayModal(null)}>
            <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-surface-800 dark:text-white text-sm">
                  📅 {new Date(dayModal + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <Button size="sm" onClick={() => openCreate(dayModal)}>+ Agendar cita</Button>
              </div>

              {(() => {
                const dayEvents = byDay.get(dayModal) ?? [];
                if (dayEvents.length === 0) {
                  return <p className="text-sm text-surface-400 dark:text-surface-500 py-4 text-center">Sin eventos este día.</p>;
                }
                return (
                  <div className="space-y-2">
                    {dayEvents.map(e => (
                      <div key={`${e.type}-${e.id}`} className="flex items-start gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700">
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${TYPE_META[e.type].dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-surface-800 dark:text-white">{e.titulo}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${TYPE_META[e.type].badge}`}>{TYPE_META[e.type].label}</span>
                            {e.estado && <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700 font-bold capitalize">{e.estado}</span>}
                          </div>
                          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                            🐾 {e.patientId ? (
                              <Link href={`/patients/${e.patientId}`} className="hover:text-brand-500" onClick={() => setDayModal(null)}>{e.patientNombre}</Link>
                            ) : e.patientNombre}
                            {e.hora && <> · 🕐 {e.hora}</>}
                            {e.subtitulo && <> · {e.subtitulo}</>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Modal: agendar cita desde el calendario */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-surface-800 dark:text-white">Agendar cita</h3>
            <p className="text-xs text-surface-400 dark:text-surface-500">📅 {selected ? new Date(selected + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</p>

            <Field label="Paciente" required error={fieldErrors.patient_id}>
              <Select
                value={form.patient_id}
                onChange={e => setFormField('patient_id', e.target.value)}
                options={[
                  { value: '', label: 'Seleccionar paciente...' },
                  { value: FREE_PATIENT, label: '➕ Paciente no registrado (escribir nombre)' },
                  ...patients.map(p => ({ value: p.id, label: `${p.nombre}${p.tutor ? ` (${p.tutor.nombre})` : ''}` })),
                ]}
              />
            </Field>

            {/* S38: cita libre — datos escritos a mano */}
            {form.patient_id === FREE_PATIENT && (
              <div className="space-y-3 rounded-xl bg-surface-50 dark:bg-surface-900 p-3 border border-surface-200 dark:border-surface-700">
                <Field label="Nombre de la mascota" required error={fieldErrors.nombre_paciente}>
                  <Input value={form.nombre_paciente} onChange={e => setFormField('nombre_paciente', e.target.value)} placeholder="Ej: Cachorro nuevo" />
                </Field>
                <Field label="Nombre del tutor (opcional)">
                  <Input value={form.tutor_nombre} onChange={e => setFormField('tutor_nombre', e.target.value)} placeholder="Ej: Juan Pérez" />
                </Field>
                <Field label="Teléfono (opcional)" hint="Se usará para WhatsApp (prefijo +58)">
                  <Input type="tel" inputMode="tel" value={form.telefono} onChange={e => setFormField('telefono', e.target.value)} placeholder="+58 412-0000000" />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora" error={fieldErrors.hora}>
                <Input type="time" value={form.hora} onChange={e => setFormField('hora', e.target.value)} />
              </Field>
              <Field label="Motivo">
                <Input value={form.motivo} onChange={e => setFormField('motivo', e.target.value)} placeholder="Ej: Consulta" />
              </Field>
            </div>
            <Field label="Notas">
              <Textarea rows={2} value={form.notas} onChange={e => setFormField('notas', e.target.value)} placeholder="Notas opcionales" />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setShowCreate(false)} disabled={saving}>Cancelar</Button>
              <Button fullWidth loading={saving} onClick={handleCreate}>Agendar</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
