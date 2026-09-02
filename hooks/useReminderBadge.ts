// hooks/useReminderBadge.ts
// ============================================================
// S39 — Badge de "Avisos" en vivo.
// Cuenta los reminders pendientes y se actualiza al instante cuando
// la tabla cambia (Supabase Realtime) o cuando la pestaña recibe foco.
// ============================================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/auth';

export function useReminderBadge() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!isAuthenticated()) { setCount(0); return; }
    const { count: c, error } = await supabase
      .from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    if (!error) setCount(c ?? 0);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel('reminders-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => refresh())
      .subscribe();

    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return count;
}
