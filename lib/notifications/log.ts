// lib/notifications/log.ts
// ============================================================
// Registro de envíos en notification_log (S16).
// ============================================================

import { supabase } from '@/lib/supabase';

export async function logNotification(input: {
  reminderId?: string;
  canal: 'whatsapp' | 'email';
  destino: string;
  estado: 'enviado' | 'error' | 'simulado' | 'sin_respuesta';
  detalle?: string;
}): Promise<void> {
  await supabase.from('notification_log').insert({
    reminder_id: input.reminderId ?? null,
    canal: input.canal,
    destino: input.destino,
    estado: input.estado,
    detalle: input.detalle ?? null,
  });
}
