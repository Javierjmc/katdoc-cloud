-- ============================================================
-- KATDOC — Migración consolidada v2 (incremental)
-- Se construye a medida que se ejecutan los specs (ver docs/specs/2026-08-09/).
-- IDEMPOTENTE: puede re-ejecutarse sin errores.
-- Aplicar en Supabase → SQL Editor.
-- ============================================================

-- ============================================================
-- S3 — Normalizar historial reproductivo (quitar "Castrado/a")
-- ============================================================
UPDATE medical_records
SET historial_reproductivo = 'Esterilizado/a'
WHERE historial_reproductivo = 'Castrado/a';

-- ============================================================
-- S4 — Notas de descargo por órgano/sistema
-- ============================================================
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS sistemas_notas JSONB;

-- ============================================================
-- S7 — Vacunas estructuradas
-- ============================================================
CREATE TABLE IF NOT EXISTS vaccinations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id           UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  vacuna              TEXT NOT NULL,
  fecha_aplicacion    DATE,
  fecha_proxima_dosis DATE,
  marca               TEXT,
  lote                TEXT,
  dosis               TEXT,
  observaciones       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vaccinations_patient_id ON vaccinations (patient_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_proxima    ON vaccinations (fecha_proxima_dosis);

-- Índice único parcial para idempotencia del backfill (S7):
-- una fila por (record, vacuna, fecha). No afecta altas manuales (record_id null).
CREATE UNIQUE INDEX IF NOT EXISTS uq_vaccinations_record_vacuna_fecha
ON vaccinations (record_id, vacuna, fecha_aplicacion)
WHERE record_id IS NOT NULL;

-- Backfill best-effort desde el texto libre de medical_records.vacunas y
-- ultima_desparasitacion.
-- Parseo: "dd/mm/yyyy — Nombre — Marca — Lote" | "yyyy-mm-dd — Nombre"
DO $$
DECLARE
  r RECORD;
  v_fecha DATE;
  v_resto TEXT;
  v_parts TEXT[];
  v_nombre TEXT;
BEGIN
  FOR r IN
    SELECT mr.id AS record_id, mr.patient_id, COALESCE(mr.vacunas, '') AS texto, mr.vacunas AS obs
    FROM medical_records mr
    WHERE mr.vacunas IS NOT NULL AND TRIM(mr.vacunas) <> ''
    UNION ALL
    SELECT mr.id AS record_id, mr.patient_id, COALESCE(mr.ultima_desparasitacion, '') AS texto, mr.ultima_desparasitacion AS obs
    FROM medical_records mr
    WHERE mr.ultima_desparasitacion IS NOT NULL AND TRIM(mr.ultima_desparasitacion) <> ''
  LOOP
    v_fecha := NULL;
    v_resto := r.texto;
    v_parts := NULL;

    BEGIN
      SELECT (regexp_match(r.texto, '(\d{1,2})/(\d{1,2})/(\d{4})')) INTO v_parts;
      IF v_parts IS NOT NULL THEN
        v_fecha := TO_DATE(v_parts[3] || '-' || v_parts[2] || '-' || v_parts[1], 'YYYY-MM-DD');
        v_resto := regexp_replace(r.texto, '\d{1,2}/\d{1,2}/\d{4}', '', '');
      ELSE
        SELECT (regexp_match(r.texto, '(\d{4})-(\d{1,2})-(\d{1,2})')) INTO v_parts;
        IF v_parts IS NOT NULL THEN
          v_fecha := TO_DATE(v_parts[1] || '-' || v_parts[2] || '-' || v_parts[3], 'YYYY-MM-DD');
          v_resto := regexp_replace(r.texto, '\d{4}-\d{1,2}-\d{1,2}', '', '');
        END IF;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Fecha inválida en el texto: se conserva el registro sin fecha
        v_fecha := NULL;
        v_resto := r.texto;
    END;

    -- Limpiar separadores y quedarnos con el primer segmento como nombre
    v_resto := REGEXP_REPLACE(v_resto, '^[\s\-—–]+|[\s\-—–]+$', '', 'g');
    v_nombre := SPLIT_PART(v_resto, '—', 1);
    v_nombre := TRIM(REGEXP_REPLACE(v_nombre, '^[\s\-–]+|[\s\-–]+$', '', 'g'));

    INSERT INTO vaccinations (patient_id, record_id, vacuna, fecha_aplicacion, observaciones)
    VALUES (
      r.patient_id,
      r.record_id,
      COALESCE(NULLIF(v_nombre, ''), 'Registro histórico (sin estructura)'),
      v_fecha,
      r.obs
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- S8 — Exámenes de laboratorio estructurados
-- ============================================================
CREATE TABLE IF NOT EXISTS laboratory_exams (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id        UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  nombre_examen    TEXT NOT NULL,
  laboratorio_origen TEXT,
  fecha_examen     DATE,
  fecha_proximo_control DATE,
  analitos         JSONB NOT NULL DEFAULT '[]'::jsonb,
  notas            TEXT,
  file_url         TEXT,
  file_type        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_exams_patient_id ON laboratory_exams (patient_id);

-- Storage: bucket lab-exams (crear en Dashboard si no existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'lab-exams') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('lab-exams', 'lab-exams', TRUE);
  END IF;
END $$;

DROP POLICY IF EXISTS "Public read lab-exams" ON storage.objects;
CREATE POLICY "Public read lab-exams" ON storage.objects
  FOR SELECT USING (bucket_id = 'lab-exams');
DROP POLICY IF EXISTS "Client insert lab-exams" ON storage.objects;
CREATE POLICY "Client insert lab-exams" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lab-exams');
DROP POLICY IF EXISTS "Client update lab-exams" ON storage.objects;
CREATE POLICY "Client update lab-exams" ON storage.objects
  FOR UPDATE USING (bucket_id = 'lab-exams');

-- ============================================================
-- S10 — Recetas (prescripciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id     UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  titulo        TEXT DEFAULT 'Receta',
  fecha         DATE DEFAULT CURRENT_DATE,
  medicamentos  JSONB NOT NULL DEFAULT '[]'::jsonb,
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions (patient_id);

-- ============================================================
-- S11 — Ecografías editables
-- ============================================================
CREATE TABLE IF NOT EXISTS ecografias (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id    UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  fecha        DATE DEFAULT CURRENT_DATE,
  organo       TEXT,
  hallazgos    TEXT,
  conclusiones TEXT,
  mediciones   JSONB NOT NULL DEFAULT '[]'::jsonb,
  imagenes     JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ecografias_patient_id ON ecografias (patient_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'ecografias') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('ecografias', 'ecografias', TRUE);
  END IF;
END $$;

DROP POLICY IF EXISTS "Public read ecografias" ON storage.objects;
CREATE POLICY "Public read ecografias" ON storage.objects
  FOR SELECT USING (bucket_id = 'ecografias');
DROP POLICY IF EXISTS "Client insert ecografias" ON storage.objects;
CREATE POLICY "Client insert ecografias" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ecografias');
DROP POLICY IF EXISTS "Client update ecografias" ON storage.objects;
CREATE POLICY "Client update ecografias" ON storage.objects
  FOR UPDATE USING (bucket_id = 'ecografias');

-- ============================================================
-- S13 — Configuración de ventanas de notificación
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_config (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  dias_antes  INTEGER NOT NULL,
  dias_despues INTEGER NOT NULL DEFAULT 0,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO notification_config (tipo, label, dias_antes, dias_despues) VALUES
  ('vacuna',          'Vacunación',              21, 0),
  ('desparasitacion', 'Desparasitación',         21, 0),
  ('examen',          'Exámenes de laboratorio', 60, 0),
  ('control',         'Controles',               30, 0)
ON CONFLICT (tipo) DO NOTHING;

-- ============================================================
-- S14 — Recordatorios
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tutor_id        UUID REFERENCES tutors(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  fecha_evento    DATE NOT NULL,
  fecha_ventana   DATE NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'pendiente',
  canal           TEXT,
  fecha_envio     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, tipo, fecha_evento, titulo)
);
CREATE INDEX IF NOT EXISTS idx_reminders_estado     ON reminders (estado);
CREATE INDEX IF NOT EXISTS idx_reminders_ventana    ON reminders (fecha_ventana);
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON reminders (patient_id);

-- ============================================================
-- S16 — Registro de notificaciones enviadas
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  canal       TEXT NOT NULL,
  destino     TEXT NOT NULL,
  estado      TEXT NOT NULL,
  detalle     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- S5 — Pacientes activos / inactivos
-- ============================================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients (active);

-- Exponer `active` en la vista del dashboard para filtrar activos
-- NOTA: CREATE OR REPLACE VIEW no permite insertar columnas en el medio,
-- por eso primero se elimina la vista (y luego se recrea completa).
DROP VIEW IF EXISTS dashboard_search;
CREATE VIEW dashboard_search AS
SELECT
  p.id            AS patient_id,
  p.nombre        AS patient_nombre,
  p.especie,
  p.raza,
  p.photo_url,
  p.active,
  t.id            AS tutor_id,
  t.nombre        AS tutor_nombre,
  t.cedula        AS tutor_cedula,
  t.telefono      AS tutor_telefono,
  mr.id           AS record_id,
  mr.numero_historia,
  mr.fecha_consulta,
  mr.motivo_consulta
FROM patients p
JOIN tutors t         ON p.tutor_id = t.id
LEFT JOIN medical_records mr ON mr.patient_id = p.id
ORDER BY mr.fecha_consulta DESC NULLS LAST;
