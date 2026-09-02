-- ============================================================
-- KATDOC — S39: envío automático de emails + realtime
-- notification_config.email_auto habilita el dispatch automático
-- por tipo (Resend, free tier). Realtime: agrega reminders a la
-- publicación para que la app se entere al instante (badge).
-- Idempotente. Aplicar en Supabase → SQL Editor.
-- ============================================================

ALTER TABLE notification_config
  ADD COLUMN IF NOT EXISTS email_auto BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE notification_config
  ADD COLUMN IF NOT EXISTS whatsapp_auto BOOLEAN NOT NULL DEFAULT FALSE;

-- Habilitado por defecto en los tipos que se recuerdan al cliente.
UPDATE notification_config SET email_auto = TRUE
WHERE tipo IN ('vacuna', 'desparasitacion', 'examen', 'cita');

-- Realtime para la tabla reminders (badges/avisos internos en la app).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reminders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reminders;
  END IF;
END $$;
