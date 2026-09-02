// app/api/notifications/email/route.ts
// ============================================================
// Envía un email de recordatorio vía Resend (si está configurado).
// Si no hay RESEND_API_KEY, devuelve { simulated: true } y el
// cliente cae a mailto:.
// ============================================================

import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/notifications';
import { isAuthorized } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = (await request.json()) as {
      to: string;
      subject?: string;
      body?: string;
      html?: string;
      reminderId?: string;
      attachment?: { filename: string; dataBase64: string };
    };
    if (!body.to || !body.body) {
      return NextResponse.json({ error: 'Faltan destinatario o contenido' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ simulated: true });
    }

    const provider = getProvider();
    const result = await provider.sendEmail({
      to: body.to,
      subject: body.subject,
      body: body.body,
      html: body.html,
      attachment: body.attachment,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, externalId: result.externalId });
  } catch {
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 400 });
  }
}
