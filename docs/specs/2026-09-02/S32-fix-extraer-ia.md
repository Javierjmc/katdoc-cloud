# S32 — Arreglar "✨ Extraer con IA" (exámenes de laboratorio)

**Prioridad:** alta · **Rama:** directo a `main`

## Objetivo
Que el botón "Extraer con IA" de los exámenes de laboratorio funcione de punta
a punta (subir PDF/foto → parseo → analitos en la tabla) y que, cuando falle,
el error sea claro para el operador.

## Diagnóstico (causas probables, en orden de probabilidad)

1. **`GEMINI_API_KEY` no configurada.** Según `docs/CONTINUAR.md` la key está
   **comentada** en `.env.local` ("están como comentarios"). Sin la key,
   `lib/gemini.ts:53-55` lanza `'GEMINI_API_KEY no configurada'` → la API
   route responde 503 → el cliente muestra el toast de error.
2. **Modelo deprecado.** El código usa `MODEL = 'gemini-2.0-flash'`
   (`lib/gemini.ts:12`). En 2026 es probable que ese modelo ya esté retirado o
   movido de tier; Google devuelve 404 (`models/... not found`).
3. **Límites/timeout**: `AbortSignal.timeout(30000)` puede ser corto para
   PDFs grandes; y el free tier puede devolver 429 si se exceden RPM.
4. **Errores opacos al usuario**: `LabExamsSection.handleAIExtract` solo muestra
   `json.error`; un 404 de modelo o 429 se ve como "Error al extraer" sin pista
   de acción.

## Enfoque — cambios

### Configuración (paso previo manual del dueño)
- Descompletar/poner `GEMINI_API_KEY` en `.env.local` (generar en
  https://aistudio.google.com/apikey). En Vercel agregar la misma variable.
- Verificar con una llamada de prueba que el modelo elegido responde
  (paso de verificación abajo).

### `lib/gemini.ts`
- **Lista de modelos con fallback** (probar en orden):
  `const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];` (ajustar según la
  lista vigente obtenida con el paso de verificación; documentar en el archivo).
  `parseExamWithGemini` itera los modelos: si el error HTTP es 404/400 por
  "model not found" continúa con el siguiente; si es 429/5xx, aborta con
  mensaje claro.
- Subir `timeout` a **60 s** (`AbortSignal.timeout(60000)`).
- En los mensajes de error, distinguir:
  - key ausente → `'GEMINI_API_KEY no configurada — avisar al administrador'`.
  - 429 → `'Límite de Gemini alcanzado (429). Esperá ~1 min y reintentá.'`
  - 404 de modelo → `'Modelo de IA no disponible: <modelo>.'`
  - otro → `'Gemini <status>: <primeros 160 chars>'`.
- Mantener `sanitize` y `parseJsonLoose` (ya manejan ```json y textos sucios).

### `app/api/exams/parse/route.ts`
- `MAX_SIZE` ya valida 10 MB. Añadir en el catch un mapeo de status:
  re-enviar el mensaje tal cual (el cliente decide el texto por substring), o
  devolver `{ error, hint }` con `code` (`no_key | model_not_found | rate_limit
  | parse`) para que la UI muestre el hint correcto. Recomendado: agregar
  `code` y que el cliente lo use.

### `components/LabExamsSection.tsx`
- `handleAIExtract`: si el backend devuelve `code`, mostrar el hint amigable;
  si no, mantener `json.error`. Añadir estado para mostrar inline un aviso
  "Reintentar" cuando el código sea `rate_limit`.
- Mensaje de éxito ya existe ("Se extrajeron N analitos..."). Mantener.

### `.env.local.example`
- Aclarar que la key es obligatoria para "Extraer con IA" (no es opcional).

## Criterios de aceptación
- [ ] Con `GEMINI_API_KEY` seteada y un PDF de hemograma, "Extraer con IA"
      llena la tabla de analitos.
- [ ] Si el modelo configurado ya no existe, se cae al siguiente modelo de la
      lista automáticamente (o muestra el hint claro si todos fallan).
- [ ] Sin key, el error dice "GEMINI_API_KEY no configurada" (no un 502 genérico).
- [ ] Un 429 muestra el hint de "reintentá en 1 min".
- [ ] El parsing de fotos (JPG/PNG/WebP) sigue funcionando.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Desde la terminal/server confirmar la key: hacer GET a
   `https://generativelanguage.googleapis.com/v1beta/models?key=<KEY>`
   y confirmar qué modelos flash figuran vigentes (documentar en `gemini.ts`).
2. Con `npm run dev`, cargar un examen PDF real → "Extraer con IA" → analitos.
3. Probar el mismo PDF como foto.
4. Apagar la key temporalmente → el error indica que falta configurar.
5. Repetir en prod (Vercel) tras cargar la variable.
