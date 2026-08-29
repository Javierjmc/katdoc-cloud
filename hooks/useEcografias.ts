// hooks/useEcografias.ts
// ============================================================
// CRUD de ecografías por paciente
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Ecografia } from '@/types';

export type EcografiaInput = Omit<Ecografia, 'id' | 'created_at'>;

// ─── Hook: ecografías de un paciente ────────────────────────
export function useEcografias(patientId: string | undefined) {
  const [ecografias, setEcografias] = useState<Ecografia[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const fetchEcografias = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);

    const { data, error: err } = await supabase
      .from('ecografias')
      .select('*')
      .eq('patient_id', patientId)
      .order('fecha', { ascending: false });

    if (err) setError(err.message);
    else     setEcografias((data ?? []) as Ecografia[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchEcografias(); }, [fetchEcografias]);

  return { ecografias, loading, error, refetch: fetchEcografias };
}

// ─── Funciones CRUD ─────────────────────────────────────────
export async function createEcografia(input: EcografiaInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('ecografias')
    .insert(input)
    .select('id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

export async function updateEcografia(
  id: string,
  data: Partial<EcografiaInput>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ecografias')
    .update(data)
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deleteEcografia(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('ecografias')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
