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
export function usePatients() {
  const [patients, setPatients] = useState<PatientWithTutor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('patients')
      .select('*, tutor:tutors(*)')
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setPatients((data ?? []) as PatientWithTutor[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  return { patients, loading, error, refetch: fetchPatients };
}

// ─── Hook: paciente individual ───────────────────────────────
export function usePatient(patientId: string | undefined) {
  const [patient, setPatient] = useState<PatientWithTutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }

    async function fetchPatient() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('patients')
        .select('*, tutor:tutors(*)')
        .eq('id', patientId)
        .single();

      if (err) setError(err.message);
      else     setPatient(data as PatientWithTutor);
      setLoading(false);
    }

    fetchPatient();
  }, [patientId]);

  return { patient, loading, error };
}

// ─── Función: crear tutor + paciente (transacción lógica) ───
export async function createPatientWithTutor(
  input: CreatePatientInput
): Promise<{ patientId: string | null; error: string | null }> {
  // 1. Buscar si ya existe un tutor con esa cédula
  let tutorId: string | null = null;

  if (input.tutor.cedula) {
    const { data: existingTutor } = await supabase
      .from('tutors')
      .select('id')
      .eq('cedula', input.tutor.cedula)
      .maybeSingle();

    if (existingTutor) tutorId = existingTutor.id;
  }

  // 2. Si no existe, crear el tutor
  if (!tutorId) {
    const { data: newTutor, error: tutorError } = await supabase
      .from('tutors')
      .insert(input.tutor)
      .select('id')
      .single();

    if (tutorError) return { patientId: null, error: tutorError.message };
    tutorId = newTutor.id;
  }

  // 3. Crear el paciente
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
