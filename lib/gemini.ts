// lib/gemini.ts
// ============================================================
// Cliente servidor de Gemini (free tier) para extraer analitos
// de exámenes de laboratorio (PDF o imagen).
// SOLO se importa desde server (API routes). La clave nunca llega
// al bundle del cliente.
// ============================================================

import type { LabAnalyte } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = `
Eres un asistente de veterinaria. Analiza el examen de laboratorio (puede ser PDF o foto).
Extrae y devuelve SOLO JSON válido con este esquema exacto:
{
  "nombre_examen": string,            // ej: "Hemograma", "Química sanguínea", "Urianálisis"
  "laboratorio_origen": string | null, // nombre del laboratorio si se ve, si no null
  "fecha_examen": string | null,       // formato YYYY-MM-DD si se ve, si no null
  "analitos": [
    {
      "nombre": string,                // ej: "Hematocrito"
      "valor": string,                 // ej: "45" (texto, con decimal o no)
      "unidad": string | null,         // ej: "%", "g/dL", "mU/L"
      "rango": string | null,          // rango de referencia, ej: "37-55"
      "flag": "N" | "ALTO" | "BAJO"    // compara valor vs rango de referencia
    }
  ]
}
Reglas:
- Extrae TODOS los analitos de la tabla, no omitas ninguno.
- No inventes datos que no estén en el documento.
- flag debe ser "N" si no se puede determinar o está dentro del rango.
- Devuelve únicamente el JSON, sin texto adicional ni marcas de código.
`;

export type ParsedExam = {
  nombre_examen: string;
  laboratorio_origen: string | null;
  fecha_examen: string | null;
  analitos: LabAnalyte[];
};

/**
 * Envía un archivo (PDF o imagen) a Gemini y devuelve los analitos estructurados.
 * @throws Error si no hay API key configurada o falla la llamada.
 */
export async function parseExamWithGemini(
  file: { mimeType: string; data: ArrayBuffer }
): Promise<ParsedExam> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no configurada');
  }

  const base64 = Buffer.from(file.data).toString('base64');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: file.mimeType, data: base64 } },
            { text: PROMPT },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!text) throw new Error('Gemini no devolvió contenido');

  return sanitize(parseJsonLoose(text));
}

/** Convierte la respuesta (a veces con ```json ... ``` o texto extra) a objeto. */
function parseJsonLoose(text: string): Partial<ParsedExam> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

/** Limpia y valida el resultado antes de mostrarlo al usuario. */
function sanitize(raw: Partial<ParsedExam>): ParsedExam {
  const analitos: LabAnalyte[] = Array.isArray(raw.analitos)
    ? raw.analitos
        .filter((a): a is LabAnalyte => !!a && typeof a === 'object' && !!a.nombre)
        .map(a => ({
          nombre: String(a.nombre).trim(),
          valor: String(a.valor ?? '').trim(),
          unidad: a.unidad ? String(a.unidad).trim() : undefined,
          rango: a.rango ? String(a.rango).trim() : undefined,
          flag: a.flag === 'ALTO' || a.flag === 'BAJO' ? a.flag : 'N',
        }))
    : [];

  return {
    nombre_examen: raw.nombre_examen ? String(raw.nombre_examen).trim() : '',
    laboratorio_origen: raw.laboratorio_origen ? String(raw.laboratorio_origen).trim() : null,
    fecha_examen: raw.fecha_examen && /^\d{4}-\d{2}-\d{2}$/.test(raw.fecha_examen)
      ? raw.fecha_examen
      : null,
    analitos,
  };
}
