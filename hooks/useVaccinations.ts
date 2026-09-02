// hooks/useVaccinations.ts
// ============================================================
// CRUD de vacunas estructuradas por paciente
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Vaccination } from '@/types';

export type VaccinationInput = Omit<Vaccination, 'id' | 'created_at'>;

// ─── Hook: vacunas (o desparasitaciones) de un paciente ─────
export function useVaccinations(patientId: string | undefined, categoria?: 'vacuna' | 'desparasitacion') {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchVaccinations = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);

    let query = supabase
      .from('vaccinations')
      .select('*')
      .eq('patient_id', patientId);

    if (categoria) {
      // Los registros legacy sin categoria se tratan como 'vacuna'.
      if (categoria === 'vacuna') {
        query = query.or(`categoria.eq.vacuna,categoria.is.null`);
      } else {
        query = query.eq('categoria', categoria);
      }
    }

    const { data, error: err } = await query
      .order('fecha_aplicacion', { ascending: false });

    if (err) setError(err.message);
    else     setVaccinations((data ?? []) as Vaccination[]);
    setLoading(false);
  }, [patientId, categoria]);

  useEffect(() => { fetchVaccinations(); }, [fetchVaccinations]);

  return { vaccinations, loading, error, refetch: fetchVaccinations };
}

// ─── Funciones CRUD ─────────────────────────────────────────
export async function createVaccination(input: VaccinationInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('vaccinations')
    .insert(input)
    .select('id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

export async function updateVaccination(
  id: string,
  data: Partial<VaccinationInput>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vaccinations')
    .update(data)
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deleteVaccination(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('vaccinations')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
