'use client';
// components/LabExamsSection.tsx
// Exámenes de laboratorio estructurados por paciente, con carga de archivo
// (PDF/foto), tabla de analitos editable y extracción por IA (S9).

import { useState } from 'react';
import {
  useLaboratoryExams,
  createLaboratoryExam,
  updateLaboratoryExam,
  deleteLaboratoryExam,
  type LaboratoryExamInput,
} from '@/hooks/useLaboratoryExams';
import { uploadLabExamFile } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Badge';
import { ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES, MAX_DOCUMENT_SIZE } from '@/lib/constants';
import { appPinHeader } from '@/lib/api-auth';
import type { LabAnalyte, LaboratoryExam } from '@/types';

type EditorState = {
  mode: 'create' | 'edit';
  id?: string;
  nombre_examen: string;
  laboratorio_origen: string;
  fecha_examen: string;
  fecha_proximo_control: string;
  notas: string;
  analitos: LabAnalyte[];
  file: File | null;
  hasFile: boolean;
};

const EMPTY_ANALITO: LabAnalyte = { nombre: '', valor: '', unidad: '', rango: '', flag: 'N' };

function fromExam(e: LaboratoryExam): EditorState {
  return {
    mode: 'edit',
    id: e.id,
    nombre_examen: e.nombre_examen,
    laboratorio_origen: e.laboratorio_origen ?? '',
    fecha_examen: e.fecha_examen ?? '',
    fecha_proximo_control: e.fecha_proximo_control ?? '',
    notas: e.notas ?? '',
    analitos: e.analitos ?? [],
    file: null,
    hasFile: !!e.file_url,
  };
}

function createEmpty(): EditorState {
  return {
    mode: 'create',
    nombre_examen: '',
    laboratorio_origen: '',
    fecha_examen: '',
    fecha_proximo_control: '',
    notas: '',
    analitos: [],
    file: null,
    hasFile: false,
  };
}

export default function LabExamsSection({ patientId }: { patientId: string }) {
  const { exams, loading, refetch } = useLaboratoryExams(patientId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<LaboratoryExam | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const openCreate = () => setEditor(createEmpty());
  const openEdit = (e: LaboratoryExam) => setEditor(fromExam(e));

  const handleAIExtract = async () => {
    if (!editor?.file) { toast('Sube un archivo primero', 'error'); return; }
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append('file', editor.file);

      const res = await fetch('/api/exams/parse', { method: 'POST', headers: appPinHeader(), body: formData });
      const json = (await res.json()) as
        | { nombre_examen: string; laboratorio_origen: string | null; fecha_examen: string | null; analitos: LabAnalyte[] }
        | { error: string };

      if (!res.ok || 'error' in json) {
        toast('error' in json ? json.error : 'Error al extraer', 'error');
        return;
      }

      setEditor(prev => prev ? {
        ...prev,
        nombre_examen: prev.nombre_examen || json.nombre_examen,
        laboratorio_origen: prev.laboratorio_origen || (json.laboratorio_origen ?? ''),
        fecha_examen: prev.fecha_examen || (json.fecha_examen ?? ''),
        analitos: json.analitos.length > 0 ? json.analitos : prev.analitos,
      } : prev);

      toast(json.analitos.length > 0
        ? `Se extrajeron ${json.analitos.length} analitos. Revísalos antes de guardar.`
        : 'No se encontraron analitos. Completa la tabla a mano.',
        json.analitos.length > 0 ? 'success' : 'info');
    } catch {
      toast('Error de conexión al extraer. Completa la tabla a mano.', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const setField = (key: keyof Omit<EditorState, 'analitos' | 'file' | 'mode' | 'id'>, value: string) => {
    setEditor(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const setAnalyte = (idx: number, key: keyof LabAnalyte, value: string) => {
    setEditor(prev => {
      if (!prev) return prev;
      const analitos = prev.analitos.map((a, i) => i === idx ? { ...a, [key]: value } : a);
      return { ...prev, analitos };
    });
  };

  const addAnalyte = () => {
    setEditor(prev => prev ? { ...prev, analitos: [...prev.analitos, { ...EMPTY_ANALITO }] } : prev);
  };

  const removeAnalyte = (idx: number) => {
    setEditor(prev => {
      if (!prev) return prev;
      return { ...prev, analitos: prev.analitos.filter((_, i) => i !== idx) };
    });
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    const okType = ALLOWED_IMAGE_TYPES.includes(f.type) || ALLOWED_DOC_TYPES.includes(f.type);
    if (!okType) { toast('Solo PDF o imágenes (JPG/PNG/WebP)', 'error'); return; }
    if (f.size > MAX_DOCUMENT_SIZE) { toast('El archivo supera los 10 MB', 'error'); return; }
    setEditor(prev => prev ? { ...prev, file: f } : prev);
  };

  const handleSave = async () => {
    if (!editor) return;
    if (!editor.nombre_examen.trim()) { toast('El nombre del examen es obligatorio', 'error'); return; }
    if (!editor.fecha_examen) { toast('La fecha del examen es obligatoria', 'error'); return; }
    setSaving(true);

    const analitos = editor.analitos.filter(a => a.nombre.trim() !== '');

    const payload: LaboratoryExamInput = {
      patient_id: patientId,
      nombre_examen: editor.nombre_examen.trim(),
      laboratorio_origen: editor.laboratorio_origen.trim() || undefined,
      fecha_examen: editor.fecha_examen || undefined,
      fecha_proximo_control: editor.fecha_proximo_control || undefined,
      notas: editor.notas.trim() || undefined,
      analitos,
    };

    let examId: string | null = editor.id ?? null;

    if (editor.mode === 'create') {
      const { id, error } = await createLaboratoryExam(payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
      examId = id;
      toast('Examen registrado', 'success');
    } else if (editor.id) {
      const { error } = await updateLaboratoryExam(editor.id, payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
      toast('Examen actualizado', 'success');
    }

    // Subir archivo si hay uno
    if (editor.file && examId) {
      setUploading(true);
      const url = await uploadLabExamFile(editor.file, examId);
      if (url) {
        await updateLaboratoryExam(examId, {
          file_url: url,
          file_type: editor.file.type,
        });
        toast('Documento cargado correctamente', 'success');
      } else {
        toast('El examen se guardó, pero el archivo no se pudo cargar.', 'error');
      }
      setUploading(false);
    }

    setEditor(null);
    setSaving(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await deleteLaboratoryExam(toDelete.id);
    if (error) toast(`Error al eliminar: ${error}`, 'error');
    else { toast('Examen eliminado', 'success'); setToDelete(null); refetch(); }
  };

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 dark:border-surface-800">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-left group" aria-expanded={open}>
          <h3 className="text-sm font-black text-surface-700 dark:text-surface-200 group-hover:text-brand-600">🔬 Exámenes de laboratorio</h3>
          <span className={`text-xs text-surface-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors"
        >
          + Cargar examen
        </button>
      </div>

      {open && (
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)}</div>
        ) : exams.length === 0 ? (
          <EmptyState icon="🔬" title="Sin exámenes" subtitle="Carga exámenes de laboratorio (PDF o foto) de otros laboratorios."
            action={<Button size="sm" onClick={openCreate}>Cargar examen</Button>} />
        ) : (
          exams.map(exam => (
            <div key={exam.id} className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === exam.id ? null : exam.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-surface-800 dark:text-white">{exam.nombre_examen}</p>
                    {flagSummary(exam.analitos)}
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    {exam.laboratorio_origen && `${exam.laboratorio_origen} · `}
                    {exam.fecha_examen ? new Date(exam.fecha_examen).toLocaleDateString('es-VE') : 'Sin fecha'}
                  </p>
                </div>
                <span className={`text-surface-300 transition-transform ${expanded === exam.id ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {expanded === exam.id && (
                <div className="border-t border-surface-100 dark:border-surface-800 px-3 pb-3 pt-2 space-y-2">
                  {exam.analitos.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-surface-400 dark:text-surface-500 text-left">
                          <th className="py-1 pr-2 font-semibold">Analito</th>
                          <th className="py-1 pr-2 font-semibold">Valor</th>
                          <th className="py-1 pr-2 font-semibold">Unidad</th>
                          <th className="py-1 pr-2 font-semibold">Referencia</th>
                          <th className="py-1 font-semibold">Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exam.analitos.map((a, i) => (
                          <tr key={i} className="border-t border-surface-100 dark:border-surface-800">
                            <td className="py-1.5 pr-2 font-semibold text-surface-700 dark:text-surface-200">{a.nombre}</td>
                            <td className="py-1.5 pr-2 text-surface-700 dark:text-surface-200">{a.valor}</td>
                            <td className="py-1.5 pr-2 text-surface-500 dark:text-surface-400">{a.unidad ?? ''}</td>
                            <td className="py-1.5 pr-2 text-surface-500 dark:text-surface-400">{a.rango ?? ''}</td>
                            <td className="py-1.5">
                              {a.flag === 'ALTO' && <FlagBadge type="alto" />}
                              {a.flag === 'BAJO' && <FlagBadge type="bajo" />}
                              {(!a.flag || a.flag === 'N') && <span className="text-surface-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-surface-400 dark:text-surface-500 py-1">Sin analitos cargados.</p>
                  )}

                  {exam.notas && <p className="text-xs text-surface-500 dark:text-surface-400 whitespace-pre-wrap">{exam.notas}</p>}

                  <div className="flex items-center gap-2 pt-1">
                    {exam.file_url && (
                      <a href={exam.file_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline">
                        📄 Ver archivo
                      </a>
                    )}
                    <div className="flex-1" />
                    <button onClick={() => openEdit(exam)} className="px-2.5 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-semibold">✏️ Editar</button>
                    <button onClick={() => setToDelete(exam)} className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      )}

      {/* Editor / wizard */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setEditor(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-surface-800 dark:text-white">{editor.mode === 'create' ? 'Cargar examen de laboratorio' : 'Editar examen'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre del examen" required className="col-span-2 sm:col-span-1">
                <Input value={editor.nombre_examen} onChange={e => setField('nombre_examen', e.target.value)} placeholder="Ej: Hemograma, Química sanguínea" />
              </Field>
              <Field label="Laboratorio de origen" className="col-span-2 sm:col-span-1">
                <Input value={editor.laboratorio_origen} onChange={e => setField('laboratorio_origen', e.target.value)} placeholder="Laboratorio externo" />
              </Field>
              <Field label="Fecha del examen" required>
                <Input type="date" value={editor.fecha_examen} onChange={e => setField('fecha_examen', e.target.value)} />
              </Field>
              <Field label="Próximo control">
                <Input type="date" value={editor.fecha_proximo_control} onChange={e => setField('fecha_proximo_control', e.target.value)} />
              </Field>
            </div>

            {/* Archivo */}
            <Field label="Archivo (PDF o foto)">
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-surface-300 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 transition-colors">
                <span className="text-xs text-surface-500 dark:text-surface-400">
                  {editor.file
                    ? `📄 ${editor.file.name}`
                    : editor.hasFile
                      ? '📎 Archivo actual — toca para reemplazar'
                      : '📤 Toca para subir PDF o foto del resultado'}
                </span>
                <input type="file" className="hidden" accept=".pdf,image/*"
                  onChange={e => handleFile(e.target.files?.[0] ?? null)} />
              </label>
            </Field>

            {/* Analitos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-surface-600 dark:text-surface-300 uppercase tracking-wide">Analitos</p>
                <button onClick={addAnalyte} className="text-xs font-bold text-brand-500 hover:text-brand-600">+ Agregar fila</button>
              </div>
              {editor.analitos.length === 0 ? (
                <p className="text-xs text-surface-400 dark:text-surface-500 bg-surface-50 dark:bg-surface-900 rounded-xl p-3">Sin analitos todavía. Agrégalos a mano o usa &quot;Extraer con IA&quot; sobre el archivo.</p>
              ) : (
                <div className="space-y-1.5">
                  {editor.analitos.map((a, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_64px_70px_80px_70px_28px] gap-1.5 items-center">
                      <Input value={a.nombre} onChange={e => setAnalyte(idx, 'nombre', e.target.value)} placeholder="Analito" />
                      <Input value={a.valor} onChange={e => setAnalyte(idx, 'valor', e.target.value)} placeholder="Valor" />
                      <Input value={a.unidad ?? ''} onChange={e => setAnalyte(idx, 'unidad', e.target.value)} placeholder="Unid." />
                      <Input value={a.rango ?? ''} onChange={e => setAnalyte(idx, 'rango', e.target.value)} placeholder="Rango" />
                      <Select value={a.flag ?? 'N'} onChange={e => setAnalyte(idx, 'flag', e.target.value)}
                        options={[
                          { value: 'N', label: 'Normal' },
                          { value: 'ALTO', label: 'ALTO' },
                          { value: 'BAJO', label: 'BAJO' },
                        ]} />
                      <button onClick={() => removeAnalyte(idx)} className="h-full w-7 rounded-lg bg-red-50 text-red-500 text-xs" aria-label="Quitar fila">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Extraer con IA */}
              <button
                onClick={handleAIExtract}
                disabled={!editor.file || extracting}
                className={`mt-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  !editor.file
                    ? 'bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 cursor-not-allowed'
                    : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                }`}
              >
                {extracting ? '⏳ Extrayendo con IA...' : '✨ Extraer con IA'}
              </button>
              {!editor.file && (
                <p className="text-[11px] text-surface-400 dark:text-surface-500 mt-1">Sube un PDF o foto primero para usar la extracción automática.</p>
              )}
            </div>

            <Field label="Notas">
              <Textarea rows={2} value={editor.notas} onChange={e => setField('notas', e.target.value)} placeholder="Observaciones del resultado" />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setEditor(null)} disabled={saving}>Cancelar</Button>
              <Button fullWidth loading={saving || uploading} onClick={handleSave}>Guardar examen</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar examen"
        message={`¿Eliminar "${toDelete?.nombre_examen ?? ''}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function flagSummary(analitos: LabAnalyte[]) {
  const altos = analitos.filter(a => a.flag === 'ALTO').length;
  const bajos = analitos.filter(a => a.flag === 'BAJO').length;
  if (altos === 0 && bajos === 0) return null;
  return (
    <span className="flex gap-1">
      {altos > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold">{altos} ALTO</span>}
      {bajos > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-bold">{bajos} BAJO</span>}
    </span>
  );
}

function FlagBadge({ type }: { type: 'alto' | 'bajo' }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
      type === 'alto'
        ? 'bg-red-50 text-red-600 border border-red-200'
        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
    }`}>
      {type === 'alto' ? 'ALTO' : 'BAJO'}
    </span>
  );
}
