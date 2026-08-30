// hooks/useNotificationLog.ts
// ============================================================
// Historial de intentos de contacto de un reminder (notification_log).
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type NotificationLogEntry = {
  id: string;
  reminder_id?: string | null;
  canal: string;
  destino: string;
  estado: string;
  detalle?: string | null;
  created_at: string;
};

export function useNotificationLog(reminderId: string) {
  const [logs, setLogs] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!reminderId) { setLogs([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('notification_log')
      .select('*')
      .eq('reminder_id', reminderId)
      .order('created_at', { ascending: false });
    if (!error) setLogs((data ?? []) as NotificationLogEntry[]);
    setLoading(false);
  }, [reminderId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}
