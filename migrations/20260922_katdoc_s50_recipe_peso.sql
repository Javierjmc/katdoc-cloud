-- ============================================================
-- KATDOC — S50: peso en la recipe
-- Permite guardar el peso con el que se emite una recipe (S29 lo captura
-- por consulta; si falta, se puede escribir en la recipe).
-- Idempotente. Aplicar en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS peso NUMERIC(6,2);
