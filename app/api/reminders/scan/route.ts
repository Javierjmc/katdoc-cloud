// app/api/reminders/scan/route.ts
// ============================================================
// Ejecuta el motor de recordatorios. Llamado por Vercel Cron
// y manualmente desde el centro de notificaciones.
// ============================================================

import { NextResponse } from 'next/server';
import { scanReminders } from '@/lib/notifications/scan';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await scanReminders();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await scanReminders();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
