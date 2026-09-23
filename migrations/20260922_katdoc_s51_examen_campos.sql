-- ============================================================
-- KATDOC — S51: campos del examen para el formato KATDOC
-- Agrega encabezado e interpretación extraídos del documento.
-- Idempotente. Aplicar en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE laboratory_exams
  ADD COLUMN IF NOT EXISTS descripcion    TEXT,
  ADD COLUMN IF NOT EXISTS medico_solicitante TEXT,
  ADD COLUMN IF NOT EXISTS rif            TEXT,
  ADD COLUMN IF NOT EXISTS interpretacion TEXT,
  ADD COLUMN IF NOT EXISTS observaciones  TEXT;
