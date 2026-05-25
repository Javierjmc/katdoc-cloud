-- ============================================================
-- VETCARE PRO — Esquema Completo de Base de Datos
-- Supabase / PostgreSQL
-- ============================================================

-- Habilitar extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: tutors (Propietarios / Clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS tutors (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        TEXT        NOT NULL,
  cedula        TEXT        NOT NULL,
  direccion     TEXT,
  telefono      TEXT,
  email         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tutors_cedula_unique UNIQUE (cedula)
);

-- Índices para búsquedas frecuentes en el dashboard
CREATE INDEX idx_tutors_cedula  ON tutors (cedula);
CREATE INDEX idx_tutors_nombre  ON tutors (nombre);
CREATE INDEX idx_tutors_email   ON tutors (email);

-- ============================================================
-- TABLA: patients (Pacientes / Mascotas)
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id          UUID        NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
  nombre            TEXT        NOT NULL,
  especie           TEXT        NOT NULL,   -- Ej: 'Canino', 'Felino', 'Exótico'
  raza              TEXT,
  fecha_nacimiento  DATE,
  color             TEXT,
  sexo              TEXT,                   -- 'Macho', 'Hembra'
  photo_url         TEXT,                   -- URL pública en Supabase Storage (bucket: pet-photos)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_tutor_id ON patients (tutor_id);
CREATE INDEX idx_patients_nombre   ON patients (nombre);
CREATE INDEX idx_patients_especie  ON patients (especie);

-- ============================================================
-- TABLA: medical_records (Historias Clínicas)
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_records (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id              UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  numero_historia         TEXT        NOT NULL,
  fecha_consulta          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ─── Sección: Anamnésicos ───────────────────────────────
  ultima_desparasitacion  TEXT,         -- "Fecha: XX/XX | Producto: Ivermectina"
  vacunas                 TEXT,         -- "Fecha: XX/XX | Marca: Y | Lote: Z"
  enfermedades_anteriores TEXT,
  tratamientos_actuales   TEXT,
  evolucion               TEXT,
  alimentacion            TEXT,
  historial_reproductivo  TEXT,         -- 'Entero', 'Esterilizado'
  ultimo_celo             TEXT,
  fecha_ultimo_parto      TEXT,

  -- ─── Sección: Motivo de Consulta ────────────────────────
  motivo_consulta         TEXT,

  -- ─── Sección: Examen Clínico / Constantes Vitales ───────
  f_respiratoria          TEXT,         -- frpm (texto para permitir rangos)
  f_cardiaca              TEXT,         -- fcpm
  temperatura             NUMERIC(4,1), -- °C
  pulso                   TEXT,
  tiempo_llenado_capilar  TEXT,
  ganglios_linfaticos     TEXT,
  mucosas                 TEXT,
  actitud_temperamento    TEXT,         -- 'Alerta', 'Letárgico', 'Estuporoso', 'Comatoso', 'Otro'

  -- ─── Sección: Órganos y Sistemas ────────────────────────
  --
  -- DECISIÓN DE DISEÑO: JSONB vs columnas separadas
  --
  -- Usamos JSONB porque:
  -- 1. MODULARIDAD: añadir un nuevo sistema (ej: "Endocrino") solo requiere
  --    actualizar el array de configuración en el frontend. Cero migraciones SQL.
  -- 2. COMPACIDAD: 12 campos de estado caben en un solo campo sin columnas dispersas.
  -- 3. RENDIMIENTO: PostgreSQL indexa JSONB con GIN, lo que permite búsquedas
  --    eficientes dentro del JSON si fuera necesario en el futuro.
  -- 4. FLEXIBILIDAD: El schema JSON puede evolucionar (añadir notas por sistema)
  --    sin afectar otras columnas.
  --
  -- Estructura esperada del JSON:
  -- {
  --   "estado_general":     "N",   -- N | AN | NE
  --   "hidratacion":        "N",
  --   "tegumentario":       "AN",
  --   "ojos":               "NE",
  --   "oidos":              "N",
  --   "nariz":              "N",
  --   "digestivo":          "AN",
  --   "respiratorio":       "N",
  --   "nervioso":           "N",
  --   "musculoesqueletico": "N",
  --   "cardiovascular":     "N",
  --   "genitourinario":     "NE"
  -- }
  sistemas_status         JSONB,

  descripcion_hallazgos   TEXT,         -- Detalle libre de hallazgos anormales

  -- ─── Adjuntos ────────────────────────────────────────────
  document_url            TEXT,         -- URL al PDF en bucket: medical-documents

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_records_patient_id     ON medical_records (patient_id);
CREATE INDEX idx_medical_records_numero_historia ON medical_records (numero_historia);
CREATE INDEX idx_medical_records_fecha_consulta  ON medical_records (fecha_consulta DESC);

-- Índice GIN sobre JSONB para búsquedas dentro del campo de sistemas
CREATE INDEX idx_medical_records_sistemas ON medical_records USING GIN (sistemas_status);

-- ============================================================
-- VISTA ÚTIL: Búsqueda global del dashboard
-- Devuelve datos combinados para la tabla principal
-- ============================================================
CREATE OR REPLACE VIEW dashboard_search AS
SELECT
  p.id            AS patient_id,
  p.nombre        AS patient_nombre,
  p.especie,
  p.raza,
  p.photo_url,
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

-- ============================================================
-- FUNCIÓN: Auto-generar número de historia correlativo
-- Formato: HC-YYYY-NNNN (ej: HC-2025-0042)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_numero_historia()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  count_this_year INT;
BEGIN
  SELECT COUNT(*) INTO count_this_year
  FROM medical_records
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'HC-' || current_year || '-' || LPAD((count_this_year + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STORAGE: Políticas RLS para Buckets
-- (Ejecutar en Supabase Dashboard → Storage → Policies)
-- ============================================================

-- Bucket: pet-photos
-- Permitir SELECT (lectura) público
-- En Supabase UI: Storage → pet-photos → Policies → New policy
-- SQL equivalente:
/*
CREATE POLICY "Public read pet photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'pet-photos' );

CREATE POLICY "Authenticated insert pet photos"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'pet-photos' );

CREATE POLICY "Authenticated update pet photos"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'pet-photos' );
*/

-- Bucket: medical-documents
/*
CREATE POLICY "Public read medical documents"
ON storage.objects FOR SELECT
USING ( bucket_id = 'medical-documents' );

CREATE POLICY "Authenticated insert medical documents"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'medical-documents' );
*/
