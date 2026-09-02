'use client';
// components/PatientForm.tsx — v3
// - Autocompletar tutores existentes (S22): datalist por nombre/cédula.
// - Teléfono con prefijo +58 por defecto para WhatsApp (S22).
// - Duplicidad de tutores (S23): aviso + opción de vincular o corregir cédula.

import { useState, useEffect, useRef } from 'react';
import { supabase, uploadPetPhoto } from '@/lib/supabase';
import { createPatientWithTutor, updatePatient, findTutorByCedula } from '@/hooks/usePatients';
import { ESPECIES } from '@/types';
import { patientFormSchema, validateSchema, type FieldErrors } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { ErrorMessage, SuccessMessage } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE } from '@/lib/constants';
import type { Patient, Tutor } from '@/types';
import Image from 'next/image';

interface PatientFormProps {
  existingPatient?: Patient & { tutor: Tutor };
  /** Si viene desde página de tutores, pre-rellena y bloquea datos del tutor */
  prefillTutor?: Partial<Tutor>;
  onSuccess?: (patientId: string) => void;
}

function tutorLabel(t: { nombre: string; cedula: string }): string {
  return `${t.nombre} · ${t.cedula}`;
}

export default function PatientForm({ existingPatient, prefillTutor, onSuccess }: PatientFormProps) {
  const isEditing = !!existingPatient;
  const { toast } = useToast();

  // Teléfono: por defecto con prefijo +58 en creación (para WhatsApp).
  const telefonoInicial =
    existingPatient?.tutor?.telefono ?? prefillTutor?.telefono ?? '';
  const [tutor, setTutor] = useState({
    nombre:    existingPatient?.tutor?.nombre    ?? prefillTutor?.nombre    ?? '',
    cedula:    existingPatient?.tutor?.cedula    ?? prefillTutor?.cedula    ?? '',
    telefono:  telefonoInicial || (isEditing ? '' : '+58 '),
    email:     existingPatient?.tutor?.email     ?? prefillTutor?.email     ?? '',
    direccion: existingPatient?.tutor?.direccion ?? prefillTutor?.direccion ?? '',
  });

  const [patient, setPatient] = useState({
    nombre:           existingPatient?.nombre           ?? '',
    especie:          existingPatient?.especie           ?? '',
    raza:             existingPatient?.raza              ?? '',
    fecha_nacimiento: existingPatient?.fecha_nacimiento  ?? '',
    color:            existingPatient?.color             ?? '',
    sexo:             existingPatient?.sexo              ?? '',
    photo_url:        existingPatient?.photo_url         ?? '',
  });

  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingPatient?.photo_url ?? null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // S22: sugerencias de tutores existentes.
  const [tutors, setTutors] = useState<Tutor[]>([]);
  // S23: cuando la cédula ya pertenece a otro tutor.
  const [duplicateTutor, setDuplicateTutor] = useState<Tutor | null>(null);
  // Tutor elegido del autocompletar / duplicado vinculado.
  const [linkedTutorId, setLinkedTutorId] = useState<string | null>(
    prefillTutor?.id ?? null
  );
  const cedulaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('tutors')
      .select('id, nombre, cedula, telefono, email, direccion')
      .order('nombre')
      .limit(100)
      .then(({ data }) => { if (data) setTutors(data as Tutor[]); });
  }, []);

  const setT = (key: keyof typeof tutor, val: string) => {
    setTutor(prev => ({ ...prev, [key]: val }));
    setFieldErrors({});
    // Si cambia cédula/nombre a mano, el vínculo/duplicado anterior se invalida.
    if (key === 'cedula' || key === 'nombre') {
      setLinkedTutorId(prev => (prev && key === 'nombre' ? prev : null));
      setDuplicateTutor(null);
    }
    setError('');
  };
  const setP = (key: keyof typeof patient, val: string) => { setPatient(prev => ({ ...prev, [key]: val })); setFieldErrors({}); };

  /** Vincula los datos de un tutor existente (autocompletar o "Usar este tutor"). */
  const applyTutorLink = (t: Tutor) => {
    setTutor({
      nombre:    t.nombre ?? '',
      cedula:    t.cedula ?? '',
      telefono:  t.telefono ?? '+58 ',
      email:     t.email ?? '',
      direccion: t.direccion ?? '',
    });
    setLinkedTutorId(t.id);
    setDuplicateTutor(null);
    setFieldErrors({});
    setError('');
  };

  /** Si el usuario escribe el label de una sugerencia del datalist, la vincula. */
  const handleTutorNombreChange = (val: string) => {
    setT('nombre', val);
    const match = tutors.find(t => tutorLabel(t) === val.trim());
    if (match) applyTutorLink(match);
  };

  // ── Foto: validación + preview inmediato + subida inmediata si es edición ──
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast('Solo imágenes (JPG/PNG/WebP)', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast('La foto supera los 5 MB', 'error');
      e.target.value = '';
      return;
    }

    // Preview inmediato
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setPhotoFile(file);
    setPhotoUploaded(false);

    // Si estamos editando, subir inmediatamente
    if (isEditing && existingPatient?.id) {
      setPhotoUploading(true);
      const url = await uploadPetPhoto(file, existingPatient.id);
      setPhotoUploading(false);
      if (url) {
        await updatePatient(existingPatient.id, { photo_url: url });
        setPhotoPreview(url);
        setP('photo_url', url);
        setPhotoUploaded(true);
        toast('Foto actualizada correctamente', 'success');
      } else {
        toast('No se pudo subir la foto. Intentá de nuevo.', 'error');
      }
    }
  };

  const validate = (): boolean => {
    const errors = validateSchema(patientFormSchema, { tutor, patient });
    if (errors) {
      setFieldErrors(errors);
      const first = Object.values(errors)[0];
      if (first) setError(first);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleSave = async () => {
    setError(''); setSuccess('');
    if (!validate()) return;
    setSaving(true);

    try {
      let patientId = existingPatient?.id ?? '';

      if (isEditing) {
        // Actualizar datos del paciente
        let photoUrl = patient.photo_url;
        if (photoFile && !photoUploaded && patientId) {
          photoUrl = (await uploadPetPhoto(photoFile, patientId)) ?? photoUrl;
        }
        const { error: updErr } = await updatePatient(patientId, { ...patient, photo_url: photoUrl });
        if (updErr) throw new Error(updErr);

        // Actualizar también datos del tutor
        if (existingPatient?.tutor?.id) {
          await supabase.from('tutors').update(tutor).eq('id', existingPatient.tutor.id);
        }
      } else {
        // Crear: detección de duplicados de tutor por cédula (S23).
        if (!prefillTutor?.id && !linkedTutorId) {
          const dup = await findTutorByCedula(tutor.cedula);
          if (dup) {
            setDuplicateTutor(dup);
            setError(`Ya existe un tutor con la cédula ${tutor.cedula}. Revisá el aviso.`);
            setSaving(false);
            return;
          }
        }

        const { patientId: newId, error: createErr } = await createPatientWithTutor(
          { tutor, patient },
          { tutorId: linkedTutorId ?? prefillTutor?.id }
        );
        if (createErr || !newId) throw new Error(createErr ?? 'Error desconocido');
        patientId = newId;

        // Subir foto si hay una
        if (photoFile) {
          const url = await uploadPetPhoto(photoFile, patientId);
          if (url) {
            await updatePatient(patientId, { photo_url: url });
            toast('Foto subida correctamente', 'success');
          } else {
            toast('Paciente guardado, pero la foto no se pudo subir.', 'error');
          }
        }
      }

      setSuccess(isEditing ? 'Datos actualizados correctamente.' : 'Paciente registrado correctamente.');
      setTimeout(() => onSuccess?.(patientId), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const tutorLocked = !!prefillTutor && !isEditing && !!prefillTutor.id;
  const linkedToExisting = isEditing ? false : !!linkedTutorId && !prefillTutor?.id;

  return (
    <div className="space-y-4 pb-28 px-4 pt-4">

      {/* ── Foto de perfil ── */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-surface-100 dark:bg-surface-800 border-2 border-dashed border-surface-300">
          {photoPreview
            ? <Image src={photoPreview} alt="Vista previa" fill className="object-cover" />
            : <div className="flex items-center justify-center h-full text-4xl">🐾</div>
          }
          {photoUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {photoUploaded && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          )}
        </div>

        {/* S27: dos opciones — cámara en vivo o galería */}
        <div className="flex items-center gap-3">
          <label htmlFor="photo-camera" className="cursor-pointer text-sm font-bold text-brand-500 hover:text-brand-600">
            📷 Tomar foto
          </label>
          <span className="text-surface-300">·</span>
          <label htmlFor="photo-gallery" className="cursor-pointer text-sm font-bold text-brand-500 hover:text-brand-600">
            🖼️ Galería
          </label>
        </div>
        <input id="photo-camera" type="file" accept="image/*" capture="environment"
          onChange={handlePhotoChange} className="hidden" />
        <input id="photo-gallery" type="file" accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoChange} className="hidden" />

        {photoFile && !isEditing && (
          <p className="text-xs text-surface-400 dark:text-surface-500">📸 {photoFile.name} — se subirá al guardar</p>
        )}
      </div>

      {error   && <ErrorMessage   message={error}   />}
      {success && <SuccessMessage message={success} />}

      {/* ── Datos del Tutor ── */}
      <SectionHeader title="👤 Datos del Propietario" />

      {(tutorLocked || linkedToExisting) && (
        <div className="text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-xl px-3 py-2">
          ℹ️ Se registrará la mascota bajo el propietario <strong>{tutor.nombre}</strong> ({tutor.cedula}).
          {linkedToExisting && (
            <button type="button" onClick={() => { setLinkedTutorId(null); setDuplicateTutor(null); cedulaRef.current?.focus(); }}
              className="ml-1 font-bold text-brand-600 hover:underline">
              (¿Otro propietario?)
            </button>
          )}
        </div>
      )}

      {/* Aviso de duplicado (S23) */}
      {duplicateTutor && !isEditing && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-amber-800">⚠️ Ese propietario ya existe</p>
          <div className="text-xs text-amber-700 space-y-1">
            <p><strong>{duplicateTutor.nombre}</strong> · {duplicateTutor.cedula}</p>
            {duplicateTutor.telefono && <p>📞 {duplicateTutor.telefono}</p>}
            {duplicateTutor.email && <p>📧 {duplicateTutor.email}</p>}
          </div>
          <p className="text-xs text-amber-600">
            Podés agregar la mascota a su ficha o corregir la cédula si no es el mismo.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => applyTutorLink(duplicateTutor)}>Usar este propietario</Button>
            <Button size="sm" variant="secondary" onClick={() => { setDuplicateTutor(null); setError(''); cedulaRef.current?.focus(); }}>
              Usar otra cédula
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <Field label="Nombre completo" required error={fieldErrors['tutor.nombre']}>
          <Input value={tutor.nombre} onChange={e => handleTutorNombreChange(e.target.value)}
            placeholder="Ej: María González" list="tutores-sugeridos" disabled={tutorLocked} />
          <datalist id="tutores-sugeridos">
            {tutors.map(t => (
              <option key={t.id} value={tutorLabel(t)} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cédula / DNI" required error={fieldErrors['tutor.cedula']}>
            <Input ref={cedulaRef} value={tutor.cedula} onChange={e => setT('cedula', e.target.value)}
              placeholder="V-12345678" inputMode="numeric"
              disabled={tutorLocked || linkedToExisting} />
          </Field>
          <Field label="Teléfono" error={fieldErrors['tutor.telefono']} hint="Prefijo +58 por defecto (WhatsApp)">
            <Input value={tutor.telefono} onChange={e => setT('telefono', e.target.value)}
              placeholder="+58 412-0000000" type="tel" inputMode="tel" maxLength={20} />
          </Field>
        </div>
        <Field label="Email" error={fieldErrors['tutor.email']}>
          <Input value={tutor.email} onChange={e => setT('email', e.target.value)} placeholder="correo@ejemplo.com" type="email" />
        </Field>
        <Field label="Dirección" error={fieldErrors['tutor.direccion']}>
          <Input value={tutor.direccion} onChange={e => setT('direccion', e.target.value)} placeholder="Urb. Las Palmas, Calle 5..." />
        </Field>
      </div>

      {/* ── Datos del Paciente ── */}
      <SectionHeader title="🐾 Datos del Paciente" />
      <div className="grid grid-cols-1 gap-3">
        <Field label="Nombre de la mascota" required error={fieldErrors['patient.nombre']}>
          <Input value={patient.nombre} onChange={e => setP('nombre', e.target.value)} placeholder="Ej: Milo, Luna, Rocky..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Especie" required error={fieldErrors['patient.especie']}>
            <Select value={patient.especie} onChange={e => setP('especie', e.target.value)}
              options={[{ value: '', label: 'Seleccionar...' }, ...ESPECIES.map(e => ({ value: e, label: e }))]} />
          </Field>
          <Field label="Raza" error={fieldErrors['patient.raza']}>
            <Input value={patient.raza} onChange={e => setP('raza', e.target.value)} placeholder="Ej: Labrador..." />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sexo" error={fieldErrors['patient.sexo']}>
            <Select value={patient.sexo} onChange={e => setP('sexo', e.target.value)}
              options={[{ value: '', label: 'Seleccionar...' }, { value: 'Macho', label: 'Macho' }, { value: 'Hembra', label: 'Hembra' }]} />
          </Field>
          <Field label="Color / Pelaje" error={fieldErrors['patient.color']}>
            <Input value={patient.color} onChange={e => setP('color', e.target.value)} placeholder="Ej: Marrón" />
          </Field>
        </div>
        <Field label="Fecha de nacimiento" error={fieldErrors['patient.fecha_nacimiento']}>
          <Input type="date" value={patient.fecha_nacimiento} onChange={e => setP('fecha_nacimiento', e.target.value)} />
        </Field>
      </div>

      {/* ── Footer fijo ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 px-4 py-3 md:left-16 lg:left-64">
        <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
          {isEditing ? '💾 Guardar Cambios' : '➕ Registrar Paciente'}
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-black text-surface-700 dark:text-surface-200 pt-2 pb-1 border-b border-surface-200 dark:border-surface-700">{title}</h2>
  );
}
