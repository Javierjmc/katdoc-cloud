'use client';
// components/PatientForm.tsx — v2
// Correcciones:
// 1. Feedback visual al cargar foto (preview inmediato + estado de subida)
// 2. Pre-rellena tutor_id cuando se viene desde la página de tutores
// 3. Permite editar datos del tutor existente

import { useState } from 'react';
import { supabase, uploadPetPhoto } from '@/lib/supabase';
import { createPatientWithTutor, updatePatient } from '@/hooks/usePatients';
import { ESPECIES } from '@/types';
import { patientFormSchema, validateSchema, type FieldErrors } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import { ErrorMessage, SuccessMessage } from '@/components/ui/Badge';
import type { Patient, Tutor } from '@/types';
import Image from 'next/image';

interface PatientFormProps {
  existingPatient?: Patient & { tutor: Tutor };
  /** Si viene desde página de tutores, pre-rellena y bloquea datos del tutor */
  prefillTutor?: Partial<Tutor>;
  onSuccess?: (patientId: string) => void;
}

export default function PatientForm({ existingPatient, prefillTutor, onSuccess }: PatientFormProps) {
  const isEditing = !!existingPatient;

  const [tutor, setTutor] = useState({
    nombre:    existingPatient?.tutor?.nombre    ?? prefillTutor?.nombre    ?? '',
    cedula:    existingPatient?.tutor?.cedula    ?? prefillTutor?.cedula    ?? '',
    telefono:  existingPatient?.tutor?.telefono  ?? prefillTutor?.telefono  ?? '',
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

  const setT = (key: keyof typeof tutor, val: string) => { setTutor(prev => ({ ...prev, [key]: val })); setFieldErrors({}); };
  const setP = (key: keyof typeof patient, val: string) => { setPatient(prev => ({ ...prev, [key]: val })); setFieldErrors({}); };

  // ── Foto: preview inmediato + subida inmediata si es edición ──
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview inmediato
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
    setPhotoFile(file);
    setPhotoUploaded(false);

    // Si estamos editando, subir inmediatamente
    if (isEditing && existingPatient?.id) {
      setPhotoUploading(true);
      const url = await uploadPetPhoto(file, existingPatient.id);
      if (url) {
        await updatePatient(existingPatient.id, { photo_url: url });
        setPhotoPreview(url);
        setP('photo_url', url);
        setPhotoUploaded(true);
      }
      setPhotoUploading(false);
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
        // Si hay foto nueva y no se subió en el onChange (modo creación)
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
        // Crear tutor + paciente
        const { patientId: newId, error: createErr } = await createPatientWithTutor(
          { tutor, patient },
          { tutorId: prefillTutor?.id }
        );
        if (createErr || !newId) throw new Error(createErr ?? 'Error desconocido');
        patientId = newId;

        // Subir foto si hay una
        if (photoFile) {
          const url = await uploadPetPhoto(photoFile, patientId);
          if (url) await updatePatient(patientId, { photo_url: url });
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

  const tutorLocked = !!prefillTutor && !isEditing;

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

        <label htmlFor="photo-input" className="cursor-pointer text-sm font-bold text-brand-500 hover:text-brand-600">
          {photoUploading ? 'Subiendo...' : photoUploaded ? '✓ Foto actualizada' : photoPreview ? 'Cambiar foto' : 'Agregar foto'}
        </label>
        <input id="photo-input" type="file" accept="image/*" capture="environment"
          onChange={handlePhotoChange} className="hidden" />

        {photoFile && !isEditing && (
          <p className="text-xs text-surface-400 dark:text-surface-500">📸 {photoFile.name} — se subirá al guardar</p>
        )}
      </div>

      {error   && <ErrorMessage   message={error}   />}
      {success && <SuccessMessage message={success} />}

      {/* ── Datos del Tutor ── */}
      <SectionHeader title="👤 Datos del Propietario" />

      {tutorLocked && (
        <div className="text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-xl px-3 py-2">
          ℹ️ Los datos del tutor se pre-rellenaron. Puedes editarlos si es necesario.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <Field label="Nombre completo" required error={fieldErrors['tutor.nombre']}>
          <Input value={tutor.nombre} onChange={e => setT('nombre', e.target.value)} placeholder="Ej: María González" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cédula / DNI" required error={fieldErrors['tutor.cedula']}>
            <Input value={tutor.cedula} onChange={e => setT('cedula', e.target.value)}
              placeholder="V-12345678" inputMode="numeric"
              disabled={tutorLocked} />
          </Field>
          <Field label="Teléfono" error={fieldErrors['tutor.telefono']}>
            <Input value={tutor.telefono} onChange={e => setT('telefono', e.target.value)} placeholder="0412-000-0000" type="tel" />
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
