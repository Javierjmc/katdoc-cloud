// app/api/reminders/route.ts
// ============================================================
// GET: lista recordatorios pendientes con datos expandidos.
// PATCH: actualiza estado/canal de un recordatorio.
// ============================================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get('estado') ?? 'pendiente';

  const { data, error } = await supabase
    .from('reminders')
    .select('*, patient:patients(id, nombre, active), tutor:tutors(id, nombre, telefono, email)')
    .eq('estado', estado)
    .order('fecha_evento', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id: string; estado: string; canal?: string };
    if (!body.id) {
      return NextResponse.json({ error: 'Falta id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('reminders')
      .update({
        estado: body.estado,
        canal: body.canal ?? null,
        fecha_envio: body.estado === 'enviado' ? new Date().toISOString() : null,
      })
      .eq('id', body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
}
