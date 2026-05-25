// hooks/useMedicalRecords.ts
// ============================================================
// Custom hook: Historias clínicas de un paciente
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { MedicalRecord } from '@/types';

// ─── Hook: historial de un paciente ─────────────────────────
export function useMedicalRecords(patientId: string | undefined) {
  const [records, setRecords]  = useState<MedicalRecord[]>([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);

    const { data, error: err } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('fecha_consulta', { ascending: false });

    if (err) setError(err.message);
    else     setRecords((data ?? []) as MedicalRecord[]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return { records, loading, error, refetch: fetchRecords };
}

// ─── Hook: historia individual ───────────────────────────────
export function useMedicalRecord(recordId: string | undefined) {
  const [record, setRecord]   = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!recordId) { setLoading(false); return; }

    async function fetch() {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('medical_records')
        .select('*, patient:patients(*, tutor:tutors(*))')
        .eq('id', recordId)
        .single();

      if (err) setError(err.message);
      else     setRecord(data as MedicalRecord);
      setLoading(false);
    }
    fetch();
  }, [recordId]);

  return { record, loading, error };
}

// ─── Función: generar número de historia correlativo ─────────
export async function getNextNumeroHistoria(): Promise<string> {
  const { data, error } = await supabase
    .rpc('generate_numero_historia');

  if (error || !data) {
    // Fallback local si la función SQL falla
    const year  = new Date().getFullYear();
    const rand  = Math.floor(Math.random() * 9000) + 1000;
    return `HC-${year}-${rand}`;
  }
  return data as string;
}

// ─── Función: eliminar historia ──────────────────────────────
export async function deleteMedicalRecord(
  recordId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('medical_records')
    .delete()
    .eq('id', recordId);

  return { error: error?.message ?? null };
}
