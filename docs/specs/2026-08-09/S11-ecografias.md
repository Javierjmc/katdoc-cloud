# S11 — Ecografías editables

**Fase:** 2 · **Prioridad:** media · **Rama:** `feat/javier/ecografias`

## Objetivo
Registrar **ecografías** por paciente: imágenes adjuntas y un reporte de hallazgos
**editable** (no solo texto libre, sino secciones estructuradas).

## Diseño de datos

### Migración SQL (parte de S19)
```sql
CREATE TABLE IF NOT EXISTS ecografias (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id    UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  fecha        DATE DEFAULT CURRENT_DATE,
  organo       TEXT,          -- 'Abdomen', 'Cardíaca', 'Tiroides', ...
  hallazgos    TEXT,          -- descripción editable libre
  conclusiones TEXT,          -- conclusión / diagnóstico
  mediciones   JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "nombre": "Grosor pared vesical", "valor": "2.1", "unidad": "mm" }]
  imagenes     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- URLs en storage
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ecografias_patient_id ON ecografias (patient_id);
```

### Bucket de storage
Bucket `ecografias` (público de lectura) — crear en Supabase y reflejar políticas
en S19.

## Cambios

### `types/index.ts`
- `EcografiaMedicion`, `EcografiaImagen`, `Ecografia`.

### Hook `hooks/useEcografias.ts` (nuevo)
- `useEcografias(patientId)` + CRUD + upload de imágenes a storage.

### `lib/supabase.ts`
- Helper `uploadEcografiaImage(file, ecografiaId, idx)` → bucket `ecografias`,
  ruta `<id>/<idx>.<ext>`.

### `components/EcografiasSection.tsx` (nuevo)
- Lista de ecografías (fecha DESC) con miniaturas de imágenes.
- Editor: fecha, órgano, hallazgos (textarea), conclusiones (textarea), mediciones
  (tabla editable dinámica), galería de imágenes (multi-upload con preview y
  eliminación).
- Vista de detalle + botón imprimir (se integra con S12 reporte).

### Integración
- `app/patients/[id]/page.tsx`: sección "Ecografías".

## Criterios de aceptación
- [ ] Crear/editar ecografía con imágenes, hallazgos, conclusiones y mediciones.
- [ ] Las imágenes se suben al bucket y se muestran.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Crear ecografía abdominal con 2 imágenes y 3 mediciones → guardar.
2. Abrir detalle → ver galería y datos.
3. Editar hallazgos → guardar → confirmar persistencia.
