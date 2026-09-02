# S29 — Peso del paciente en cada consulta (examen clínico)

**Prioridad:** alta · **Rama:** directo a `main` · **Consume:** S34 (peso en Recipe)

## Objetivo
Registrar el **peso del paciente en cada consulta**, dentro de la sección
"Examen Clínico / Constantes Vitales", y poder verlo luego:
- en el detalle de la historia clínica,
- en la ficha del paciente (último peso),
- en la Recipe (S34 usa "peso de la última consulta").

## Contexto
Hoy **no existe columna `peso`** en `medical_records` (verificado en
`supabase_schema.sql` y migraciones): al crear un paciente nunca se registra el
peso, y por eso la Recipe no tiene qué mostrar.

## Cambios

### Migración SQL (nueva migración, ejecutar con `db:generate-types`)
```sql
ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS peso NUMERIC(5,2);   -- kg, 2 decimales

CREATE INDEX IF NOT EXISTS idx_medical_records_peso ON medical_records (patient_id, fecha_consulta);
```

### `types/index.ts`
- `MedicalRecord.peso?: number`.

### `components/MedicalRecordForm.tsx`
- En la sección "❤️ Examen Clínico / Constantes Vitales" agregar
  `Field label="Peso (kg)"` tipo `number` `step="0.1"` `inputMode="decimal"`
  (placeholder "Ej: 8.5"), guardando `parseFloat` (como `temperatura`).
- Agregar `'peso'` al array `allFields` (`:103-112`) para que se persista.
- Incluir `peso` en las keys de `Examen clínico` de `SECTIONS_FIELDS`
  (progreso, `:204-209`).
- En edición, precargar `existingRecord?.peso`.

### `app/records/[id]/page.tsx`
- Agregar fila `VitalRow label="Peso" value={record.peso?.toString()} unit="kg"`
  en Constantes Vitales (`:102-114`).

### `app/patients/[id]/page.tsx`
- En la columna izquierda (datos), debajo de la edad, mostrar el último peso:
  tomar `records[0]?.peso` (records ya vienen ordenados `fecha_consulta DESC`
  en `useMedicalRecords`) y su fecha:
  `⚖️ Último peso: 8.5 kg (01/09/2026)`.
  Solo si existe; si no, mostrar "Sin peso registrado" discreto o nada.

### `app/patients/[id]/reporte/page.tsx`
- En "Datos del paciente" o en cada consulta del historial, mostrar peso si
  existe (opcional en esta iteración; mínimo el último en Datos).

## Criterios de aceptación
- [ ] En "Nueva Consulta" hay un campo Peso (kg) en Examen Clínico y al
      guardar se persiste en la historia.
- [ ] En el detalle de la historia se ve "Peso: X kg".
- [ ] En la ficha del paciente se ve el último peso con su fecha.
- [ ] Editar una historia vieja no rompe si no tiene peso.
- [ ] `npm run build`, `npm run lint` y typegen pasan.

## Verificación
1. Crear una consulta con peso 8.5 → ver en detalle.
2. Abrir la ficha → el último peso aparece (ordenado por fecha de consulta).
3. Crear una segunda consulta con peso 8.9 → la ficha muestra 8.9.
4. Historia antigua sin peso → editar y guardar sin tocar peso → OK.
