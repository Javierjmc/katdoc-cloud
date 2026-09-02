-- ============================================================
-- KATDOC — S40: desparasitaciones explícitas
-- Añade vaccinations.categoria ('vacuna' | 'desparasitacion') y
-- reclasifica los históricos por keyword.
-- Idempotente. Aplicar en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE vaccinations
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'vacuna';

UPDATE vaccinations SET categoria = 'desparasitacion'
WHERE lower(vacuna) LIKE '%desparasit%' OR lower(vacuna) LIKE '%drontal%'
   OR lower(vacuna) LIKE '%milbemax%' OR lower(vacuna) LIKE '%ivermectina%'
   OR lower(vacuna) LIKE '%bravecto%' OR lower(vacuna) LIKE '%nexgard%'
   OR lower(vacuna) LIKE '%simparica%' OR lower(vacuna) LIKE '%febendazol%'
   OR lower(vacuna) LIKE '%praziquantel%';

CREATE INDEX IF NOT EXISTS idx_vaccinations_categoria
  ON vaccinations (patient_id, categoria);
