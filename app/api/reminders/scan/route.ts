// app/api/reminders/scan/route.ts
// ============================================================
// Ejecuta el motor de recordatorios. Llamado por Vercel Cron
// (GET: scan + envío automático de emails, S39) y manualmente desde
// el centro de notificaciones (POST: solo escanea).
// ============================================================

import { NextResponse } from 'next/server';
import { scanReminders } from '@/lib/notifications/scan';
import { dispatchEmails } from '@/lib/notifications/dispatch';
import { isAuthorized } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const scan = await scanReminders();
    const dispatch = await dispatchEmails();
    return NextResponse.json({ ...scan, dispatch });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const result = await scanReminders();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
