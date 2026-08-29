// app/api/reminders/scan/route.ts
// ============================================================
// Ejecuta el motor de recordatorios. Llamado por Vercel Cron
// y manualmente desde el centro de notificaciones.
// ============================================================

import { NextResponse } from 'next/server';
import { scanReminders } from '@/lib/notifications/scan';
import { isAuthorized } from '@/lib/api-auth';

export const runtime = 'nodejs';

async function handle() {
  try {
    const result = await scanReminders();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return handle();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return handle();
}
