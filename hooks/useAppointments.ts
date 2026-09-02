// hooks/useAppointments.ts
// ============================================================
// Citas: listado por paciente o por rango de fechas + CRUD
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentState } from '@/types';

// ─── Tipo de entrada para crear/editar ─────────────────────
export type AppointmentInput = {
  patient_id?: string | null;
  tutor_id?: string | null;
  nombre_paciente?: string;
  tutor_nombre?: string;
  telefono_tutor?: string;
  fecha: string;
  hora?: string;
  motivo?: string;
  estado?: AppointmentState;
  notas?: string;
};

type UseAppointmentsOptions = {
  patientId?: string;          // filtrar por paciente
  from?: string;               // YYYY-MM-DD inclusive
  to?: string;                 // YYYY-MM-DD inclusive
};

// ─── Hook: listar citas ─────────────────────────────────────
export function useAppointments(opts: UseAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('appointments')
      .select('*, patient:patients(id, nombre, especie, raza), tutor:tutors(id, nombre, telefono, email)')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (opts.patientId)       query = query.eq('patient_id', opts.patientId);
    if (opts.from)            query = query.gte('fecha', opts.from);
    if (opts.to)              query = query.lte('fecha', opts.to);

    const { data, error: err } = await query;

    if (err) setError(err.message);
    else     setAppointments((data ?? []) as Appointment[]);
    setLoading(false);
  }, [opts.patientId, opts.from, opts.to]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
}

// ─── Crear ──────────────────────────────────────────────────
export async function createAppointment(
  input: AppointmentInput
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...input, estado: input.estado ?? 'programada' })
    .select('id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

// ─── Actualizar ─────────────────────────────────────────────
export async function updateAppointment(
  id: string,
  patch: Partial<AppointmentInput>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', id);

  return { error: error?.message ?? null };
}

// ─── Eliminar ───────────────────────────────────────────────
export async function deleteAppointment(
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
