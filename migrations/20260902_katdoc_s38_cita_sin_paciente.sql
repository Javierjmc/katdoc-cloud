-- ============================================================
-- KATDOC — S38: citas sin paciente registrado ("cita libre")
-- patient_id pasa a ser opcional; se agregan campos de texto para
-- el nombre/contacto escrito a mano.
-- Idempotente. Aplicar en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE appointments ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS nombre_paciente TEXT,   -- nombre libre de la mascota
  ADD COLUMN IF NOT EXISTS tutor_nombre    TEXT,   -- persona de contacto
  ADD COLUMN IF NOT EXISTS telefono_tutor  TEXT;   -- para WhatsApp

CREATE INDEX IF NOT EXISTS idx_appointments_libres
  ON appointments (patient_id) WHERE patient_id IS NULL;
