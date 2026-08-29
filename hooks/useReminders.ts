// hooks/useReminders.ts
// ============================================================
// Recordatorios pendientes para el centro de notificaciones
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Reminder } from '@/types';

// ─── Hook: recordatorios por estado ─────────────────────────
export function useReminders(estado: Reminder['estado'] = 'pendiente') {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('reminders')
      .select('*, patient:patients(id, nombre, active), tutor:tutors(id, nombre, telefono, email)')
      .eq('estado', estado)
      .order('fecha_evento', { ascending: true });

    if (err) setError(err.message);
    else     setReminders((data ?? []) as Reminder[]);
    setLoading(false);
  }, [estado]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  return { reminders, loading, error, refetch: fetchReminders };
}

// ─── Actualizar estado de un recordatorio ───────────────────
export async function updateReminderEstado(
  id: string,
  estado: Reminder['estado'],
  canal?: string
): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = { estado };

  if (estado === 'enviado') {
    patch.canal = canal ?? null;
    patch.fecha_envio = new Date().toISOString();
    patch.fecha_seguimiento = null;
  } else if (estado === 'seguimiento') {
    patch.fecha_seguimiento = new Date().toISOString();
    patch.canal = canal ?? null;
  } else {
    patch.canal = canal ?? null;
    patch.fecha_envio = null;
  }

  const { error } = await supabase
    .from('reminders')
    .update(patch)
    .eq('id', id);

  return { error: error?.message ?? null };
}

/** Ejecuta el scan on-demand desde el cliente y devuelve el resultado. */
export async function runScanNow(): Promise<{ creados: number; existentes: number; error?: string }> {
  try {
    const res = await fetch('/api/reminders/scan', { method: 'POST' });
    const json = await res.json();
    if (!res.ok) return { creados: 0, existentes: 0, error: json.error ?? 'Error al escanear' };
    return { creados: json.creados ?? 0, existentes: json.existentes ?? 0 };
  } catch {
    return { creados: 0, existentes: 0, error: 'Error de conexión' };
  }
}
