# S1 — Examen clínico: selects con default + quitar "Estuporoso"

**Fase:** 0 · **Prioridad:** alta · **Rama:** `feat/javier/examen-clinico-selects`

## Objetivo
Convertir `Pulso`, `Ganglios Linfáticos` y `Mucosas` de inputs de texto libre a selects
con opciones estándar y un valor por defecto (marcado con `*`), y eliminar `Estuporoso`
de las opciones de Actitud/Temperamento.

## Especificación clínica
- **Pulso** → seleccionable: `Fuerte*` (default), `Regular`.
- **Ganglios Linfáticos** → `Reactivos`, `No reactivos*` (default), `No palpable`.
- **Mucosas** → `Rosadas y húmedas*` (default), `Rosadas y secas`, `Cianóticas`,
  `Ictéricas`, `Pálidas y húmedas`, `Pálidas y secas`.
- **Actitud/Temperamento** → quitar `Estuporoso`. Queda: Alerta, Letárgico, Comatoso,
  Hiperactivo, Agresivo, Ansioso, Otro.

## Consideración de datos legacy
Los registros existentes contienen valores libres (ej: pulso `Fuerte y regular`,
mucosas `Rosadas húmedas`, `Pálidas`, ganglios `No palpables`, `Palpables aumentados
axilares`). Al **editar** una historia con un valor legacy que no está en las opciones
nuevas, el select debe mostrar una opción adicional dinámica `Otro: <valor legacy>`
para **no perder datos**. Los registros nuevos usan solo las opciones estándar.

## Cambios

### `types/index.ts`
- Quitar `'Estuporoso'` de `ACTITUD_OPTIONS`.
- Agregar constantes tipadas:
  - `PULSO_OPTIONS = ['Fuerte', 'Regular'] as const` + `PULSO_DEFAULT = 'Fuerte'`.
  - `GANGLIOS_OPTIONS = ['Reactivos', 'No reactivos', 'No palpable'] as const`
    + `GANGLIOS_DEFAULT = 'No reactivos'`.
  - `MUCOSAS_OPTIONS = ['Rosadas y húmedas', 'Rosadas y secas', 'Cianóticas', 'Ictéricas', 'Pálidas y húmedas', 'Pálidas y secas'] as const`
    + `MUCOSAS_DEFAULT = 'Rosadas y húmedas'`.

### `components/MedicalRecordForm.tsx`
- Estado inicial del form:
  - `pulso: existingRecord?.pulso ?? PULSO_DEFAULT`
  - `ganglios_linfaticos: existingRecord?.ganglios_linfaticos ?? GANGLIOS_DEFAULT`
  - `mucosas: existingRecord?.mucosas ?? MUCOSAS_DEFAULT`
- Reemplazar los 3 `<Input>` por un `<Select>` reutilizable con helper
  `buildOptions(lista, valorLegacy?)` que agrega `Otro: <valorLegacy>` cuando
  el valor existente no está en la lista.
- `ACTITUD_OPTIONS` ya se usa en el select de actitud; solo se actualiza la lista.

### Nota visual
Los labels deben incluir el default sugerido (ej: label `Pulso (Fuerte por defecto)`).

## Criterios de aceptación
- [ ] Nuevo registro: Pulso/Ganglios/Mucosas inician con el valor default `*`.
- [ ] Editar registro con valor legacy fuera de las opciones: el valor se conserva
      como opción `Otro: <valor>` y queda seleccionado.
- [ ] `Estuporoso` ya no aparece en Actitud.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. `npm run dev` → crear una consulta nueva y revisar los 3 selects + defaults.
2. Editar una historia existente con `mucosas = 'Rosadas húmedas'` (seed) y confirmar
   que el select muestra `Otro: Rosadas húmedas` seleccionado.
3. Confirmar en el select de actitud que no está `Estuporoso`.
