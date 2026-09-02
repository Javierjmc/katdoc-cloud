# S33 — Fecha de examen obligatoria + fix de zona horaria en fechas de consulta

**Prioridad:** alta · **Rama:** directo a `main`

## Objetivo
1. Que **"Fecha del examen"** sea obligatoria al cargar un examen de
   laboratorio.
2. Corregir el bug de zona horaria por el que **una fecha marcada como
   1/9/2026 se guarda/visualiza como 31/8/2026**.

## Causa raíz del bug de fecha (verificada)
La columna `medical_records.fecha_consulta` es **`TIMESTAMPTZ`**
(`supabase_schema.sql:56`). El form guarda el valor crudo del `<input
type="date">` (`YYYY-MM-DD`, p. ej. `2026-09-01`) y Postgres lo interpreta
como **medianoche UTC** (`2026-09-01T00:00:00Z`). En Venezuela (UTC-4) esa
misma marca se ve como `2026-08-31 20:00` → al mostrar con
`new Date(...).toLocaleDateString('es-VE')` aparece el **día anterior**.

Puntos exactos:
- `components/MedicalRecordForm.tsx:48` — default `new Date().toISOString().split('T')[0]`
  (fecha de HOY en UTC; cerca de la medianoche local puede dar el día
  siguiente), y `:244` guarda el `YYYY-MM-DD` crudo.
- Vistas que formatean con `new Date(fecha_consulta)`: `app/patients/[id]/page.tsx:192`,
  `app/dashboard/page.tsx:215`, `app/records/[id]/page.tsx:63`, reporte, etc.

Nota: las fechas de citas/vacunas/exámenes son columnas `DATE` (sin zona) y no
sufren esto. Solo `medical_records.fecha_consulta`.

## Enfoque

### A. Convención de guardado "mediodía local" + normalización de legacy
Patrón que el propio proyecto ya usa en la agenda (`agenda/page.tsx:197` con
`'T12:00:00'`): construir fechas a mediodía local para que ninguna zona horaria
razonable (±12 h) cambie el día.

- **Helpers en `lib/utils.ts`:**
  - `fechaInputToISO(f: string): string` → `new Date(f + 'T12:00:00').toISOString()`
    (para persistir en la columna TIMESTAMPTZ).
  - `isoToFechaInput(iso?: string | null): string` → devuelve `YYYY-MM-DD`
    según las **componentes locales** de `new Date(iso)` (para precargar el
    input al editar). Si viene `YYYY-MM-DD` sin hora, devolverlo tal cual.
  - `hoyLocal(): string` → `YYYY-MM-DD` local de hoy (para defaults).
  - `formatFechaConsulta(iso: string): string` → usa `new Date(iso)` pero
    documenta que el valor ya viene normalizado; si llega un valor legacy a
    medianoche UTC exacta (00:00), sumarle 4h antes de formatear
    (`date` no detectable de forma confiable → alternativa en B).
- **`components/MedicalRecordForm.tsx`:**
  - Default: `hoyLocal()`.
  - Guardado: `payload.fecha_consulta = fechaInputToISO(form.fecha_consulta)`.
  - Precarga al editar: `isoToFechaInput(existingRecord?.fecha_consulta)`.
  - El `<Input type="date">` sigue mostrando/guardando `YYYY-MM-DD` en el estado
    (solo se transforma en el payload).

### B. Normalización de registros viejos (migración SQL, idempotente)
Los registros históricos guardados a `00:00 UTC` (medianoche) se ven un día
atrás en VE. Migración única:
```sql
-- Mueve los guardados en medianoche UTC a mediodía UTC para que su fecha
-- local en Venezuela coincida con la que el operador marcó.
UPDATE medical_records
SET fecha_consulta = fecha_consulta + INTERVAL '12 hours'
WHERE fecha_consulta::time = '00:00:00'
  AND fecha_consulta IS NOT NULL;
```
(Los nuevos registros ya se guardan a las 12:00 UTC, así que no se tocan.)

### C. Fecha del examen obligatoria
- **`lib/schemas.ts`**: nuevo `laboratoryExamSchema` con `nombre_examen` y
  `fecha_examen` requeridos (formato fecha válida). Reusar `validateSchema`.
- **`components/LabExamsSection.tsx`**:
  - Marcar el label "Fecha del examen" como `required` (`:308`).
  - En `handleSave`, validar con el schema (o al menos exigir `fecha_examen`);
    error → toast "La fecha del examen es obligatoria".
- La columna es `DATE` → sin problema de zona. (No tocar.)

## Criterios de aceptación
- [ ] Guardar una consulta con fecha 01/09/2026 → al verla muestra 01/09/2026
      (y no 31/08).
- [ ] Las consultas viejas quedan normalizadas (la migración las corre).
- [ ] El default del form es "hoy" en hora local (no mañana por UTC).
- [ ] Al editar una consulta, el input de fecha muestra el mismo día que se ve
      en el detalle.
- [ ] Cargar un examen de laboratorio sin fecha → error "fecha obligatoria".
- [ ] `npm run build`, `npm run lint` y migración en prod pasan.

## Verificación
1. Fijar el reloj del sistema a una hora cercana a medianoche en VE y crear una
   consulta → la fecha mostrada es la marcada.
2. Marcar 1/9/2026, guardar y volver a abrir → 1/9/2026 en edición y lectura.
3. Correr la migración y revisar 2-3 consultas viejas.
4. Cargar examen sin fecha → error; con fecha → OK.
