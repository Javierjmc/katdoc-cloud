'use client';
// components/PrescriptionsSection.tsx
// Recipes (prescripciones) editables por paciente, con:
// - PDF real descargable (pdf-lib, S34)
// - Envío por email (Resend) con el PDF adjunto (S34)
// - WhatsApp manual (wa.me) con texto prellenado + peso (S34)
// - Impresión sin "PDF en blanco" (regla @media print en globals.css)

import { useState } from 'react';
import {
  usePrescriptions,
  createPrescription,
  updatePrescription,
  deletePrescription,
  type PrescriptionInput,
} from '@/hooks/usePrescriptions';
import { useMedicalRecords } from '@/hooks/useMedicalRecords';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Badge';
import { normalizePhoneForWhatsApp } from '@/lib/utils';
import { appPinHeader } from '@/lib/api-auth';
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
    titulo: p.titulo ?? 'Recipe',
    fecha: p.fecha ?? '',
    medicamentos: p.medicamentos ?? [],
    notas: p.notas ?? '',
  };
}

function createEmpty(): EditorState {
  return {
    mode: 'create',
    titulo: 'Recipe',
    fecha: new Date().toISOString().split('T')[0],
    medicamentos: [],
    notas: '',
  };
}

export default function PrescriptionsSection({ patientId, patientNombre, tutorTelefono, tutorEmail }: {
  patientId: string;
  patientNombre?: string;
  tutorTelefono?: string | null;
  tutorEmail?: string | null;
}) {
  const { prescriptions, loading, refetch } = usePrescriptions(patientId);
  // S34: peso de la última consulta (S29) para mostrar en la Recipe.
  const { records } = useMedicalRecords(patientId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toDelete, setToDelete] = useState<Prescription | null>(null);
  const [printTarget, setPrintTarget] = useState<Prescription | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const lastRecord = records && records.length > 0 ? records[0] : null;
  const pesoActual = lastRecord?.peso != null ? lastRecord.peso : null;

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
      titulo: editor.titulo.trim() || 'Recipe',
      fecha: editor.fecha || undefined,
      medicamentos,
      notas: editor.notas.trim() || undefined,
    };

    if (editor.mode === 'create') {
      const { error } = await createPrescription(payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
      toast('Recipe registrada', 'success');
    } else if (editor.id) {
      const { error } = await updatePrescription(editor.id, payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
      toast('Recipe actualizada', 'success');
    }

    setEditor(null);
    setSaving(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await deletePrescription(toDelete.id);
    if (error) toast(`Error al eliminar: ${error}`, 'error');
    else { toast('Recipe eliminada', 'success'); setToDelete(null); refetch(); }
  };

  const downloadPDF = async (p: Prescription) => {
    try {
      const { buildRecipePdf } = await import('@/lib/recipePdf');
      const blob = await buildRecipePdf(p, { paciente: patientNombre, peso: pesoActual });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nombre = `${(patientNombre ?? 'paciente').replace(/\s+/g, '-')}-recipe-${p.fecha ?? 'sin-fecha'}.pdf`;
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('PDF descargado', 'success');
    } catch {
      toast('No se pudo generar el PDF', 'error');
    }
  };

  const sendEmail = async (p: Prescription) => {
    const email = tutorEmail;
    if (!email) { toast('El propietario no tiene email registrado', 'error'); return; }
    setBusyId(p.id);
    try {
      const { buildRecipePdf, blobToBase64 } = await import('@/lib/recipePdf');
      const blob = await buildRecipePdf(p, { paciente: patientNombre, peso: pesoActual });
      const dataBase64 = await blobToBase64(blob);
      const bodyText = formatMessage(p, patientNombre, pesoActual);
      const res = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...appPinHeader() },
        body: JSON.stringify({
          to: email,
          subject: `📋 Recipe — ${patientNombre ?? 'Paciente'}`,
          body: bodyText,
          attachment: { filename: `recipe-${p.fecha ?? 'sin-fecha'}.pdf`, dataBase64 },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; simulated?: boolean; error?: string };
      if (json.simulated) {
        window.location.href = `mailto:${email}?subject=${encodeURIComponent('Recipe KATDOC')}&body=${encodeURIComponent(bodyText)}`;
        toast('Abriendo el correo (Resend no configurado). Adjuntá el PDF.', 'info');
      } else if (json.ok) {
        toast('Recipe enviada por email con el PDF adjunto', 'success');
      } else {
        toast(json.error ?? 'Error al enviar el email', 'error');
      }
    } catch {
      toast('No se pudo generar el PDF para enviar', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const sendWhatsApp = (p: Prescription) => {
    const phone = normalizePhoneForWhatsApp(tutorTelefono);
    if (!phone) { toast('El tutor no tiene un teléfono válido para WhatsApp', 'error'); return; }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(formatMessage(p, patientNombre, pesoActual))}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 dark:border-surface-800">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-left group" aria-expanded={open}>
          <h3 className="text-sm font-black text-surface-700 dark:text-surface-200 group-hover:text-brand-600">💊 Recipes</h3>
          <span className={`text-xs text-surface-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
        <button onClick={openCreate} className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors">
          + Nueva recipe
        </button>
      </div>

      {open && (
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)}</div>
        ) : prescriptions.length === 0 ? (
          <EmptyState icon="💊" title="Sin recipes" subtitle="Crea una recipe con uno o varios medicamentos."
            action={<Button size="sm" onClick={openCreate}>Nueva recipe</Button>} />
        ) : (
          prescriptions.map(p => (
            <div key={p.id} className="p-3 rounded-xl border border-surface-200 dark:border-surface-700">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-surface-800 dark:text-white">{p.titulo ?? 'Recipe'}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">{p.fecha ? new Date(p.fecha).toLocaleDateString('es-VE') : 'Sin fecha'} · {p.medicamentos.length} medicamento{p.medicamentos.length !== 1 ? 's' : ''}</p>
                  {pesoActual != null && (
                    <p className="text-xs text-surface-400 dark:text-surface-500">⚖️ Peso: {pesoActual} kg</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => sendWhatsApp(p)} className="px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold">📲 WhatsApp</button>
                  <button onClick={() => sendEmail(p)} disabled={busyId === p.id} className="px-2 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-semibold disabled:opacity-50">✉️ Email</button>
                  <button onClick={() => downloadPDF(p)} className="px-2 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-semibold">⬇️ PDF</button>
                  <button onClick={() => setPrintTarget(p)} className="px-2 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-semibold" aria-label="Imprimir">🖨</button>
                  <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs" aria-label="Editar">✏️</button>
                  <button onClick={() => setToDelete(p)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs" aria-label="Eliminar">🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {/* Editor */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setEditor(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-surface-800 dark:text-white">{editor.mode === 'create' ? 'Nueva recipe' : 'Editar recipe'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Título">
                <Input value={editor.titulo} onChange={e => setField('titulo', e.target.value)} placeholder="Recipe" />
              </Field>
              <Field label="Fecha">
                <Input type="date" value={editor.fecha} onChange={e => setField('fecha', e.target.value)} />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-surface-600 dark:text-surface-300 uppercase tracking-wide">Medicamentos</p>
                <button onClick={addMed} className="text-xs font-bold text-brand-500 hover:text-brand-600">+ Agregar</button>
              </div>
              {editor.medicamentos.length === 0 ? (
                <p className="text-xs text-surface-400 dark:text-surface-500 bg-surface-50 dark:bg-surface-900 rounded-xl p-3">Sin medicamentos. Toca &quot;+ Agregar&quot; para empezar.</p>
              ) : (
                <div className="space-y-3">
                  {editor.medicamentos.map((m, idx) => (
                    <div key={idx} className="rounded-xl border border-surface-200 dark:border-surface-700 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-surface-500 dark:text-surface-400">#{idx + 1}</p>
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
              <Button fullWidth loading={saving} onClick={handleSave}>Guardar recipe</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar recipe"
        message={`¿Eliminar "${toDelete?.titulo ?? 'esta recipe'}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      {/* Impresión */}
      {printTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPrintTarget(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-surface-800 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="print-area text-sm text-surface-800 dark:text-white">
              <div className="text-center border-b border-surface-200 dark:border-surface-700 pb-3 mb-3">
                <p className="font-black text-lg">🐾 KATDOC</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">Recipe {patientNombre ? `— ${patientNombre}` : ''}</p>
                {pesoActual != null && <p className="text-xs text-surface-500 dark:text-surface-400">⚖️ Peso: {pesoActual} kg</p>}
                <p className="text-xs text-surface-500 dark:text-surface-400">{printTarget.fecha ? new Date(printTarget.fecha).toLocaleDateString('es-VE') : ''}</p>
              </div>
              {printTarget.medicamentos.map((m, i) => (
                <div key={i} className="mb-3">
                  <p className="font-bold">{i + 1}. {m.nombre}</p>
                  {m.presentacion && <p className="text-xs text-surface-600 dark:text-surface-300">Presentación: {m.presentacion}</p>}
                  {m.dosis && <p className="text-xs text-surface-600 dark:text-surface-300">Dosis: {m.dosis}</p>}
                  {m.frecuencia && <p className="text-xs text-surface-600 dark:text-surface-300">Frecuencia: {m.frecuencia}</p>}
                  {m.duracion && <p className="text-xs text-surface-600 dark:text-surface-300">Duración: {m.duracion}</p>}
                  {m.via && <p className="text-xs text-surface-600 dark:text-surface-300">Vía: {m.via}</p>}
                  {m.indicaciones && <p className="text-xs text-surface-600 dark:text-surface-300">Indicaciones: {m.indicaciones}</p>}
                </div>
              ))}
              {printTarget.notas && <p className="text-xs text-surface-600 dark:text-surface-300 whitespace-pre-wrap mt-2">Notas: {printTarget.notas}</p>}
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

function formatMessage(p: Prescription, patientNombre?: string, peso?: number | null): string {
  const lines: string[] = [
    '📋 RECIPE',
    `🐾 ${patientNombre ?? 'Paciente'}`,
    `📅 ${p.fecha ? new Date(p.fecha).toLocaleDateString('es-VE') : ''}`,
  ];
  if (peso != null) lines.push(`⚖️ Peso: ${peso} kg`);
  lines.push('');
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
