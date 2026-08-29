# S2 — Último celo y último parto solo para hembras

**Fase:** 0 · **Prioridad:** alta · **Rama:** `feat/javier/celo-parto-hembras`

## Objetivo
Los campos `Último Celo` y `Último Parto` son exclusivos de pacientes hembra. Para
pacientes macho deben ocultarse y **no guardarse** en la base de datos.

## Contexto técnico
`MedicalRecordForm` recibe solo `patientId` y no conoce el sexo del paciente
(`MedicalRecordForm.tsx:198-203` siempre renderiza ambos campos). Se resolverá
pasando el sexo como prop desde las páginas que ya cargan el paciente.

## Cambios

### `components/MedicalRecordForm.tsx`
- Nueva prop `sexo?: string` en `MedicalRecordFormProps`.
- Constante `esHembra = sexo === 'Hembra'`.
- Ocultar los fields `Último Celo` y `Último Parto` cuando `!esHembra`.
  Mostrar en su lugar una nota sutil: `"Campos de celo/parto solo aplican a hembras"`.
- Al guardar, si `!esHembra`, forzar `payload.ultimo_celo = undefined` y
  `payload.fecha_ultimo_parto = undefined` (no escribir nada en BD). Si se está
  **editando** un macho que tenía datos previos, limpiarlos con `.update({ ultimo_celo: null, fecha_ultimo_parto: null })`.

### Páginas que usan el form (pasan `sexo`)
- `app/records/new/page.tsx`: `NewRecordContent` ya carga `patient` vía
  `usePatient(patientId)` → pasar `sexo={patient?.sexo}`.
- `app/records/[id]/page.tsx`: `record.patient` viene expandido por
  `useMedicalRecord` (`patient:patients(*, tutor:tutors(*))`) → pasar
  `sexo={record.patient?.sexo}`.

### `types/index.ts`
- No requiere cambios de schema. El campo sigue existiendo como `TEXT` (puede
  contener datos históricos de hembras).

## Criterios de aceptación
- [ ] Crear/editar historia de paciente **macho**: los campos no aparecen y no se
      persisten (ni siquiera vacíos).
- [ ] Crear/editar historia de **hembra**: los campos se muestran y guardan normal.
- [ ] Al editar un macho que tenía `ultimo_celo`/`fecha_ultimo_parto` de antes, esos
      datos se limpian en BD.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Desde `/patients` abrir un macho (ej: Max) → `+ Consulta` → confirmar que no
   aparecen los campos.
2. Guardar y revisar la historia en `/records/[id]` → no debe mostrar celo/parto.
3. Repetir con una hembra (ej: Luna) → campos presentes y guardados.
