# S10 — Recetas (prescripciones) editables + envío

**Fase:** 2 · **Prioridad:** media · **Rama:** `feat/javier/recetas`

## Objetivo
Crear **recetas** (prescripciones) editables por paciente, con uno o varios
medicamentos, y poder **enviarlas** al cliente por WhatsApp (link wa.me) o imprimirlas.

## Diseño de datos

### Migración SQL (parte de S19)
```sql
CREATE TABLE IF NOT EXISTS prescriptions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_id     UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  titulo        TEXT DEFAULT 'Receta',
  fecha         DATE DEFAULT CURRENT_DATE,
  medicamentos  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "nombre": "Amoxicilina 500mg", "presentacion": "Comprimidos",
  --    "dosis": "1 comprimido", "frecuencia": "cada 8 horas",
  --    "duracion": "7 días", "via": "Oral", "indicaciones": "Con alimentos" }]
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions (patient_id);
```

## Cambios

### `types/index.ts`
- `PrescriptionMedication` y `Prescription` (campos de la tabla).

### Hook `hooks/usePrescriptions.ts` (nuevo)
- `usePrescriptions(patientId)` + CRUD.

### `components/PrescriptionsSection.tsx` (nuevo)
- Lista de recetas del paciente (fecha DESC).
- Editor de receta: título, fecha, lista dinámica de medicamentos (nombre,
  presentación, dosis, frecuencia, duración, vía, indicaciones) con agregar/quitar
  filas, y notas.
- Acciones por receta:
  - **Enviar por WhatsApp** → `https://wa.me/<tutor.telefono>?text=<receta formateada>`
    (abre en pestaña nueva; el staff confirma el envío).
  - **Imprimir** → vista de receta limpia + `window.print()` con `@media print`.
  - Editar / Eliminar (`ConfirmDialog`).

### Formateo del mensaje WhatsApp
```
📋 RECETA — <nombre paciente>
📅 <fecha>
🩺 <titulo>

1) Amoxicilina 500mg
   Dosis: 1 comprimido · cada 8 horas
   Duración: 7 días · Vía: Oral
   Indicaciones: Con alimentos

Notas: ...
```
Codificar con `encodeURIComponent`.

### Integración
- `app/patients/[id]/page.tsx`: sección "Recetas".

## Criterios de aceptación
- [ ] Crear/editar recetas con varios medicamentos.
- [ ] El link de WhatsApp incluye el teléfono del tutor (formato internacional
      `58...`) y la receta formateada.
- [ ] Imprimir genera una vista limpia.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Crear receta de 2 medicamentos → guardar → listar.
2. Tocar "Enviar por WhatsApp" → se abre wa.me con el texto completo.
3. Tocar "Imprimir" → vista de impresión correcta.
