// hooks/useLaboratoryExams.ts
// ============================================================
// CRUD de exámenes de laboratorio estructurados por paciente
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { LaboratoryExam } from '@/types';

export type LaboratoryExamInput = Omit<LaboratoryExam, 'id' | 'created_at'>;

// ─── Hook: exámenes de un paciente ──────────────────────────
export function useLaboratoryExams(patientId: string | undefined) {
  const [exams, setExams]       = useState<LaboratoryExam[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);

    const { data, error: err } = await supabase
      .from('laboratory_exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('fecha_examen', { ascending: false });

    if (err) setError(err.message);
    else     setExams((data ?? []) as LaboratoryExam[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  return { exams, loading, error, refetch: fetchExams };
}

// ─── Funciones CRUD ─────────────────────────────────────────
export async function createLaboratoryExam(input: LaboratoryExamInput): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('laboratory_exams')
    .insert(input)
    .select('id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

export async function updateLaboratoryExam(
  id: string,
  data: Partial<LaboratoryExamInput>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('laboratory_exams')
    .update(data)
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function deleteLaboratoryExam(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('laboratory_exams')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
