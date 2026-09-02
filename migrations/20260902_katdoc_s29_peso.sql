-- ============================================================
-- KATDOC — S29: peso del paciente por consulta
-- Agrega la columna peso (kg) a medical_records.
-- Idempotente. Aplicar en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS peso NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_medical_records_paciente_fecha
  ON medical_records (patient_id, fecha_consulta DESC);
