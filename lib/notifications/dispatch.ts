// lib/notifications/dispatch.ts
// ============================================================
// S39 — Envío automático de recordatorios por email (Resend).
// Toma los reminders 'pendiente' cuya ventana ya arrancó y que
// pertenecen a un tipo con notification_config.email_auto = true,
// los envía y los marca como 'enviado' (canal email) + log.
// Server-only. Idempotente (solo toca filas pendientes).
// ============================================================

import { supabase } from '@/lib/supabase';
import { getProvider } from './provider';
import { logNotification } from './log';
import { buildEmailRecordatorio, buildMensajeRecordatorio } from './messages';
import type { NotificationConfig, Reminder } from '@/types';

export type DispatchResult = { enviados: number; errores: number; saltados: number };

function hoyISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function dispatchEmails(): Promise<DispatchResult> {
  let enviados = 0;
  let errores = 0;
  let saltados = 0;

  const { data: configs, error: cfgErr } = await supabase
    .from('notification_config')
    .select('*')
    .eq('enabled', true)
    .eq('email_auto', true);

  if (cfgErr) throw new Error(`Error leyendo configuración: ${cfgErr.message}`);

  const tiposAuto = new Set<string>((configs ?? []).map(c => (c as NotificationConfig).tipo));
  if (tiposAuto.size === 0) return { enviados, errores, saltados };

  const { data, error } = await supabase
    .from('reminders')
    .select('*, patient:patients(id, nombre), tutor:tutors(id, nombre, telefono, email)')
    .eq('estado', 'pendiente')
    .lte('fecha_ventana', hoyISO());

  if (error) throw new Error(`Error leyendo recordatorios: ${error.message}`);

  const provider = getProvider();
  const rows = (data ?? []) as unknown as Reminder[];

  for (const r of rows) {
    if (!tiposAuto.has(r.tipo)) { saltados++; continue; }
    const email = r.tutor?.email;
    if (!email) { saltados++; continue; }

    const body = buildMensajeRecordatorio(r);
    const { subject, html } = buildEmailRecordatorio(r);

    const result = await provider.sendEmail({ to: email, subject, body, html });

    if (result.ok) {
      const { error: updErr } = await supabase
        .from('reminders')
        .update({ estado: 'enviado', canal: 'email', fecha_envio: new Date().toISOString() })
        .eq('id', r.id)
        .eq('estado', 'pendiente'); // no reintentar si cambió entre tanto

      if (!updErr) {
        await logNotification({
          reminderId: r.id,
          canal: 'email',
          destino: email,
          estado: 'enviado',
          detalle: 'Enviado automáticamente (dispatch S39)',
        });
        enviados++;
      } else {
        errores++;
      }
    } else {
      await logNotification({
        reminderId: r.id,
        canal: 'email',
        destino: email,
        estado: 'error',
        detalle: result.error,
      });
      errores++;
    }
  }

  return { enviados, errores, saltados };
}
