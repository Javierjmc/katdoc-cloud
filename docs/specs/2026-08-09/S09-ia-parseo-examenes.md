# S9 — Parseo de exámenes con IA gratuita (Gemini)

**Fase:** 2 · **Prioridad:** media · **Rama:** `feat/javier/ia-parseo-examenes`

## Objetivo
Barrer el PDF o la foto del examen de laboratorio con **Gemini free tier** para
extraer automáticamente los analitos y pre-llenar la tabla editable, facilitando la
carga manual. Si el servicio no está disponible, todo cae a carga manual.

## Dependencias
- Spec **S8** (tabla `laboratory_exams` y el wizard de carga) — esta spec agrega el
  botón "✨ Extraer con IA" dentro de ese wizard.
- Requiere `GEMINI_API_KEY` (free tier) en `.env.local` y en Vercel.

## Diseño de API

### `app/api/exams/parse/route.ts` (nuevo, server-only)
- `POST` multipart con el archivo (`FormData`, campo `file`).
- Valida tamaño (≤ 10 MB) y tipo (`application/pdf`, `image/*`).
- Lee el archivo y lo envía a Gemini en base64 inline:
  - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
  - Header: `x-goog-api-key: GEMINI_API_KEY`.
  - Body: `{ contents: [{ parts: [ { inline_data: { mime_type, data: base64 } }, { text: <prompt> } ] }] }`.
- Prompt de extracción (español, JSON estricto):
  ```
  Eres un asistente de veterinaria. Extrae del examen de laboratorio:
  - nombre_examen (ej: Hemograma, Química sanguínea, Urianálisis)
  - laboratorio_origen si se ve
  - fecha_examen (YYYY-MM-DD) si se ve
  - analitos: array de { nombre, valor, unidad, rango, flag }
    donde flag es "N" (normal), "ALTO" o "BAJO" según el rango de referencia.
  Devuelve SOLO JSON con el esquema:
  { "nombre_examen": string, "laboratorio_origen": string|null,
    "fecha_examen": string|null, "analitos": [...] }
  ```
- Respuesta: JSON parseado y saneado. Si falla (red/API/parse), devolver
  `{ error: true, message }` con código 502 y el cliente muestra mensaje amigable +
  edición manual.

### `lib/gemini.ts` (nuevo)
- Helper `parseExamFile(file: File): Promise<ParsedExam>` con timeout (15 s) y
  manejo de errores. Se usa desde el cliente vía `fetch('/api/exams/parse')`.

## Cambios en el cliente (depende de S8)
- `components/LabExamsSection.tsx`: botón "✨ Extraer con IA" junto al archivo
  subido en el wizard. Al hacer clic:
  1. Llama a `/api/exams/parse` con el archivo.
  2. Muestra estado "Extrayendo...".
  3. Rellena `nombre_examen`, `fecha`, `laboratorio_origen` y la tabla de analitos.
  4. El usuario revisa/edita antes de guardar.
- Si no hay `GEMINI_API_KEY` configurada, el botón se deshabilita con tooltip
  "Configurar GEMINI_API_KEY para usar extracción automática".

## Criterios de aceptación
- [ ] Subir PDF/foto de un hemograma real → los analitos se pre-llenan.
- [ ] El usuario puede corregir cualquier valor antes de guardar.
- [ ] Sin API key o con error, el flujo manual sigue funcionando.
- [ ] La API key solo se usa en el servidor (nunca en el bundle del cliente).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Con `GEMINI_API_KEY` en `.env.local`, subir un PDF de laboratorio → extraer.
2. Sin clave (o con clave inválida) → verificar mensaje y edición manual.
3. Revisar que en el bundle del cliente no aparezca la key (grep de `GEMINI_API_KEY`
   en `.next`).
