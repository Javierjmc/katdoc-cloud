# S44 — Documentos adjuntos: fotos y documentos en la consulta

**Prioridad:** alta · **Rama:** `feat/<dev>/s44-adjuntos-fotos` · **Toca:** historia clínica (nueva consulta), storage, detalle de registro, BD

## Objetivo
En la sección **"📎 Documentos Adjuntos"** de una **nueva consulta** se puede hoy
subir **solo un PDF**. Debe poder adjuntarse **tanto documentos (PDF) como fotos
(JPG/PNG/WebP)**, y que se vean en el detalle del registro (las imágenes,
ampliables).

## Causa raíz (verificada)
- `components/MedicalRecordForm.tsx:412-430`: input `accept=".pdf"`, estado único
  `pdfFile`, y guarda en el campo único `document_url`.
- `lib/supabase.ts:51-71` (`uploadMedicalDocument`): fuerza `contentType:
  'application/pdf'` y ruta `${recordId}/reporte.pdf`.
- `lib/constants.ts:20`: `ALLOWED_DOC_TYPES = ['application/pdf']`.
- La BD solo tiene `medical_records.document_url TEXT`
  (`supabase_schema.sql:115`).
- `app/records/[id]/page.tsx:169-184`: renderiza un único enlace "Ver documento
  PDF adjunto".
- (Referencia: `LabExamsSection` ya acepta PDF + imágenes con
  `ALLOWED_IMAGE_TYPES`/`ALLOWED_DOC_TYPES`; ese patrón se reutiliza.)

## Enfoque
Soportar **varios adjuntos (imágenes y PDFs)** por consulta, persistiéndolos en
un campo `JSONB` nuevo (`attachments`) siguiendo el patrón de `ecografias.archivos`
(`types/index.ts:137-141`). Se mantiene `document_url` como legado.

## Cambios

### Migración BD (idempotente, revisar antes de aplicar)
`migrations/2026XXXX_katdoc_s44_adjuntos.sql`:
```sql
ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
```
- No se elimina `document_url` (compatibilidad con registros existentes).

### `types/index.ts`
- Nuevo tipo:
  ```ts
  export type RecordAttachment = {
    url: string;
    nombre: string;
    tipo: string; // MIME real
    size?: number;
  };
  ```
- `MedicalRecord.attachments?: RecordAttachment[]`.

### `lib/constants.ts`
- `export const ALLOWED_ATTACHMENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];`

### `lib/supabase.ts`
- Nuevo helper `uploadRecordAttachment(file, recordId, index)`:
  - ruta única `${recordId}/${index}-${Date.now()}.${ext}`,
  - `contentType: file.type || undefined`,
  - bucket `medical-documents` (o `record-attachments` si se prefiere aislar),
  - devuelve `{ url, nombre, tipo } | null` (o `throw`, coherente con S30).
- Mantener `uploadMedicalDocument` para el flujo/legado.

### `components/MedicalRecordForm.tsx` — sección "Documentos Adjuntos"
- Reemplazar el input único por input **múltiple**:
  `accept="image/jpeg,image/png,image/webp,application/pdf"`, `multiple`.
- Validar con `ALLOWED_ATTACHMENT_TYPES` y `MAX_DOCUMENT_SIZE` (10 MB) usando
  `toast` para el error.
- Estado `attachments: File[]` + lista con:
  - **thumbnail** para imágenes (preview con `URL.createObjectURL`, revocando al
    quitar/desmontar),
  - nombre para PDFs,
  - botón de quitar,
  - click en imagen → `ImageLightbox` (componente existente).
- En `handleSave`: primero insertar/actualizar el registro, luego subir cada
  archivo con `uploadRecordAttachment`, y persistir el array final:
  ```ts
  payload.attachments = uploaded; // [{url, nombre, tipo}]
  ```
  - Tostear éxito/error por operación (consistente con S30).
  - Conservar el PDF actual (`document_url`) como "adjunto legado" si existe.

### `app/records/[id]/page.tsx`
- Renderizar `record.attachments`:
  - imágenes → thumbnail clicable que abre `ImageLightbox`,
  - PDFs → enlace "Ver PDF" en `target="_blank"`.
- Mantener el bloque actual de `document_url` como legado.

## Criterios de aceptación
- [ ] En nueva consulta se pueden adjuntar **varias** imágenes y **varios** PDFs
      mezclados.
- [ ] El archivo que no sea imagen/PDF o supere 10 MB se rechaza con toast.
- [ ] Al guardar, los adjuntos se suben y quedan asociados a la consulta.
- [ ] En el detalle del registro se ven las imágenes (ampliables) y los PDFs
      (enlace), además del `document_url` legado si existía.
- [ ] Editar una consulta permite agregar/quitar adjuntos sin perder los previos.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. `/records/new?patientId=<id>` → adjuntar 1 JPG + 1 PDF → guardar.
2. Abrir `/records/<id>` → ver la imagen (lightbox) y el enlace al PDF.
3. Editar la consulta → agregar otra foto y quitar una → guardar y re-verificar.
4. Confirmar en Supabase que `attachments` guarda `{url, nombre, tipo}`.

## Fuera de alcance
- Migrar los `document_url` legados al nuevo array (se muestran igual).
- Adjuntos a nivel de paciente (fuera de la consulta).
