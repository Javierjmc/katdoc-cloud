'use client';
// components/AppointmentsSection.tsx
// Citas de un paciente: listado, alta/edición y cambio de estado.

import { useState } from 'react';
import { useAppointments, createAppointment, updateAppointment, deleteAppointment, type AppointmentInput } from '@/hooks/useAppointments';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Badge';
import { appointmentSchema, validateSchema, type FieldErrors } from '@/lib/schemas';
import { APPOINTMENT_STATES, type Appointment, type AppointmentState } from '@/types';

type EditorState = {
  mode: 'create' | 'edit';
  id?: string;
  data: AppointmentInput;
};

const EMPTY: AppointmentInput = {
  patient_id: '',
  fecha: '',
  hora: '',
  motivo: '',
  estado: 'programada',
  notas: '',
};

function fromAppointment(a: Appointment): AppointmentInput {
  return {
    patient_id: a.patient_id,
    tutor_id: a.tutor_id,
    fecha: a.fecha,
    hora: a.hora ?? '',
    motivo: a.motivo ?? '',
    estado: a.estado,
    notas: a.notas ?? '',
  };
}

function stateBadge(estado: AppointmentState) {
  const meta = APPOINTMENT_STATES.find(s => s.value === estado);
  const color = meta?.color ?? 'slate';
  const classes: Record<string, string> = {
    brand:  'bg-brand-50 text-brand-600 border-brand-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    slate:  'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border-surface-200 dark:border-surface-700',
    red:    'bg-red-50 text-red-600 border-red-200',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${classes[color]}`}>
      {meta?.label ?? estado}
    </span>
  );
}

export default function AppointmentsSection({ patientId, tutorId }: { patientId: string; tutorId?: string }) {
  const { appointments, loading, refetch } = useAppointments({ patientId });
  const { toast } = useToast();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toDelete, setToDelete] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const openCreate = () => { setFieldErrors({}); setEditor({ mode: 'create', data: { ...EMPTY, patient_id: patientId, tutor_id: tutorId } }); };
  const openEdit = (a: Appointment) => { setFieldErrors({}); setEditor({ mode: 'edit', id: a.id, data: fromAppointment(a) }); };

  const setField = (key: keyof AppointmentInput, value: string) => {
    setEditor(prev => prev ? { ...prev, data: { ...prev.data, [key]: value } } : prev);
    setFieldErrors({});
  };

  const handleSave = async () => {
    if (!editor) return;
    const errors = validateSchema(appointmentSchema, editor.data);
    if (errors) { setFieldErrors(errors); toast('Revisa los campos marcados', 'error'); return; }
    setSaving(true);

    if (editor.mode === 'create') {
      const { error } = await createAppointment(editor.data);
      if (error) toast(`Error al guardar: ${error}`, 'error');
      else { toast('Cita agendada', 'success'); setEditor(null); refetch(); }
    } else if (editor.id) {
      const { error } = await updateAppointment(editor.id, editor.data);
      if (error) toast(`Error al guardar: ${error}`, 'error');
      else { toast('Cita actualizada', 'success'); setEditor(null); refetch(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await deleteAppointment(toDelete.id);
    if (error) toast(`Error al eliminar: ${error}`, 'error');
    else { toast('Cita eliminada', 'success'); setToDelete(null); refetch(); }
  };

  const changeState = async (a: Appointment, estado: AppointmentState) => {
    const { error } = await updateAppointment(a.id, { estado });
    if (error) toast(`Error: ${error}`, 'error');
    else { toast('Estado actualizado', 'success'); refetch(); }
  };

  const upcoming = appointments.filter(a => a.estado === 'programada' || a.estado === 'confirmada');
  const past = appointments.filter(a => a.estado === 'completada' || a.estado === 'cancelada' || a.estado === 'no_asistio');

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 dark:border-surface-800">
        <h3 className="text-sm font-black text-surface-700 dark:text-surface-200">📅 Citas</h3>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors"
        >
          + Agendar
        </button>
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)}</div>
        ) : appointments.length === 0 ? (
          <EmptyState icon="📅" title="Sin citas" subtitle="Agenda la próxima consulta del paciente."
            action={<Button size="sm" onClick={openCreate}>Agendar cita</Button>} />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-2">
                {upcoming.map(a => <CitaRow key={a.id} a={a} onEdit={() => openEdit(a)} onDelete={() => setToDelete(a)} onChangeState={estado => changeState(a, estado)} />)}
              </div>
            )}
            {past.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-black text-surface-400 dark:text-surface-500 uppercase tracking-wide mb-1.5">Historial</p>
                <div className="space-y-2">
                  {past.map(a => <CitaRow key={a.id} a={a} onEdit={() => openEdit(a)} onDelete={() => setToDelete(a)} onChangeState={estado => changeState(a, estado)} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Editor */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setEditor(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-surface-800 dark:text-white">{editor.mode === 'create' ? 'Agendar cita' : 'Editar cita'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha" required error={fieldErrors.fecha}>
                <Input type="date" value={editor.data.fecha} onChange={e => setField('fecha', e.target.value)} />
              </Field>
              <Field label="Hora" error={fieldErrors.hora}>
                <Input type="time" value={editor.data.hora ?? ''} onChange={e => setField('hora', e.target.value)} />
              </Field>
            </div>
            <Field label="Motivo">
              <Input value={editor.data.motivo ?? ''} onChange={e => setField('motivo', e.target.value)} placeholder="Ej: Control anual, vacuna, consulta..." />
            </Field>
            <Field label="Estado">
              <Select value={editor.data.estado ?? 'programada'}
                onChange={e => setField('estado', e.target.value)}
                options={[{ value: '', label: 'Seleccionar...' }, ...APPOINTMENT_STATES.map(s => ({ value: s.value, label: s.label }))]} />
            </Field>
            <Field label="Notas">
              <Textarea rows={2} value={editor.data.notas ?? ''} onChange={e => setField('notas', e.target.value)} placeholder="Notas opcionales" />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setEditor(null)} disabled={saving}>Cancelar</Button>
              <Button fullWidth loading={saving} onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar cita"
        message="¿Eliminar esta cita? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function CitaRow({ a, onEdit, onDelete, onChangeState }: {
  a: Appointment;
  onEdit: () => void;
  onDelete: () => void;
  onChangeState: (estado: AppointmentState) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-brand-400 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-sm text-surface-800 dark:text-white">
            {new Date(a.fecha).toLocaleDateString('es-VE')}
            {a.hora && <span className="font-semibold text-surface-400 dark:text-surface-500 ml-1">· {a.hora}</span>}
          </p>
          {stateBadge(a.estado)}
        </div>
        {a.motivo && <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{a.motivo}</p>}
        {a.notas && <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">{a.notas}</p>}
      </div>

      <div className="flex gap-1 shrink-0 items-center">
        <select
          value={a.estado}
          onChange={e => onChangeState(e.target.value as AppointmentState)}
          className="text-[11px] px-1.5 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 focus:outline-none focus:border-brand-400"
          aria-label="Cambiar estado"
        >
          {APPOINTMENT_STATES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={onEdit} className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs" aria-label="Editar">✏️</button>
        <button onClick={onDelete} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs" aria-label="Eliminar">🗑️</button>
      </div>
    </div>
  );
}
