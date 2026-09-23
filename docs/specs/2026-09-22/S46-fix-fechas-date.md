# S46 — Fix sistémico de fechas: "un día antes"

**Prioridad:** alta · **Rama:** `fix/<dev>/s46-fechas-date` · **Toca:** formateo de fechas en toda la app

## Objetivo
Que una fecha marcada como **2** se vea **2** en toda la UI (hoy se ve 1).

## Causa raíz (verificada)
Las columnas `DATE` de Postgres llegan por PostgREST como **`"YYYY-MM-DD"`**.
`new Date("2026-09-02")` se interpreta como **medianoche UTC**, y en Venezuela
(UTC-4) eso cae el **día anterior** al formatear con `toLocaleDateString('es-VE')`.

S33 (`20260902_katdoc_s33_normalizar_fecha.sql`) solo arregló
`medical_records.fecha_consulta` (**TIMESTAMPTZ**, ya guardada a mediodía). Las
columnas `DATE` quedaron sin arreglar. Casos concretos:
- `components/LabExamsSection.tsx:245` — `new Date(exam.fecha_examen)`.
- `components/PrescriptionsSection.tsx:227,338,368` — `new Date(p.fecha)`.
- `components/EcografiasSection.tsx:225` — `new Date(eco.fecha)`.
- `components/AppointmentsSection.tsx:228` — `new Date(a.fecha)`.
- `lib/utils.ts:78-97` — `formatearFecha` / `formatearFechaCorta` (usadas por
  `reporte/page.tsx` para `fecha_examen`, vacunas, etc.).
- Defaults `new Date().toISOString().split('T')[0]`
  (`PrescriptionsSection.tsx:53`) → cerca de medianoche local da mañana.

(Nota: `calcularEdad` ya usa `T12:00:00`; `fecha_consulta` TIMESTAMPTZ ya está
normalizada por S33.)

## Enfoque
Un único helper que distingue fecha pura de timestamp, y reemplazar los
`new Date(str)` de fechas puras por ese helper o por `formatearFechaCorta`.

## Cambios

### `lib/utils.ts`
- Nuevo `parseFechaLocal(value: string | null | undefined): Date | null`:
  - `undefined/null` → `null`.
  - `/^\d{4}-\d{2}-\d{2}$/` → `new Date(value + 'T12:00:00')` (local).
  - si no → `new Date(value)` (timestamps completos, tal cual).
- `formatearFecha` y `formatearFechaCorta`: usar `parseFechaLocal`.
- `fechaInputToISO`/`isoToFechaInput`/`hoyLocal`: sin cambios (ya correctos).

### Componentes
- Reemplazar `new Date(x).toLocaleDateString('es-VE')` por
  `formatearFechaCorta(x)` en: `LabExamsSection`, `PrescriptionsSection`,
  `EcografiasSection`, `AppointmentsSection`, `app/dashboard/page.tsx`,
  `app/patients/page.tsx`, `app/patients/[id]/page.tsx`, `app/records/page*`,
  `app/notifications/page.tsx` y `lib/notifications/messages.ts`.
- `PrescriptionsSection.createEmpty`: default de fecha → `hoyLocal()`.
- `recipePdf.ts`: ya usa `T12:00:00` (dejar igual, o migrar a `parseFechaLocal`).

## Criterios de aceptación
- [ ] Examen con fecha 2 → muestra 2 en la lista y en el detalle.
- [ ] Cita, receta y ecografía con fecha 2 → muestran 2.
- [ ] El reporte impreso muestra la fecha correcta.
- [ ] El input de fecha al editar muestra el mismo día que el detalle.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Crear examen/cita/receta/eco con fecha 02/09 → verificar en UI (2, no 1).
2. Imprimir el reporte → fechas correctas.
3. Fijar el reloj cerca de medianoche en VE y crear una receta → fecha de hoy.
