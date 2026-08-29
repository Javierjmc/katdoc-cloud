// hooks/usePrescriptions.ts
// ============================================================
// CRUD de recetas (prescripciones) por paciente
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Prescription } from '@/types';

export type PrescriptionInput = Omit<Prescription, 'id' | 'created_at'>;

// ─── Hook: recetas de un paciente ───────────────────────────
export function usePrescriptions(patientId: string | undefined) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);

    const { data, error: err } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('fecha', { ascending: false });

    if (err) setError(err.message);
    else     setPrescriptions((data ?? []) as Prescription[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  return { prescriptions, loading, error, refetch: fetchPrescriptions };
}

// ─── Funciones CRUD ─────────────────────────────────────────
export async function createPrescription(input: PrescriptionInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('prescriptions')
    .insert(input)
    .select('id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

export async function updatePrescription(
  id: string,
  data: Partial<PrescriptionInput>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('prescriptions')
    .update(data)
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deletePrescription(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('prescriptions')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
