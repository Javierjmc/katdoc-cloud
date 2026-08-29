'use client';
// components/EcografiasSection.tsx
// Ecografías editables por paciente: imágenes, hallazgos, conclusiones y mediciones.

import { useState } from 'react';
import Image from 'next/image';
import {
  useEcografias,
  createEcografia,
  updateEcografia,
  deleteEcografia,
  type EcografiaInput,
} from '@/hooks/useEcografias';
import { uploadEcografiaImage } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Badge';
import { ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE } from '@/lib/constants';
import type { Ecografia, EcografiaMedicion } from '@/types';

type EditorState = {
  mode: 'create' | 'edit';
  id?: string;
  fecha: string;
  organo: string;
  hallazgos: string;
  conclusiones: string;
  mediciones: EcografiaMedicion[];
  imagenes: string[];
  pendingImages: File[];
};

const EMPTY_MEDICION: EcografiaMedicion = { nombre: '', valor: '', unidad: '' };

function fromEcografia(e: Ecografia): EditorState {
  return {
    mode: 'edit',
    id: e.id,
    fecha: e.fecha ?? '',
    organo: e.organo ?? '',
    hallazgos: e.hallazgos ?? '',
    conclusiones: e.conclusiones ?? '',
    mediciones: e.mediciones ?? [],
    imagenes: e.imagenes ?? [],
    pendingImages: [],
  };
}

function createEmpty(): EditorState {
  return {
    mode: 'create',
    fecha: new Date().toISOString().split('T')[0],
    organo: 'Abdomen',
    hallazgos: '',
    conclusiones: '',
    mediciones: [],
    imagenes: [],
    pendingImages: [],
  };
}

export default function EcografiasSection({ patientId }: { patientId: string }) {
  const { ecografias, loading, refetch } = useEcografias(patientId);
  const { toast } = useToast();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Ecografia | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => setEditor(createEmpty());
  const openEdit = (e: Ecografia) => setEditor(fromEcografia(e));

  const setField = (key: keyof Omit<EditorState, 'mediciones' | 'imagenes' | 'pendingImages' | 'mode' | 'id'>, value: string) => {
    setEditor(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const setMedicion = (idx: number, key: keyof EcografiaMedicion, value: string) => {
    setEditor(prev => {
      if (!prev) return prev;
      const mediciones = prev.mediciones.map((m, i) => i === idx ? { ...m, [key]: value } : m);
      return { ...prev, mediciones };
    });
  };

  const addMedicion = () => {
    setEditor(prev => prev ? { ...prev, mediciones: [...prev.mediciones, { ...EMPTY_MEDICION }] } : prev);
  };

  const removeMedicion = (idx: number) => {
    setEditor(prev => {
      if (!prev) return prev;
      return { ...prev, mediciones: prev.mediciones.filter((_, i) => i !== idx) };
    });
  };

  const handleImages = (files: FileList | null) => {
    if (!files || !editor) return;
    const accepted: File[] = [];
    for (const f of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) { toast('Solo imágenes (JPG/PNG/WebP)', 'error'); continue; }
      if (f.size > MAX_PHOTO_SIZE) { toast('Imagen supera los 5 MB', 'error'); continue; }
      accepted.push(f);
    }
    if (accepted.length > 0) {
      setEditor(prev => prev ? { ...prev, pendingImages: [...prev.pendingImages, ...accepted] } : prev);
    }
  };

  const removePendingImage = (idx: number) => {
    setEditor(prev => {
      if (!prev) return prev;
      return { ...prev, pendingImages: prev.pendingImages.filter((_, i) => i !== idx) };
    });
  };

  const removeSavedImage = (idx: number) => {
    setEditor(prev => {
      if (!prev) return prev;
      return { ...prev, imagenes: prev.imagenes.filter((_, i) => i !== idx) };
    });
  };

  const handleSave = async () => {
    if (!editor) return;
    setSaving(true);

    const mediciones = editor.mediciones.filter(m => m.nombre.trim() !== '');

    const payload: EcografiaInput = {
      patient_id: patientId,
      fecha: editor.fecha || undefined,
      organo: editor.organo.trim() || undefined,
      hallazgos: editor.hallazgos.trim() || undefined,
      conclusiones: editor.conclusiones.trim() || undefined,
      mediciones,
      imagenes: editor.imagenes,
    };

    let ecografiaId: string | null = editor.id ?? null;

    if (editor.mode === 'create') {
      const { id, error } = await createEcografia(payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
      ecografiaId = id;
      toast('Ecografía registrada', 'success');
    } else if (editor.id) {
      const { error } = await updateEcografia(editor.id, payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
      toast('Ecografía actualizada', 'success');
    }

    // Subir imágenes nuevas
    if (ecografiaId && editor.pendingImages.length > 0) {
      const imagenes = [...editor.imagenes];
      for (let i = 0; i < editor.pendingImages.length; i++) {
        const url = await uploadEcografiaImage(editor.pendingImages[i], ecografiaId, imagenes.length + i);
        if (url) imagenes.push(url);
      }
      await updateEcografia(ecografiaId, { imagenes });
    }

    setEditor(null);
    setSaving(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await deleteEcografia(toDelete.id);
    if (error) toast(`Error al eliminar: ${error}`, 'error');
    else { toast('Ecografía eliminada', 'success'); setToDelete(null); refetch(); }
  };

  return (
    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
        <h3 className="text-sm font-black text-surface-700">🫀 Ecografías</h3>
        <button onClick={openCreate} className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors">
          + Nueva ecografía
        </button>
      </div>

      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-surface-100 animate-pulse" />)}</div>
        ) : ecografias.length === 0 ? (
          <EmptyState icon="🫀" title="Sin ecografías" subtitle="Registra estudios ecográficos con imágenes y reporte."
            action={<Button size="sm" onClick={openCreate}>Nueva ecografía</Button>} />
        ) : (
          ecografias.map(eco => (
            <div key={eco.id} className="rounded-xl border border-surface-200 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === eco.id ? null : eco.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-surface-800">
                    Ecografía {eco.organo ? `· ${eco.organo}` : ''}
                  </p>
                  <p className="text-xs text-surface-500">
                    {eco.fecha ? new Date(eco.fecha).toLocaleDateString('es-VE') : 'Sin fecha'}
                    {eco.imagenes.length > 0 && ` · ${eco.imagenes.length} imagen${eco.imagenes.length !== 1 ? 'es' : ''}`}
                  </p>
                </div>
                <span className={`text-surface-300 transition-transform ${expanded === eco.id ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {expanded === eco.id && (
                <div className="border-t border-surface-100 px-3 pb-3 pt-2 space-y-2">
                  {eco.imagenes.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {eco.imagenes.map((img, i) => (
                        <a key={i} href={img} target="_blank" rel="noreferrer" className="relative aspect-square rounded-lg overflow-hidden bg-surface-100">
                          <Image src={img} alt={`Ecografía ${i + 1}`} fill className="object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {eco.hallazgos && <p className="text-xs text-surface-600 whitespace-pre-wrap"><span className="font-semibold">Hallazgos:</span> {eco.hallazgos}</p>}
                  {eco.conclusiones && <p className="text-xs text-surface-600 whitespace-pre-wrap"><span className="font-semibold">Conclusiones:</span> {eco.conclusiones}</p>}
                  {eco.mediciones.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {eco.mediciones.map((m, i) => (
                        <span key={i} className="text-[11px] px-2 py-1 rounded-lg bg-surface-100 text-surface-600">
                          {m.nombre}: {m.valor}{m.unidad ? ` ${m.unidad}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-1 pt-1">
                    <button onClick={() => openEdit(eco)} className="px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-200 text-surface-600 text-xs font-semibold">✏️ Editar</button>
                    <button onClick={() => setToDelete(eco)} className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Editor */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setEditor(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-surface-200 shadow-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-surface-800">{editor.mode === 'create' ? 'Nueva ecografía' : 'Editar ecografía'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha">
                <Input type="date" value={editor.fecha} onChange={e => setField('fecha', e.target.value)} />
              </Field>
              <Field label="Órgano / Tipo">
                <Input value={editor.organo} onChange={e => setField('organo', e.target.value)} placeholder="Ej: Abdomen, Cardíaca" />
              </Field>
            </div>

            <Field label="Hallazgos">
              <Textarea rows={3} value={editor.hallazgos} onChange={e => setField('hallazgos', e.target.value)} placeholder="Descripción de los hallazgos..." />
            </Field>
            <Field label="Conclusiones">
              <Textarea rows={2} value={editor.conclusiones} onChange={e => setField('conclusiones', e.target.value)} placeholder="Conclusión / diagnóstico" />
            </Field>

            {/* Mediciones */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-surface-600 uppercase tracking-wide">Mediciones</p>
                <button onClick={addMedicion} className="text-xs font-bold text-brand-500 hover:text-brand-600">+ Agregar</button>
              </div>
              {editor.mediciones.length === 0 ? (
                <p className="text-xs text-surface-400 bg-surface-50 rounded-xl p-3">Sin mediciones.</p>
              ) : (
                <div className="space-y-1.5">
                  {editor.mediciones.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_70px_28px] gap-1.5 items-center">
                      <Input value={m.nombre} onChange={e => setMedicion(idx, 'nombre', e.target.value)} placeholder="Medición" />
                      <Input value={m.valor} onChange={e => setMedicion(idx, 'valor', e.target.value)} placeholder="Valor" />
                      <Input value={m.unidad ?? ''} onChange={e => setMedicion(idx, 'unidad', e.target.value)} placeholder="Unid." />
                      <button onClick={() => removeMedicion(idx)} className="h-full w-7 rounded-lg bg-red-50 text-red-500 text-xs" aria-label="Quitar">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Imágenes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-surface-600 uppercase tracking-wide">Imágenes</p>
                <label className="text-xs font-bold text-brand-500 hover:text-brand-600 cursor-pointer">
                  + Subir imágenes
                  <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleImages(e.target.files)} />
                </label>
              </div>
              {(editor.imagenes.length > 0 || editor.pendingImages.length > 0) && (
                <div className="grid grid-cols-3 gap-2">
                  {editor.imagenes.map((img, i) => (
                    <div key={`s-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-surface-100">
                      <Image src={img} alt={`Imagen ${i + 1}`} fill className="object-cover" />
                      <button onClick={() => removeSavedImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px]" aria-label="Quitar">✕</button>
                    </div>
                  ))}
                  {editor.pendingImages.map((f, i) => (
                    <div key={`p-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-surface-100">
                      <Image src={URL.createObjectURL(f)} alt={`Nueva ${i + 1}`} fill className="object-cover" />
                      <button onClick={() => removePendingImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px]" aria-label="Quitar">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setEditor(null)} disabled={saving}>Cancelar</Button>
              <Button fullWidth loading={saving} onClick={handleSave}>Guardar ecografía</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar ecografía"
        message="¿Eliminar esta ecografía? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
