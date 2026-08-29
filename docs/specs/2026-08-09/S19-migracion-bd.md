# S19 — Migración de base de datos consolidada (idempotente)

**Fase:** 4 · **Prioridad:** media · **Rama:** incluye migraciones de S3-S16

## Objetivo
Entregar un único archivo SQL **idempotente** con todos los cambios de schema y
datos del ciclo, para aplicar en el Supabase SQL Editor. Se construye incrementalmente
en cada spec y se consolida aquí.

## Contenido del archivo `migrations/YYYYMMDD_katdoc_v2.sql`

### 1. Columnas nuevas
```sql
ALTER TABLE patients       ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS sistemas_notas JSONB;
```

### 2. Tablas nuevas
- `vaccinations` (S7)
- `laboratory_exams` (S8)
- `prescriptions` (S10)
- `ecografias` (S11)
- `notification_config` (S13) + inserts de presets
- `reminders` (S14)
- `notification_log` (S16)

> DDL completos tomados de cada spec. Todo con `CREATE TABLE IF NOT EXISTS` y
> `CREATE INDEX IF NOT EXISTS`.

### 3. Limpieza de datos
```sql
UPDATE medical_records
SET historial_reproductivo = 'Esterilizado/a'
WHERE historial_reproductivo = 'Castrado/a';

UPDATE patients
SET active = TRUE
WHERE active IS NULL;
```

### 4. Backfill de vacunas desde texto libre (S7)
- Script PL/pgSQL que parsea `medical_records.vacunas` y `ultima_desparasitacion`
  (regex de fecha `dd/mm/yyyy` o `yyyy-mm-dd`, separador `—`/`-`) e inserta en
  `vaccinations` con `ON CONFLICT DO NOTHING`.
- Idempotente: controlado por `record_id + vacuna + fecha_aplicacion`.
- Las filas no parseables se conservan en el campo legacy (no se borran).

### 5. Vista `dashboard_search` actualizada
- Exponer `p.active` para que el dashboard filtre activos (S5):
  ```sql
  CREATE OR REPLACE VIEW dashboard_search AS SELECT ..., p.active, ...
  ```

### 6. Storage buckets y políticas
```sql
-- Buckets: lab-exams, ecografias (crear en Dashboard si no existen)
CREATE POLICY "Public read lab-exams"      ON storage.objects FOR SELECT USING (bucket_id = 'lab-exams');
CREATE POLICY "Client insert lab-exams"    ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lab-exams');
CREATE POLICY "Public read ecografias"     ON storage.objects FOR SELECT USING (bucket_id = 'ecografias');
CREATE POLICY "Client insert ecografias"   ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ecografias');
```

## Aplicación
1. Copiar el archivo al Supabase SQL Editor.
2. Ejecutar **todo el script** (es idempotente; puede re-ejecutarse).
3. Verificar con los checks de cada spec (counts).

## Criterios de aceptación
- [ ] El script se ejecuta de corrido sin errores.
- [ ] Re-ejecutar el script completo no produce errores ni duplica datos.
- [ ] `select relrowsecurity ...` documentado (hallazgo de S6).
- [ ] Los checks por spec pasan (count de `Castrado/a` = 0, filas de backfill, etc.).

## Verificación
1. Correr el script → sin errores.
2. Correrlo dos veces → sin errores y sin duplicados.
3. Revisar el backfill de vacunas sobre los datos seed.
