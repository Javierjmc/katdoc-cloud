-- ============================================================
-- KATDOC — S33: normalizar fecha_consulta (timezone)
-- Los registros viejos se guardaron a medianoche UTC y en Venezuela
-- (UTC-4) se ven "el día anterior". Se corren a mediodía UTC para que
-- la fecha local coincida con la que marcó el operador.
-- Idempotente: solo toca filas exactas a las 00:00:00 UTC (las nuevas ya
-- se guardan a las 12:00:00 por código).
-- Aplicar en Supabase → SQL Editor.
-- ============================================================

UPDATE medical_records
SET fecha_consulta = fecha_consulta + INTERVAL '12 hours'
WHERE fecha_consulta IS NOT NULL
  AND fecha_consulta::time = '00:00:00';
