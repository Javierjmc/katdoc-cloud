-- ============================================================
-- KATDOC — S44: adjuntos de la consulta (fotos y documentos)
-- Añade medical_records.attachments (array JSONB de {url, nombre, tipo}).
-- Se mantiene document_url como legado. Idempotente.
-- Aplicar en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
