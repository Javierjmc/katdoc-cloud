// hooks/usePatients.ts
// ============================================================
// Custom hook: Carga, crea y actualiza pacientes en Supabase
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Patient, Tutor } from '@/types';

// ─── Tipos del hook ─────────────────────────────────────────
export type PatientWithTutor = Patient & { tutor: Tutor };

export type CreatePatientInput = {
  tutor: Omit<Tutor, 'id' | 'created_at'>;
  patient: Omit<Patient, 'id' | 'tutor_id' | 'created_at' | 'tutor'>;
};

interface UsePatientOptions {
  patientId?: string;
}

// ─── Hook: lista de pacientes ────────────────────────────────
export function usePatients(options?: { active?: boolean }) {
  const [patients, setPatients] = useState<PatientWithTutor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('patients')
      .select('*, tutor:tutors(*)')
      .order('created_at', { ascending: false });

    if (options?.active !== undefined) {
      query = query.eq('active', options.active);
    }

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
    } else {
      setPatients((data ?? []) as PatientWithTutor[]);
    }
    setLoading(false);
  }, [options?.active]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  return { patients, loading, error, refetch: fetchPatients };
}

// ─── Hook: paciente individual ───────────────────────────────
export function usePatient(patientId: string | undefined) {
  const [patient, setPatient] = useState<PatientWithTutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchPatient = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('patients')
      .select('*, tutor:tutors(*)')
      .eq('id', patientId)
      .single();

    if (err) setError(err.message);
    else     setPatient(data as PatientWithTutor);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchPatient(); }, [fetchPatient]);

  return { patient, loading, error, refetch: fetchPatient };
}

// ─── Función: buscar tutor por cédula (normalizada) ─────────
export async function findTutorByCedula(cedula?: string): Promise<Tutor | null> {
  if (!cedula) return null;
  const normalized = cedula.trim().toUpperCase();
  const { data } = await supabase
    .from('tutors')
    .select('*')
    .eq('cedula', normalized)
    .maybeSingle();
  return (data as Tutor) ?? null;
}

// ─── Función: crear tutor + paciente (transacción lógica) ───
export async function createPatientWithTutor(
  input: CreatePatientInput,
  opts?: { tutorId?: string }
): Promise<{ patientId: string | null; error: string | null }> {
  let tutorId: string | null = opts?.tutorId ?? null;

  // 1. Si venimos desde la página de tutores (tutorId explícito), usarlo
  //    directamente sin re-buscar por cédula (evita duplicados y falsos negativos).
  if (!tutorId) {
    // 2. Buscar si ya existe un tutor con esa cédula — comparación normalizada
    //    (trim + uppercase) para no fallar por formato de mayúsculas/espacios.
    const cedula = (input.tutor.cedula ?? '').trim().toUpperCase();

    if (cedula) {
      const { data: existingTutor } = await supabase
        .from('tutors')
        .select('id')
        .eq('cedula', cedula)
        .maybeSingle();

      if (existingTutor) tutorId = existingTutor.id;
    }

    // 3. Si no existe, crear el tutor (con cédula normalizada)
    if (!tutorId) {
      const { data: newTutor, error: tutorError } = await supabase
        .from('tutors')
        .insert({ ...input.tutor, cedula })
        .select('id')
        .single();

      if (tutorError) return { patientId: null, error: tutorError.message };
      tutorId = newTutor.id;
    }
  }

  // 4. Crear el paciente
  const { data: newPatient, error: patientError } = await supabase
    .from('patients')
    .insert({ ...input.patient, tutor_id: tutorId })
    .select('id')
    .single();

  if (patientError) return { patientId: null, error: patientError.message };

  return { patientId: newPatient.id, error: null };
}

// ─── Función: actualizar paciente ───────────────────────────
export async function updatePatient(
  patientId: string,
  data: Partial<Omit<Patient, 'id' | 'created_at'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('patients')
    .update(data)
    .eq('id', patientId);

  return { error: error?.message ?? null };
}
