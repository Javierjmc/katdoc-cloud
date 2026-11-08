-- ============================================================
-- KATDOC — LIMPIEZA TOTAL DE DATOS (2026-09-01)
-- Vacía todas las tablas de datos de la app.
-- Conserva: estructura de tablas, buckets, políticas RLS y los
-- 6 presets de notification_config.
-- ⚠️ NO vacía Storage: Supabase bloquea DELETE directo sobre
--    storage.objects (storage.protect_delete). Para vaciar los
--    archivos usar scripts/limpiar_storage.ps1 (Storage API).
-- Aplicar en Supabase → SQL Editor → Run.
-- ⚠️ IRREVERSIBLE: borra todos los pacientes, tutores, historias,
--    citas y recordatorios.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Vaciar tablas de datos (respetando FKs con CASCADE)
-- ============================================================
TRUNCATE TABLE notification_log,
             reminders,
             appointments,
             ecografias,
             prescriptions,
             laboratory_exams,
             vaccinations,
             medical_records,
             patients,
             tutors
CASCADE;

-- ============================================================
-- 2. Recrear los 6 presets de configuración (idempotente)
-- ============================================================
INSERT INTO notification_config (tipo, label, dias_antes, dias_despues) VALUES
  ('vacuna',          'Vacunación',                 21, 0),
  ('desparasitacion', 'Desparasitación',            21, 0),
  ('examen',          'Exámenes de laboratorio',    60, 0),
  ('control',         'Controles',                  30, 0),
  ('cita',            'Citas',                       1, 0),
  ('seguimiento',     'Seguimiento sin respuesta',   0, 2)
ON CONFLICT (tipo) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICACIÓN POST-LIMPIEZA (correr después del COMMIT)
-- ============================================================
-- SELECT
--   (SELECT count(*) FROM tutors)            AS tutors,
--   (SELECT count(*) FROM patients)          AS patients,
--   (SELECT count(*) FROM medical_records)   AS records,
--   (SELECT count(*) FROM appointments)      AS citas,
--   (SELECT count(*) FROM reminders)         AS reminders,
--   (SELECT count(*) FROM notification_log)  AS logs,
--   (SELECT count(*) FROM storage.objects WHERE bucket_id IN ('pet-photos','medical-documents','lab-exams','ecografias')) AS storage_objetos,
--   (SELECT count(*) FROM notification_config) AS presets_config;me da
