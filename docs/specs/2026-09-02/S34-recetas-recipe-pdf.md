# S34 — Module "Recipe": impresión en blanco, peso y envío (PDF por email, WhatsApp manual)

**Prioridad:** alta · **Rama:** directo a `main` · **Depende de:** S29 (peso por consulta)

## Objetivo
1. **Renombrar la sección** hoy llamada "Recetas" a **"Recipe(s)"** en toda la
   app y el reporte (decisión confirmada; se conserva el nombre interno
   `Prescription`/`prescriptions`).
2. Corregir que **el PDF/imagen al imprimir salga en blanco**.
3. Mostrar el **peso de la última consulta** en la Recipe (usa S29).
4. Poder **enviar la Recipe por email (automatizado, PDF adjunto)** y
   mantener **WhatsApp manual** (`wa.me` prellenado; sin adjuntos, por
   limitación del enlace).

## Causa raíz del "PDF en blanco"
`components/PrescriptionsSection.tsx` imprime un modal con clase `.print-area`
(`:256`) usando `window.print()`. Pero el `@media print` de `app/globals.css`
(`:53-69`) solo hace visible `.reporte-print`; como no hay regla para
`.print-area`, la regla `body * { visibility: hidden }` deja todo oculto → el
PDF (o la vista previa de impresión) sale **en blanco**.

## Cambios

### A. Renombrado a "Recipe"
Reemplazos de texto (UI + mensajes), manteniendo código/tipos/BD:
- `components/PrescriptionsSection.tsx`: header "💊 Recetas" →
  "💊 Recipe(s)"; botones "+ Nueva receta" → "+ Nueva recipe"; "Guardar
  receta" → "Guardar recipe"; EmptyState "Sin recetas…"/"Nueva receta" →
  "Sin recipes…"/"Nueva recipe"; títulos del modal "Nueva receta"/"Editar
  receta" → "Nueva recipe"/"Editar recipe"; mensajes toast "Receta
  registrada/actualizada/eliminada" → "Recipe registrada/actualizada/eliminada".
- Default de `titulo` en `createEmpty()` y `fromPrescription`: `'Recipe'`
  (solo para filas nuevas; no migrar filas existentes con título "Receta").
- `components/PrescriptionsSection.tsx` `formatMessage`: encabezado
  `'📋 RECIPE'`.
- `app/patients/[id]/reporte/page.tsx`: label `'Recetas'` →
  `'Recipes'` (`SECTION_LABELS` y encabezado de sección).
- Cualquier otra etiqueta visible con "Receta/s" (grep `Receta`) → "Recipe".

### B. Fix de impresión (PDF en blanco)
- En `app/globals.css`, extender el bloque `@media print` para que el bloque
  imprimible de la Recipe sea visible (igual patrón que `.reporte-print`):
  ```css
  .print-area, .print-area * { visibility: visible; }
  .print-area { position: absolute; inset: 0; width: 100%;
                background: white; color: black; font-size: 12px; }
  ```
  Cuidado: la receta vive en un modal `fixed`; aplicar el mismo enfoque de
  "hacer visible solo el área" que ya funciona para el reporte.
- Alternativa más robusta (recomendada en paralelo): como ahora habrá un PDF
  real (sección C), el flujo principal de "compartir" usa el archivo PDF, y la
  impresión del navegador queda como atajo.

### C. Generación de PDF real (archivo) — nueva dependencia `pdf-lib`
- Agregar dependencia: `npm i pdf-lib` (pequeña, genera PDFs en el cliente).
- Nuevo **`lib/recipePdf.ts`**:
  - `buildRecipePdf(recipe, opts: { paciente, tutor, peso? }): Promise<Blob>`
    renderizando un PDF limpio con membrete KATDOC (🐾 KATDOC, título,
    paciente, especie/edad si se pasa, **⚖️ Peso: X kg** si existe, fecha,
    tabla/lista de medicamentos con dosis/frecuencia/duración/vía/indicaciones,
    notas, pie con "Documento generado por KATDOC").
  - Fuentes estándar Helvetica (sin costos); escapar texto.
- `components/PrescriptionsSection.tsx`:
  - Botón **"⬇️ PDF"** por Recipe → `buildRecipePdf` → descarga con
    `recipe-<paciente>-<fecha>.pdf`.
  - "Enviar por email": generar el PDF → base64 → POST a
    `/api/notifications/email` (con `appPinHeader`) incluyendo `attachment` →
    toast de éxito/error (o fallback `mailto:` si Resend no está configurado,
    indicándolo al usuario).
  - Mantener botón WhatsApp (wa.me) con texto formateado que ahora incluye
    **peso** si existe y usa encabezado "RECIPE".

### D. Email con adjunto
- `lib/notifications/provider.ts`: ampliar `NotificationMessage` con
  `attachment?: { filename: string; dataBase64: string }`; en
  `sendEmail`, incluirlo en el body a Resend (`attachments: [{ filename,
  content: dataBase64 }]`).
- `app/api/notifications/email/route.ts`: aceptar `attachment` en el body y
  pasarlo al provider. (Volver a verificar el límite de Resend free.)
- Se reutiliza para S39 (recordatorios por email).

### E. Peso en la Recipe (S29)
- `components/PrescriptionsSection` recibe (o lee) el peso de la última
  consulta. Opción simple: usar `useMedicalRecords(patientId)` (ya existe) y
  tomar `records[0]?.peso` + `fecha_consulta`. Pasar `peso` a
  `buildRecipePdf` y a `formatMessage`.
  - Si no hay peso aún: omitir la línea (no romper) — decisión UX documentada.

## Criterios de aceptación
- [ ] En toda la UI se lee "Recipe(s)" (grep sin ocurrencias visibles de "Receta" salvo históricos).
- [ ] Imprimir una Recipe ya no sale en blanco (se ve el documento correcto).
- [ ] "Descargar PDF" genera un archivo válido con membrete, medicamentos y peso.
- [ ] "Enviar por email" llega con el PDF adjunto (Resend) o cae a `mailto:` con aviso.
- [ ] WhatsApp abre `wa.me` con el texto completo incluyendo peso cuando existe.
- [ ] `npm run build`, `npm run lint` pasan.

## Verificación
1. Crear una recipe con 2 medicamentos y guardar → probar imprimir (no blanco),
   descargar PDF (abrir y revisar formato/peso), enviar por email a una
   dirección real, abrir WhatsApp.
2. Recipe sin peso registrado → líneas de peso ausentes sin errores.
3. Probar en dark mode y mobile.
4. Confirmar que el reporte imprimible del paciente muestra la sección
   "Recipes".
