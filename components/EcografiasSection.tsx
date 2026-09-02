'use client';
// components/EcografiasSection.tsx
// Ecografías / Rayos X (S35): se registra solo Fecha + Hallazgos, con
// imágenes y PDFs adjuntos. Las imágenes se amplían con un lightbox.
// (Conclusiones/mediciones/órgano quedan como data legacy read-only.)

import { useState } from 'react';
import Image from 'next/image';
import {
  useEcografias,
  createEcografia,
  updateEcografia,
  deleteEcografia,
  type EcografiaInput,
} from '@/hooks/useEcografias';
import { uploadEcografiaImage, uploadEcografiaArchivo } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Badge';
import { ImageLightbox } from '@/components/ui';
import { ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE, MAX_DOCUMENT_SIZE } from '@/lib/constants';
import { hoyLocal } from '@/lib/utils';
import type { Ecografia, EcografiaArchivo, EcografiaMedicion } from '@/types';

type EditorState = {
  mode: 'create' | 'edit';
  id?: string;
  fecha: string;
  hallazgos: string;
  imagenes: string[];
  archivos: EcografiaArchivo[];
  pendingImages: File[];
  pendingPdfs: File[];
  // Legacy (no se editan en la UI desde S35, pero se conservan al guardar)
  organo?: string;
  conclusiones?: string;
  mediciones: EcografiaMedicion[];
};

function fromEcografia(e: Ecografia): EditorState {
  return {
    mode: 'edit',
    id: e.id,
    fecha: e.fecha ?? '',
    hallazgos: e.hallazgos ?? '',
    imagenes: e.imagenes ?? [],
    archivos: e.archivos ?? [],
    pendingImages: [],
    pendingPdfs: [],
    organo: e.organo,
    conclusiones: e.conclusiones,
    mediciones: e.mediciones ?? [],
  };
}

function createEmpty(): EditorState {
  return {
    mode: 'create',
    fecha: hoyLocal(),
    hallazgos: '',
    imagenes: [],
    archivos: [],
    pendingImages: [],
    pendingPdfs: [],
    mediciones: [],
  };
}

export default function EcografiasSection({ patientId }: { patientId: string }) {
  const { ecografias, loading, refetch } = useEcografias(patientId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Ecografia | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const openCreate = () => setEditor(createEmpty());
  const openEdit = (e: Ecografia) => setEditor(fromEcografia(e));

  const setField = (key: keyof Omit<EditorState, 'imagenes' | 'archivos' | 'pendingImages' | 'pendingPdfs' | 'mode' | 'id'>, value: string) => {
    setEditor(prev => prev ? { ...prev, [key]: value } : prev);
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

  const handlePdfs = (files: FileList | null) => {
    if (!files || !editor) return;
    const accepted: File[] = [];
    for (const f of Array.from(files)) {
      if (f.type !== 'application/pdf') { toast('Solo archivos PDF', 'error'); continue; }
      if (f.size > MAX_DOCUMENT_SIZE) { toast('El PDF supera los 10 MB', 'error'); continue; }
      accepted.push(f);
    }
    if (accepted.length > 0) {
      setEditor(prev => prev ? { ...prev, pendingPdfs: [...prev.pendingPdfs, ...accepted] } : prev);
    }
  };

  const removePendingImage = (idx: number) => {
    setEditor(prev => prev ? { ...prev, pendingImages: prev.pendingImages.filter((_, i) => i !== idx) } : prev);
  };

  const removeSavedImage = (idx: number) => {
    setEditor(prev => prev ? { ...prev, imagenes: prev.imagenes.filter((_, i) => i !== idx) } : prev);
  };

  const removePendingPdf = (idx: number) => {
    setEditor(prev => prev ? { ...prev, pendingPdfs: prev.pendingPdfs.filter((_, i) => i !== idx) } : prev);
  };

  const removeArchivo = (idx: number) => {
    setEditor(prev => prev ? { ...prev, archivos: prev.archivos.filter((_, i) => i !== idx) } : prev);
  };

  const handleSave = async () => {
    if (!editor) return;
    if (!editor.fecha) { toast('La fecha es obligatoria', 'error'); return; }
    setSaving(true);

    const payload: EcografiaInput = {
      patient_id: patientId,
      fecha: editor.fecha,
      hallazgos: editor.hallazgos.trim() || undefined,
      imagenes: editor.imagenes,
      archivos: editor.archivos,
      organo: editor.organo,
      conclusiones: editor.conclusiones,
      mediciones: editor.mediciones,
    };

    let ecoId: string | null = editor.id ?? null;

    if (editor.mode === 'create') {
      const { id, error } = await createEcografia(payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
      ecoId = id;
    } else if (editor.id) {
      const { error } = await updateEcografia(editor.id, payload);
      if (error) { toast(`Error al guardar: ${error}`, 'error'); setSaving(false); return; }
    }

    let uploadedImages = 0;
    let uploadedPdfs = 0;
    if (ecoId && (editor.pendingImages.length > 0 || editor.pendingPdfs.length > 0)) {
      const imagenes = [...editor.imagenes];
      const archivos = [...editor.archivos];
      for (let i = 0; i < editor.pendingImages.length; i++) {
        const url = await uploadEcografiaImage(editor.pendingImages[i], ecoId, imagenes.length + i);
        if (url) { imagenes.push(url); uploadedImages++; }
      }
      for (let i = 0; i < editor.pendingPdfs.length; i++) {
        const res = await uploadEcografiaArchivo(editor.pendingPdfs[i], ecoId, `doc-${archivos.length + i}`);
        if (res) { archivos.push(res); uploadedPdfs++; }
      }
      await updateEcografia(ecoId, { imagenes, archivos });
    }

    if (uploadedImages > 0 || uploadedPdfs > 0) {
      toast(`${uploadedImages} imagen${uploadedImages !== 1 ? 'es' : ''}${uploadedImages && uploadedPdfs ? ' y ' : ''}${uploadedPdfs > 0 ? `${uploadedPdfs} PDF` : ''} cargada${uploadedImages + uploadedPdfs !== 1 ? 's' : ''}`, 'success');
    }
    if ((editor.pendingImages.length > 0 && uploadedImages !== editor.pendingImages.length) ||
        (editor.pendingPdfs.length > 0 && uploadedPdfs !== editor.pendingPdfs.length)) {
      toast('Algún adjunto no se pudo cargar. Revisá e intentá de nuevo.', 'error');
    }

    toast(editor.mode === 'create' ? 'Ecografía registrada' : 'Ecografía actualizada', 'success');
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
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 dark:border-surface-800">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-left group" aria-expanded={open}>
          <h3 className="text-sm font-black text-surface-700 dark:text-surface-200 group-hover:text-brand-600">🖼️ Ecografías / Rayos X</h3>
          <span className={`text-xs text-surface-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
        <button onClick={openCreate} className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors">
          + Nueva
        </button>
      </div>

      {open && (
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />)}</div>
        ) : ecografias.length === 0 ? (
          <EmptyState icon="🖼️" title="Sin estudios" subtitle="Registra ecografías o rayos X con imágenes y PDF."
            action={<Button size="sm" onClick={openCreate}>Nueva ecografía / rayos X</Button>} />
        ) : (
          ecografias.map(eco => (
            <div key={eco.id} className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === eco.id ? null : eco.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-surface-800 dark:text-white">
                    Ecografía / Rayos X{eco.organo ? ` · ${eco.organo} (legacy)` : ''}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {eco.fecha ? new Date(eco.fecha).toLocaleDateString('es-VE') : 'Sin fecha'}
                    {eco.imagenes.length > 0 && ` · ${eco.imagenes.length} imagen${eco.imagenes.length !== 1 ? 'es' : ''}`}
                    {(eco.archivos?.length ?? 0) > 0 && ` · ${eco.archivos?.length} PDF`}
                  </p>
                </div>
                <span className={`text-surface-300 transition-transform ${expandedId === eco.id ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {expandedId === eco.id && (
                <div className="border-t border-surface-100 dark:border-surface-800 px-3 pb-3 pt-2 space-y-2">
                  {eco.imagenes.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {eco.imagenes.map((img, i) => (
                        <button key={i} type="button" onClick={() => setLightbox(img)}
                          className="relative aspect-square rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800 cursor-zoom-in">
                          <Image src={img} alt={`Imagen ${i + 1}`} fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  {(eco.archivos ?? []).length > 0 && (
                    <div className="space-y-1">
                      {(eco.archivos ?? []).map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                          📄 {f.nombre ?? `PDF ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  )}
                  {eco.hallazgos && <p className="text-xs text-surface-600 dark:text-surface-300 whitespace-pre-wrap"><span className="font-semibold">Hallazgos:</span> {eco.hallazgos}</p>}
                  {eco.conclusiones && <p className="text-xs text-surface-500 dark:text-surface-400 whitespace-pre-wrap"><span className="font-semibold">Conclusión (legacy):</span> {eco.conclusiones}</p>}
                  <div className="flex justify-end gap-1 pt-1">
                    <button onClick={() => openEdit(eco)} className="px-2.5 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300 text-xs font-semibold">✏️ Editar</button>
                    <button onClick={() => setToDelete(eco)} className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold">🗑️</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      )}

      {/* Editor (S35: solo Fecha + Hallazgos + adjuntos) */}
      {editor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setEditor(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-2xl p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-surface-800 dark:text-white">{editor.mode === 'create' ? 'Nueva ecografía / rayos X' : 'Editar ecografía / rayos X'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha" required>
                <Input type="date" value={editor.fecha} onChange={e => setField('fecha', e.target.value)} />
              </Field>
            </div>

            <Field label="Hallazgos">
              <Textarea rows={4} value={editor.hallazgos} onChange={e => setField('hallazgos', e.target.value)} placeholder="Descripción de los hallazgos..." />
            </Field>

            {/* Imágenes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-surface-600 dark:text-surface-300 uppercase tracking-wide">Imágenes</p>
                <label className="text-xs font-bold text-brand-500 hover:text-brand-600 cursor-pointer">
                  + Subir imágenes
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" multiple onChange={e => handleImages(e.target.files)} />
                </label>
              </div>
              {(editor.imagenes.length > 0 || editor.pendingImages.length > 0) ? (
                <div className="grid grid-cols-3 gap-2">
                  {editor.imagenes.map((img, i) => (
                    <div key={`s-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800">
                      <button type="button" onClick={() => setLightbox(img)} className="block w-full h-full">
                        <Image src={img} alt={`Imagen ${i + 1}`} fill className="object-cover" />
                      </button>
                      <button onClick={() => removeSavedImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px]" aria-label="Quitar">✕</button>
                    </div>
                  ))}
                  {editor.pendingImages.map((f, i) => (
                    <div key={`p-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800">
                      <Image src={URL.createObjectURL(f)} alt={`Nueva ${i + 1}`} fill className="object-cover" />
                      <button onClick={() => removePendingImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px]" aria-label="Quitar">✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-surface-400 dark:text-surface-500 bg-surface-50 dark:bg-surface-900 rounded-xl p-3">Sin imágenes.</p>
              )}
            </div>

            {/* PDFs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-surface-600 dark:text-surface-300 uppercase tracking-wide">Documentos PDF</p>
                <label className="text-xs font-bold text-brand-500 hover:text-brand-600 cursor-pointer">
                  + Subir PDF
                  <input type="file" className="hidden" accept="application/pdf" multiple onChange={e => handlePdfs(e.target.files)} />
                </label>
              </div>
              {(editor.archivos.length > 0 || editor.pendingPdfs.length > 0) ? (
                <div className="space-y-1.5">
                  {editor.archivos.map((f, i) => (
                    <div key={`a-${i}`} className="flex items-center gap-2 text-xs bg-surface-50 dark:bg-surface-900 rounded-lg px-3 py-2">
                      <span className="flex-1 truncate text-surface-600 dark:text-surface-300">📄 {f.nombre ?? `PDF ${i + 1}`}</span>
                      <button onClick={() => removeArchivo(i)} className="text-red-500" aria-label="Quitar PDF">✕</button>
                    </div>
                  ))}
                  {editor.pendingPdfs.map((f, i) => (
                    <div key={`ap-${i}`} className="flex items-center gap-2 text-xs bg-surface-50 dark:bg-surface-900 rounded-lg px-3 py-2">
                      <span className="flex-1 truncate text-surface-600 dark:text-surface-300">📄 {f.name} <span className="text-surface-400">(nuevo)</span></span>
                      <button onClick={() => removePendingPdf(i)} className="text-red-500" aria-label="Quitar PDF">✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-surface-400 dark:text-surface-500 bg-surface-50 dark:bg-surface-900 rounded-xl p-3">Sin PDFs.</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary" fullWidth onClick={() => setEditor(null)} disabled={saving}>Cancelar</Button>
              <Button fullWidth loading={saving} onClick={handleSave}>Guardar</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar estudio"
        message="¿Eliminar esta ecografía / rayos X? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      <ImageLightbox src={lightbox} alt="Imagen del estudio" onClose={() => setLightbox(null)} />
    </div>
  );
}
