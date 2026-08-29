'use client';
// components/PrescriptionsSection.tsx
// Recetas (prescripciones) editables por paciente, con envío por WhatsApp
// (link wa.me prellenado) e impresión.

import { useState } from 'react';
import {
  usePrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
  type PrescriptionInput,
} from '@/hooks/usePrescriptions';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Badge';
import { normalizePhoneForWhatsApp } from '@/lib/utils';
import type { Prescription, PrescriptionMedication } from '@/types';

type EditorState = {
  mode: 'create' | 'edit';
  id?: string;
  titulo: string;
  fecha: string;
  medicamentos: PrescriptionMedication[];
  notas: string;
};

const EMPTY_MED: PrescriptionMedication = { nombre: '', presentacion: '', dosis: '', frecuencia: '', duracion: '', via: '', indicaciones: '' };

function fromPrescription(p: Prescription): EditorState {
  return {
    mode: 'edit',
    id: p.id,
    titulo: p.titulo ?? 'Receta',
    fecha: p.fecha ?? '',
    medicamentos: p.medicamentos ?? [],
    notas: p.notas ?? '',
  };
}

function createEmpty(): EditorState {
  return {
    mode: 'create',
    titulo: 'Receta',
    fecha: new Date().toISOString().split('T')[0],
    medicamentos: [],
    notas: '',
  };
}

export default function PrescriptionsSection({ patientId, patientNombre, tutorTelefono }: {
  patientId: string;
  patientNombre?: string;
  tutorTelefono?: string | null;
}) {
  const { prescriptions, loading, refetch } = usePrescriptions(patientId);
  const { toast } = useToast();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toDelete, setToDelete] = useState<Prescription | null>(null);
  const [printTarget, setPrintTarget] = useState<Prescription | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => setEditor(createEmpty());
  const openEdit = (p: Prescription) => setEditor(fromPrescription(p));

  const setField = (key: keyof Omit<EditorState, 'medicamentos' | 'mode' | 'id'>, value: string) => {
    setEditor(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const setMed = (idx: number, key: keyof PrescriptionMedication, value: string) => {
    setEditor(prev => {
      if (!prev) return prev;
      const medicamentos = prev.medicamentos.map((m, i) => i === idx ? { ...m, [key]: value } : m);
      return { ...prev, medicamentos };
    });
  };

  const addMed = () => {
    setEditor(prev => prev ? { ...prev, medicamentos: [...prev.medicamentos, { ...EMPTY_MED }] } : prev);
  };

  const removeMed = (idx: number) => {
    setEditor(prev => {
      if (!prev) return prev;
      return { ...prev, medicamentos: prev.medicamentos.filter((_, i) => i !== idx) };
    });
  };

  const handleSave = async () => {
    if (!editor) return;
    const medicamentos = editor.medicamentos.filter(m => m.nombre.trim() !== '');
    if (medicamentos.length === 0) { toast('Agrega al menos un medicamento', 'error'); return; }
    setSaving(true);

    const payload: PrescriptionInput = {
      patient_id: patientId,
      titulo: editor.titulo.trim() || 'Receta',
      fecha: editor.fecha || undefined,
      medicamentos,
      notas: editor.notas.trim() || undefined,
    };

    if (editor.mode === 'create') {
      const { error } = await createPrescription(payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
      toast('Receta registrada', 'success');
    } else if (editor.id) {
      const { error } = await updatePrescription(editor.id, payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
      toast('Receta actualizada', 'success');
    }

    setEditor(null);
    setSaving(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await deletePrescription(toDelete.id);
    if (error) toast(`Error al eliminar: ${error}`, 'error');
    else { toast('Receta eliminada', 'success'); setToDelete(null); refetch(); }
  };

  const sendWhatsApp = (p: Prescription) => {
    const phone = normalizePhoneForWhatsApp(tutorTelefono);
    if (!phone) { toast('El tutor no tiene un teléfono válido para WhatsApp', 'error'); return; }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(formatMessage(p, patientNombre))}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
        <h3 className="text-sm font-black text-surface-700">💊 Recetas</h3>
        <button onClick={openCreate} className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors">
          + Nueva receta
        </button>
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-surface-100 animate-pulse" />)}</div>
        ) : prescriptions.length === 0 ? (
          <EmptyState icon="💊" title="Sin recetas" subtitle="Crea una receta con uno o varios medicamentos."
            action={<Button size="sm" onClick={openCreate}>Nueva receta</Button>} />
        ) : (
          prescriptions.map(p => (
            <div key={p.id} className="p-3 rounded-xl border border-surface-200">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-surface-800">{p.titulo ?? 'Receta'}</p>
                  <p className="text-xs text-surface-500">{p.fecha ? new Date(p.fecha).toLocaleDateString('es-VE') : 'Sin fecha'} · {p.medicamentos.length} medicamento{p.medicamentos.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => sendWhatsApp(p)} className="px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold">📲 WhatsApp</button>
                  <button onClick={() => setPrintTarget(p)} className="px-2 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-600 text-xs font-semibold">🖨</button>
                  <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-600 text-xs" aria-label="Editar">✏️</button>
                  <button onClick={() => setToDelete(p)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs" aria-label="Eliminar">🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setEditor(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-surface-200 shadow-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-surface-800">{editor.mode === 'create' ? 'Nueva receta' : 'Editar receta'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Título">
                <Input value={editor.titulo} onChange={e => setField('titulo', e.target.value)} placeholder="Receta" />
              </Field>
              <Field label="Fecha">
                <Input type="date" value={editor.fecha} onChange={e => setField('fecha', e.target.value)} />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-surface-600 uppercase tracking-wide">Medicamentos</p>
                <button onClick={addMed} className="text-xs font-bold text-brand-500 hover:text-brand-600">+ Agregar</button>
              </div>
              {editor.medicamentos.length === 0 ? (
                <p className="text-xs text-surface-400 bg-surface-50 rounded-xl p-3">Sin medicamentos. Toca &quot;+ Agregar&quot; para empezar.</p>
              ) : (
                <div className="space-y-3">
                  {editor.medicamentos.map((m, idx) => (
                    <div key={idx} className="rounded-xl border border-surface-200 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-surface-500">#{idx + 1}</p>
                        <div className="flex-1" />
                        <button onClick={() => removeMed(idx)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 text-xs" aria-label="Quitar">✕</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Medicamento">
                          <Input value={m.nombre} onChange={e => setMed(idx, 'nombre', e.target.value)} placeholder="Ej: Amoxicilina 500mg" />
                        </Field>
                        <Field label="Presentación">
                          <Input value={m.presentacion ?? ''} onChange={e => setMed(idx, 'presentacion', e.target.value)} placeholder="Ej: Comprimidos" />
                        </Field>
                        <Field label="Dosis">
                          <Input value={m.dosis ?? ''} onChange={e => setMed(idx, 'dosis', e.target.value)} placeholder="Ej: 1 comprimido" />
                        </Field>
                        <Field label="Frecuencia">
                          <Input value={m.frecuencia ?? ''} onChange={e => setMed(idx, 'frecuencia', e.target.value)} placeholder="Ej: cada 8 horas" />
                        </Field>
                        <Field label="Duración">
                          <Input value={m.duracion ?? ''} onChange={e => setMed(idx, 'duracion', e.target.value)} placeholder="Ej: 7 días" />
                        </Field>
                        <Field label="Vía">
                          <Input value={m.via ?? ''} onChange={e => setMed(idx, 'via', e.target.value)} placeholder="Ej: Oral" />
                        </Field>
                      </div>
                      <Field label="Indicaciones">
                        <Input value={m.indicaciones ?? ''} onChange={e => setMed(idx, 'indicaciones', e.target.value)} placeholder="Ej: Con alimentos" />
                      </Field>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Field label="Notas">
              <Textarea rows={2} value={editor.notas} onChange={e => setField('notas', e.target.value)} placeholder="Instrucciones adicionales" />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setEditor(null)} disabled={saving}>Cancelar</Button>
              <Button fullWidth loading={saving} onClick={handleSave}>Guardar receta</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar receta"
        message={`¿Eliminar "${toDelete?.titulo ?? 'esta receta'}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      {/* Impresión */}
      {printTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPrintTarget(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="print-area text-sm text-surface-800">
              <div className="text-center border-b border-surface-200 pb-3 mb-3">
                <p className="font-black text-lg">🐾 KATDOC</p>
                <p className="text-xs text-surface-500">Receta {patientNombre ? `— ${patientNombre}` : ''}</p>
                <p className="text-xs text-surface-500">{printTarget.fecha ? new Date(printTarget.fecha).toLocaleDateString('es-VE') : ''}</p>
              </div>
              {printTarget.medicamentos.map((m, i) => (
                <div key={i} className="mb-3">
                  <p className="font-bold">{i + 1}. {m.nombre}</p>
                  {m.presentacion && <p className="text-xs text-surface-600">Presentación: {m.presentacion}</p>}
                  {m.dosis && <p className="text-xs text-surface-600">Dosis: {m.dosis}</p>}
                  {m.frecuencia && <p className="text-xs text-surface-600">Frecuencia: {m.frecuencia}</p>}
                  {m.duracion && <p className="text-xs text-surface-600">Duración: {m.duracion}</p>}
                  {m.via && <p className="text-xs text-surface-600">Vía: {m.via}</p>}
                  {m.indicaciones && <p className="text-xs text-surface-600">Indicaciones: {m.indicaciones}</p>}
                </div>
              ))}
              {printTarget.notas && <p className="text-xs text-surface-600 whitespace-pre-wrap mt-2">Notas: {printTarget.notas}</p>}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" fullWidth onClick={() => setPrintTarget(null)}>Cerrar</Button>
              <Button fullWidth onClick={() => window.print()}>🖨 Imprimir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatMessage(p: Prescription, patientNombre?: string): string {
  const lines: string[] = [
    '📋 RECETA',
    `🐾 ${patientNombre ?? 'Paciente'}`,
    `📅 ${p.fecha ? new Date(p.fecha).toLocaleDateString('es-VE') : ''}`,
    '',
  ];
  p.medicamentos.forEach((m, i) => {
    lines.push(`${i + 1}) ${m.nombre}`);
    if (m.presentacion) lines.push(`   Presentación: ${m.presentacion}`);
    if (m.dosis) lines.push(`   Dosis: ${m.dosis}`);
    if (m.frecuencia) lines.push(`   Frecuencia: ${m.frecuencia}`);
    if (m.duracion) lines.push(`   Duración: ${m.duracion}`);
    if (m.via) lines.push(`   Vía: ${m.via}`);
    if (m.indicaciones) lines.push(`   Indicaciones: ${m.indicaciones}`);
    lines.push('');
  });
  if (p.notas) lines.push(`Notas: ${p.notas}`);
  return lines.join('\n');
}
