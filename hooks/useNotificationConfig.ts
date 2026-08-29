// hooks/useNotificationConfig.ts
// ============================================================
// CRUD de la configuración de ventanas de notificación
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { NotificationConfig } from '@/types';

// ─── Hook: lista de configuraciones ─────────────────────────
export function useNotificationConfig() {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('notification_config')
      .select('*')
      .order('label');

    if (err) setError(err.message);
    else     setConfigs((data ?? []) as NotificationConfig[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  return { configs, loading, error, refetch: fetchConfigs };
}

// ─── Funciones ──────────────────────────────────────────────
export async function updateNotificationConfig(
  id: string,
  data: Partial<Pick<NotificationConfig, 'dias_antes' | 'dias_despues' | 'enabled'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('notification_config')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);

  return { error: error?.message ?? null };
}

export async function createNotificationConfig(input: {
  tipo: string; label: string; dias_antes: number; dias_despues: number;
}): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('notification_config')
    .insert(input)
    .select('id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

export async function deleteNotificationConfig(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('notification_config')
    .delete()
    .eq('id', id);

  return { error: error?.message ?? null };
}
