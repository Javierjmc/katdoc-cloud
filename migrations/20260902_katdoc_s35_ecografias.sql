-- ============================================================
-- KATDOC — S35: ecografías / rayos X
-- Soporte de archivos PDF (además de imágenes) en ecografias.
-- Idempotente. Aplicar en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE ecografias
  ADD COLUMN IF NOT EXISTS archivos JSONB NOT NULL DEFAULT '[]'::jsonb;
-- [{ "url": "...", "nombre": "informe.pdf", "tipo": "application/pdf" }]
