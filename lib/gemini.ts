// lib/gemini.ts
// ============================================================
// Cliente servidor de Gemini (free tier) para extraer analitos
// de exámenes de laboratorio (PDF o imagen).
// SOLO se importa desde server (API routes). La clave nunca llega
// al bundle del cliente.
// ============================================================

import type { LabAnalyte } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TIMEOUT_MS = 60000;

// Modelos a probar en orden. Si uno devuelve "not found" (retirado), se
// continúa con el siguiente. `gemini-2.5-flash` y `gemini-flash-latest`
// verificados como vigentes (2026-09). Revisar en
// https://ai.google.dev/gemini-api/docs/models
const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest'];

export type GeminiErrorCode =
  | 'no_key'
  | 'auth'
  | 'rate_limit'
  | 'model_not_found'
  | 'gemini';

export class GeminiError extends Error {
  code: GeminiErrorCode;

  constructor(message: string, code: GeminiErrorCode) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

const PROMPT = `
Eres un asistente de veterinaria. Analiza el examen de laboratorio (puede ser PDF o foto).
Extrae y devuelve SOLO JSON válido con este esquema exacto:
{
  "nombre_examen": string,             // ej: "Hemograma", "Química sanguínea", "Urianálisis"
  "laboratorio_origen": string | null, // nombre del laboratorio si se ve, si no null
  "descripcion": string | null,        // texto de DESCRIPCIÓN/encabezado, ej: "KATDOC CONSULTORIO VETERINARIO"
  "medico_solicitante": string | null, // médico solicitante si aparece
  "rif": string | null,                // RIF si aparece
  "fecha_examen": string | null,       // formato YYYY-MM-DD si se ve, si no null
  "analitos": [
    {
      "nombre": string,                // ej: "Hematocrito"
      "valor": string,                 // ej: "45" (texto, con decimal o no)
      "unidad": string | null,         // ej: "%", "g/dL", "mU/L"
      "rango": string | null,          // rango de referencia, ej: "37-55"
      "flag": "N" | "ALTO" | "BAJO",   // compara valor vs rango de referencia
      "grupo": string | null           // sección/título del analito (ej: "Hematología", "Fórmula leucocitaria")
    }
  ],
  "interpretacion": string | null,     // conclusión, ej: "Normocitos normocrómicos / Leucocitosis"
  "observaciones": string | null        // notas al pie, ej: "Descarte de hemoparásitos: ..."
}
Reglas:
- Extrae TODOS los analitos de la tabla, no omitas ninguno; incluye también la fórmula leucocitaria.
- Asigna a cada analito su "grupo" según la sección donde aparece; null si no aplica.
- Para el flag: si el valor es numérico y el rango es del tipo "min-max", compara y marca
  "ALTO" si supera el máximo o "BAJO" si está por debajo del mínimo. Si no se puede, marca "N".
- Captura "interpretacion" (conclusiones) y "observaciones" (notas al pie) si existen.
- No inventes datos que no estén en el documento.
- Devuelve únicamente el JSON, sin texto adicional ni marcas de código.
`;

export type ParsedExam = {
  nombre_examen: string;
  laboratorio_origen: string | null;
  descripcion: string | null;
  medico_solicitante: string | null;
  rif: string | null;
  fecha_examen: string | null;
  analitos: LabAnalyte[];
  interpretacion: string | null;
  observaciones: string | null;
};

/**
 * Envía un archivo (PDF o imagen) a Gemini y devuelve los analitos estructurados.
 * @throws GeminiError con un mensaje accionable por el usuario.
 */
export async function parseExamWithGemini(
  file: { mimeType: string; data: ArrayBuffer }
): Promise<ParsedExam> {
  if (!GEMINI_API_KEY) {
    throw new GeminiError(
      'GEMINI_API_KEY no configurada — pedile al administrador que la active en .env.local / Vercel.',
      'no_key'
    );
  }

  const base64 = Buffer.from(file.data).toString('base64');
  let lastError: unknown = null;

  for (const model of MODELS) {
    try {
      const text = await requestModel(model, base64, file.mimeType);
      return sanitize(parseJsonLoose(text));
    } catch (e) {
      lastError = e;
      if (e instanceof GeminiError && e.code === 'model_not_found') {
        // Probar con el siguiente modelo de la lista.
        continue;
      }
      // Otros errores (auth, rate_limit, gemini) no cambian de modelo: cortar.
      throw e;
    }
  }

  throw (
    lastError ??
    new GeminiError(
      `Ningún modelo disponible respondió (${MODELS.join(', ')}). Revisá la lista vigente de Gemini.`,
      'model_not_found'
    )
  );
}

/** Llama a un modelo puntual y devuelve el texto crudo de la respuesta. */
async function requestModel(
  model: string,
  base64: string,
  mimeType: string
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY ?? '',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: PROMPT },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'TimeoutError';
    throw new GeminiError(
      timedOut
        ? 'Gemini tardó demasiado en responder (60 s). Probá con un archivo más liviano.'
        : 'Error de red al contactar a Gemini. Reintentá en un momento.',
      'gemini'
    );
  }

  const rawBody = await res.text().catch(() => '');
  if (!res.ok) {
    let bodyMsg = rawBody.slice(0, 200);
    try {
      const json = JSON.parse(rawBody);
      bodyMsg = json?.error?.message ?? bodyMsg;
    } catch {
      /* body no es JSON */
    }
    const lower = `${res.status} ${bodyMsg}`.toLowerCase();

    if (res.status === 401 || res.status === 403) {
      throw new GeminiError(
        'API key de Gemini inválida o sin permisos. Revisá GEMINI_API_KEY.',
        'auth'
      );
    }
    if (res.status === 429) {
      throw new GeminiError(
        'Límite de Gemini alcanzado (429). Esperá ~1 minuto y reintentá.',
        'rate_limit'
      );
    }
    if (res.status === 404 || lower.includes('not found') || lower.includes('models/')) {
      throw new GeminiError(
        `Modelo de IA no disponible: ${model}.`,
        'model_not_found'
      );
    }
    throw new GeminiError(`Gemini ${res.status}: ${bodyMsg.slice(0, 160)}`, 'gemini');
  }

  try {
    const json = JSON.parse(rawBody) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new Error('Gemini no devolvió contenido');
    return text;
  } catch (e) {
    throw new GeminiError(
      'Gemini respondió con un formato inesperado. Reintentá.',
      'gemini'
    );
  }
}

/** Convierte la respuesta (a veces con ```json ... ``` o texto extra) a objeto. */
function parseJsonLoose(text: string): Partial<ParsedExam> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

/** Compara valor vs rango ("min-max") como respaldo del flag de la IA. */
function computeFlag(valor: string, rango?: string, flag?: string): 'N' | 'ALTO' | 'BAJO' {
  if (flag === 'ALTO' || flag === 'BAJO') return flag;
  const v = parseFloat(String(valor).replace(',', '.'));
  const m = rango?.match(/(-?\d+(?:[.,]\d+)?)\s*[-–]\s*(-?\d+(?:[.,]\d+)?)/);
  if (!Number.isNaN(v) && m) {
    const min = parseFloat(m[1].replace(',', '.'));
    const max = parseFloat(m[2].replace(',', '.'));
    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      if (v > max) return 'ALTO';
      if (v < min) return 'BAJO';
    }
  }
  return 'N';
}

/** Limpia y valida el resultado antes de mostrarlo al usuario. */
function sanitize(raw: Partial<ParsedExam>): ParsedExam {
  const analitos: LabAnalyte[] = Array.isArray(raw.analitos)
    ? raw.analitos
        .filter((a): a is LabAnalyte => !!a && typeof a === 'object' && !!a.nombre)
        .map(a => {
          const valor = String(a.valor ?? '').trim();
          const rango = a.rango ? String(a.rango).trim() : undefined;
          return {
            nombre: String(a.nombre).trim(),
            valor,
            unidad: a.unidad ? String(a.unidad).trim() : undefined,
            rango,
            flag: computeFlag(valor, rango, a.flag),
            grupo: a.grupo ? String(a.grupo).trim() : undefined,
          };
        })
    : [];

  const str = (v: unknown) => (v ? String(v).trim() : null);

  return {
    nombre_examen: raw.nombre_examen ? String(raw.nombre_examen).trim() : '',
    laboratorio_origen: str(raw.laboratorio_origen),
    descripcion: str(raw.descripcion),
    medico_solicitante: str(raw.medico_solicitante),
    rif: str(raw.rif),
    fecha_examen: raw.fecha_examen && /^\d{4}-\d{2}-\d{2}$/.test(raw.fecha_examen)
      ? raw.fecha_examen
      : null,
    analitos,
    interpretacion: str(raw.interpretacion),
    observaciones: str(raw.observaciones),
  };
}
