# S31 — Quitar el campo "Lote" del registro de vacunas

**Prioridad:** baja · **Rama:** directo a `main`

## Objetivo
Eliminar el campo **Lote** del flujo de vacunas: no se usa en la operación y
agrega fricción. Se quita de la UI (editor, lista, reporte), conservando la
columna en BD para no perder datos históricos.

## Contexto
- Editor: `components/VaccinationsSection.tsx:150-152` (input "Lote" en grilla
  de 3 columnas Marca/Lote/Dosis).
- Lista de vacunas: `:116-118` muestra `{v.marca} · {v.lote}` cuando existen.
- Reporte imprimible: `app/patients/[id]/reporte/page.tsx:170` (cabecera
  "Marca / Lote") y `:179` (concatena `marca` y `lote`).
- El placeholder de anamnesis en la consulta también menciona Lote
  (`components/MedicalRecordForm.tsx:266`, texto libre "Vacunas (Fecha, Marca,
  Lote)") — ajustar el texto para no sugerir capturarlo.

## Cambios
- `components/VaccinationsSection.tsx`:
  - Quitar el `<Field label="Lote">` del editor (deja Marca y Dosis en grilla
    de 2 columnas).
  - En la tarjeta de la lista mostrar solo `marca`.
  - `EMPTY`/`fromVaccination` pueden conservar `lote: ''` en el estado local
    (inofensivo) o limpiarlo; el tipo lo mantiene opcional.
- `app/patients/[id]/reporte/page.tsx`:
  - Cabecera "Marca / Lote" → "Marca"; celda muestra solo `v.marca`.
- `components/MedicalRecordForm.tsx:266`:
  - Label "Vacunas (Fecha, Marca, Lote)" → "Vacunas (Fecha, Marca)".

### Sin cambios
- `types/index.ts`: `Vaccination.lote?: string` se conserva (legacy).
- BD: no se elimina la columna.

## Criterios de aceptación
- [ ] El editor de vacuna no muestra Lote.
- [ ] La lista y el reporte no muestran Lote (solo Marca).
- [ ] Registros históricos con lote siguen existiendo en BD y no rompen la UI.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Registrar una vacuna → no aparece el campo Lote; guarda OK.
2. Ver el reporte imprimible → columna "Marca" sin lote.
3. Revisar una vacuna vieja que tenía lote → se ve y edita sin problema.
