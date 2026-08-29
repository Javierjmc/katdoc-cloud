'use client';
// components/VaccinationsSection.tsx
// Lista y edición de vacunas estructuradas de un paciente.

import { useState } from 'react';
import { useVaccinations, createVaccination, updateVaccination, deleteVaccination, type VaccinationInput } from '@/hooks/useVaccinations';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Badge';
import type { Vaccination } from '@/types';

type EditorState = {
  mode: 'create' | 'edit';
  data: VaccinationInput;
  id?: string;
};

const EMPTY: VaccinationInput = {
  patient_id: '',
  vacuna: '',
  fecha_aplicacion: '',
  fecha_proxima_dosis: '',
  marca: '',
  lote: '',
  dosis: '',
  observaciones: '',
};

function fromVaccination(v: Vaccination): VaccinationInput {
  return {
    patient_id: v.patient_id,
    vacuna: v.vacuna,
    fecha_aplicacion: v.fecha_aplicacion ?? '',
    fecha_proxima_dosis: v.fecha_proxima_dosis ?? '',
    marca: v.marca ?? '',
    lote: v.lote ?? '',
    dosis: v.dosis ?? '',
    observaciones: v.observaciones ?? '',
  };
}

export default function VaccinationsSection({ patientId }: { patientId: string }) {
  const { vaccinations, loading, refetch } = useVaccinations(patientId);
  const { toast } = useToast();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toDelete, setToDelete] = useState<Vaccination | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => setEditor({ mode: 'create', data: { ...EMPTY, patient_id: patientId } });
  const openEdit = (v: Vaccination) => setEditor({ mode: 'edit', id: v.id, data: fromVaccination(v) });

  const setField = (key: keyof VaccinationInput, value: string) => {
    setEditor(prev => prev ? { ...prev, data: { ...prev.data, [key]: value } } : prev);
  };

  const handleSave = async () => {
    if (!editor) return;
    if (!editor.data.vacuna.trim()) { toast('El nombre de la vacuna es obligatorio', 'error'); return; }
    setSaving(true);

    if (editor.mode === 'create') {
      const { error } = await createVaccination(editor.data);
      if (error) toast(`Error al guardar: ${error}`, 'error');
      else { toast('Vacuna registrada', 'success'); setEditor(null); refetch(); }
    } else if (editor.id) {
      const { error } = await updateVaccination(editor.id, editor.data);
      if (error) toast(`Error al guardar: ${error}`, 'error');
      else { toast('Vacuna actualizada', 'success'); setEditor(null); refetch(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await deleteVaccination(toDelete.id);
    if (error) toast(`Error al eliminar: ${error}`, 'error');
    else { toast('Vacuna eliminada', 'success'); setToDelete(null); refetch(); }
  };

  return (
    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
        <h3 className="text-sm font-black text-surface-700">💉 Vacunas</h3>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors"
        >
          + Registrar
        </button>
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-surface-100 animate-pulse" />)}</div>
        ) : vaccinations.length === 0 ? (
          <EmptyState icon="💉" title="Sin vacunas" subtitle="Registra la primera vacuna del paciente."
            action={<Button size="sm" onClick={openCreate}>Registrar vacuna</Button>} />
        ) : (
          vaccinations.map(v => (
            <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-brand-400 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-surface-800">{v.vacuna}</p>
                  {statusBadge(v)}
                </div>
                <p className="text-xs text-surface-500 mt-0.5">
                  Aplicada: {v.fecha_aplicacion ? formatearFecha(v.fecha_aplicacion) : '—'}
                  {v.fecha_proxima_dosis && <> · Próxima: {formatearFecha(v.fecha_proxima_dosis)}</>}
                </p>
                {(v.marca || v.lote) && (
                  <p className="text-xs text-surface-400 mt-0.5">{v.marca}{v.marca && v.lote ? ' · ' : ''}{v.lote}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(v)} className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-600 text-xs" aria-label="Editar">✏️</button>
                <button onClick={() => setToDelete(v)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs" aria-label="Eliminar">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setEditor(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white border border-surface-200 shadow-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-surface-800">{editor.mode === 'create' ? 'Registrar vacuna' : 'Editar vacuna'}</h3>

            <Field label="Vacuna" required>
              <Input value={editor.data.vacuna} onChange={e => setField('vacuna', e.target.value)} placeholder="Ej: Nobivac DHPPi" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de aplicación">
                <Input type="date" value={editor.data.fecha_aplicacion ?? ''} onChange={e => setField('fecha_aplicacion', e.target.value)} />
              </Field>
              <Field label="Próxima dosis">
                <Input type="date" value={editor.data.fecha_proxima_dosis ?? ''} onChange={e => setField('fecha_proxima_dosis', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Marca">
                <Input value={editor.data.marca ?? ''} onChange={e => setField('marca', e.target.value)} placeholder="Ej: Vanguard" />
              </Field>
              <Field label="Lote">
                <Input value={editor.data.lote ?? ''} onChange={e => setField('lote', e.target.value)} placeholder="Lote" />
              </Field>
              <Field label="Dosis">
                <Input value={editor.data.dosis ?? ''} onChange={e => setField('dosis', e.target.value)} placeholder="Ej: 1ra / Refuerzo" />
              </Field>
            </div>
            <Field label="Observaciones">
              <Textarea rows={2} value={editor.data.observaciones ?? ''} onChange={e => setField('observaciones', e.target.value)} placeholder="Notas opcionales" />
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
        title="Eliminar vacuna"
        message={`¿Eliminar "${toDelete?.vacuna ?? ''}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function statusBadge(v: Vaccination) {
  if (!v.fecha_proxima_dosis) return null;
  const due = new Date(v.fecha_proxima_dosis);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold">Vencida</span>;
  }
  if (diffDays <= 21) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-bold">Próxima en {diffDays} día{diffDays !== 1 ? 's' : ''}</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-bold">Al día</span>;
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-VE');
}
