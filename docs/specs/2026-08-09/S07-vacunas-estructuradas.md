# S7 — Vacunas estructuradas con fechas (prerequisito de notificaciones)

**Fase:** 2 · **Prioridad:** alta · **Rama:** `feat/javier/vacunas-estructuradas`

## Objetivo
Reemplazar el texto libre `vacunas` por una entidad estructurada que permita saber
**cuándo se aplicó** cada vacuna y **cuándo toca la próxima dosis**. Sin esto no es
posible generar recordatorios de vacunación.

## Contexto
`medical_records.vacunas` guarda strings como `"20/03/2025 — Nobivac — Lote A1234"`.
Se migra a filas en una tabla `vaccinations` y se mantiene el campo legacy de forma
opcional/read-only para no romper datos.

## Diseño de datos

### Migración SQL (parte de S19)
```sql
CREATE TABLE IF NOT EXISTS vaccinations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id           UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  vacuna              TEXT NOT NULL,
  fecha_aplicacion    DATE,
  fecha_proxima_dosis DATE,
  marca               TEXT,
  lote                TEXT,
  dosis               TEXT,              -- '1ra', '2da', 'Refuerzo anual', libre
  observaciones       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vaccinations_patient_id ON vaccinations (patient_id);
CREATE INDEX idx_vaccinations_proxima    ON vaccinations (fecha_proxima_dosis);
```

### Backfill (best-effort desde el texto libre, en S19)
Parsear `vacunas` y `ultima_desparasitacion` con regex de fecha
(`dd/mm/yyyy` o `yyyy-mm-dd`) y nombre antes/después del separador `—`/`-`.
Los que no parseen quedan como `observaciones` en una fila con `vacuna = 'Registro histórico (sin estructura)'`
o simplemente se conservan en el campo legacy. La migración **no borra** el campo
`vacunas` de `medical_records`.

## Cambios

### `types/index.ts`
- Nuevo tipo `Vaccination` con los campos de la tabla.
- `MedicalRecord` mantiene `vacunas?: string` (legacy).

### Hook `hooks/useVaccinations.ts` (nuevo)
- `useVaccinations(patientId)` → listar por paciente (orden por `fecha_aplicacion DESC`).
- `createVaccination`, `updateVaccination`, `deleteVaccination`.

### `components/VaccinationsSection.tsx` (nuevo)
- Lista de vacunas del paciente con: vacuna, fecha aplicación, **próxima dosis**,
  marca, lote, badge de estado (`Al día` / `Próxima en N días` / `Vencida`).
- Formulario de alta/edición (inline o modal): campos de la tabla.
- Botón eliminar con `ConfirmDialog`.

### Integración
- `app/patients/[id]/page.tsx`: nueva sección "Vacunas" en la columna de historial.
- `app/records/new/page.tsx` y `app/records/[id]/page.tsx`: en la sección Anamnésicos,
  link "Gestionar vacunas de <paciente>" que lleva a gestionarlas en el perfil (evita
  duplicar el editor en dos lugares). El campo legacy `vacunas` se mantiene oculto o
  como texto informativo si ya fue migrado.

## Criterios de aceptación
- [ ] Alta/edición/baja de vacunas con fechas y próxima dosis.
- [ ] Badge de estado según `fecha_proxima_dosis`.
- [ ] El backfill creó filas a partir de los textos existentes sin duplicar registros
      ya migrados (idempotente, controlado por `record_id` + vacuna + fecha).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. En un paciente con `vacunas` legacy → correr backfill → confirmar filas creadas.
2. Alta manual de vacuna con próxima dosis → verificar badge.
3. Editar/eliminar desde el perfil.
