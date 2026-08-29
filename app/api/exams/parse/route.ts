// app/api/exams/parse/route.ts
// ============================================================
// Punto de entrada del servidor para el parseo de exámenes con IA.
// Recibe un PDF o imagen y devuelve los analitos estructurados.
// ============================================================

import { NextResponse } from 'next/server';
import { parseExamWithGemini } from '@/lib/gemini';
import { isAuthorized } from '@/lib/api-auth';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
    }

    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no soportado' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo supera los 10 MB' }, { status: 400 });
    }

    const data = await file.arrayBuffer();
    const parsed = await parseExamWithGemini({ mimeType: file.type, data });

    if (!parsed.nombre_examen && parsed.analitos.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo extraer información del documento. Revísalo a mano.' },
        { status: 422 }
      );
    }

    return NextResponse.json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    const status = msg.includes('GEMINI_API_KEY') ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
