# S8 — Exámenes de laboratorio estructurados (multi-laboratorio)

**Fase:** 2 · **Prioridad:** alta · **Rama:** `feat/javier/examenes-laboratorio`

## Objetivo
Cargar exámenes de laboratorio provenientes de **otros laboratorios** (PDF o fotos) y
persistir la información **estructurada** asociada al paciente, de modo que quede en
sus datos clínicos y sea imprimible/reutilizable.

## Diseño de datos

### Migración SQL (parte de S19)
```sql
CREATE TABLE IF NOT EXISTS laboratory_exams (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id        UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  nombre_examen    TEXT NOT NULL,          -- 'Hemograma', 'Química sanguínea', ...
  laboratorio_origen TEXT,                 -- laboratorio externo que lo emitió
  fecha_examen     DATE,
  fecha_proximo_control DATE,              -- usado por el motor de recordatorios
  analitos         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "nombre": "Hematocrito", "valor": "45", "unidad": "%",
  --    "rango": "37-55", "flag": "N"|"ALTO"|"BAJO" }]
  notas            TEXT,
  file_url         TEXT,                   -- PDF/foto original en storage
  file_type        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lab_exams_patient_id ON laboratory_exams (patient_id);
```

### Bucket de storage
Nuevo bucket `lab-exams` (público de lectura, insersión autenticada) — crear en
Supabase Dashboard y reflejar las políticas en S19.

## Cambios

### `types/index.ts`
- Tipo `LabAnalyte = { nombre: string; valor: string; unidad?: string; rango?: string; flag?: 'N'|'ALTO'|'BAJO' }`.
- Tipo `LaboratoryExam` con los campos de la tabla.

### Hook `hooks/useLaboratoryExams.ts` (nuevo)
- `useLaboratoryExams(patientId)` + CRUD.

### `lib/supabase.ts`
- Helper `uploadLabExamFile(file, examId, ext)` → bucket `lab-exams`, ruta
  `<examId>/archivo.<ext>`.

### `components/LabExamsSection.tsx` (nuevo)
- Lista de exámenes del paciente (por fecha DESC): nombre, laboratorio, fecha,
  badge de flags (`ALTO`/`BAJO` en rojo/amarillo), link al archivo original.
- Botón "Cargar examen" → modal/wizard con:
  - Nombre, laboratorio, fecha, notas.
  - Subir archivo (PDF/imagen, máx 10 MB).
  - Tabla de analitos (nombre/valor/unidad/rango/flag) editable por fila, con
    agregar/eliminar filas y botón "✨ Extraer con IA" (integra S9, deshabilitado
    hasta que exista la ruta).
  - Botón guardar.
- Vista de detalle de un examen (tabla completa + archivo).

### Integración
- `app/patients/[id]/page.tsx`: sección "Exámenes de laboratorio" en la columna de
  historial.

## Criterios de aceptación
- [ ] Alta de examen con archivo y analitos editables.
- [ ] Los exámenes quedan asociados al paciente y visibles en su perfil.
- [ ] Edición y borrado de exámenes.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Cargar un examen con 3 analitos y un PDF → verificar persistencia y listado.
2. Editar un analito y el archivo → guardar → verificar.
3. Ver flags ALTO/BAJO coloreados en la lista y en el detalle.
