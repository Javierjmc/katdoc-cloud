-- ============================================================
-- KATDOC — Migración consolidada v3 (incremental sobre v2)
-- Aplicar DESPUÉS de 20260809_katdoc_v2.sql.
-- IDEMPOTENTE: puede re-ejecutarse sin errores.
-- Cubre: S21 (citas + seguimiento de recordatorios).
-- Aplicar en Supabase → SQL Editor.
-- ============================================================

-- ============================================================
-- S21/S22 — Tabla de citas (appointments)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tutor_id    UUID REFERENCES tutors(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,
  hora        TEXT,               -- 'HH:MM' formato 24h
  motivo      TEXT,
  estado      TEXT NOT NULL DEFAULT 'programada',
             -- 'programada' | 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
  notas       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tutor_id   ON appointments (tutor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_fecha      ON appointments (fecha);
CREATE INDEX IF NOT EXISTS idx_appointments_estado     ON appointments (estado);

-- ============================================================
-- S21/S24 — Seguimiento de recordatorios ("no respondió")
-- El estado 'seguimiento' se usa como valor de reminders.estado;
-- fecha_seguimiento registra cuándo se marcó para re-contacto.
-- ============================================================
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS fecha_seguimiento TIMESTAMPTZ;

-- ============================================================
-- S21 — Presets de configuración nuevos
-- 'cita': ventana para recordar citas próximas (motor S14).
-- 'seguimiento': días sin respuesta antes de sugerir re-contacto (S24).
-- ============================================================
INSERT INTO notification_config (tipo, label, dias_antes, dias_despues) VALUES
  ('cita',          'Citas',                          1, 0),
  ('seguimiento',   'Seguimiento sin respuesta',      0, 2)
ON CONFLICT (tipo) DO NOTHING;
