# S41 — Fecha de nacimiento obligatoria (solo pacientes nuevos)

**Prioridad:** alta · **Rama:** `feat/<dev>/s41-fecha-nacimiento-obligatoria` · **Toca:** formulario de paciente, validación

## Objetivo
Que al **registrar un paciente nuevo** la **fecha de nacimiento** sea obligatoria,
con su asterisco visible en el formulario. Los pacientes **ya creados** quedan
como están: no se les exige ni se les fuerza a completarla al editarlos.

## Contexto / causa raíz
- La UI no marca el campo como requerido: `components/PatientForm.tsx:367`
  (`<Field label="Fecha de nacimiento">` sin `required`).
- El esquema la trata como opcional y acepta vacío:
  `lib/schemas.ts:25-28` (`.optional().or(z.literal(''))`).
- La columna es nullable y **no se toca**:
  `patients.fecha_nacimiento DATE` (`supabase_schema.sql:38`). No hay migración.
- Decisión de negocio: obligatoria **solo a partir de ahora**. No backfill, no
  `NOT NULL`.

## Enfoque
Separar la validación de **creación** de la de **edición** sin duplicar toda la
lógica de paciente/tutor.

## Cambios

### `lib/schemas.ts`
- Nuevo `patientCreateSchema`, derivado de `patientSchema`, que reemplaza
  `fecha_nacimiento` por una versión **requerida**:
  - string no vacío,
  - `Date.parse` válido,
  - **no futura** (comparar contra `hoyLocal()` de `lib/utils.ts`).
- Mantener `patientSchema` (opcional) intacto para edición/legados.
- Nuevo `patientFormCreateSchema = z.object({ tutor: tutorSchema, patient: patientCreateSchema })`.
- Mensajes claros: `'La fecha de nacimiento es obligatoria'` y
  `'La fecha de nacimiento no puede ser futura'`.

### `components/PatientForm.tsx`
- `validate()`: usar `patientFormCreateSchema` cuando `!isEditing` y
  `patientFormSchema` cuando `isEditing`.
- `Field` de fecha (`:367`): `required={!isEditing}` → asterisco solo al crear.
- No tocar el payload de guardado (`handleSave`): en edición siguen viajando los
  datos tal cual, sin exigir la fecha.

### `app/patients/[id]/edit/page.tsx` / `app/patients/new/page.tsx`
- Sin cambios: ambos usan `PatientForm`; la diferencia la resuelve `isEditing`.

## Criterios de aceptación
- [ ] Registro nuevo: el campo muestra asterisco y **bloquea el guardado** si
      está vacío, con mensaje de error en el campo.
- [ ] Fecha futura en un paciente nuevo → error `'no puede ser futura'`.
- [ ] Editar un paciente legacy **sin** fecha → se puede guardar igual.
- [ ] Editar un paciente **con** fecha → se valida el formato si se modifica.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. `/patients/new` → intentar guardar sin fecha → error visible; con fecha de hoy
   → guarda.
2. Fecha de mañana → error de fecha futura.
3. Abrir un paciente existente sin fecha (`/patients/<id>/edit`) → guardar sin
   tocarla → guarda.
4. Confirmar que la fecha sigue mostrándose en el perfil/reporte
   (`calcularEdad` en `app/patients/[id]/page.tsx:110` y
   `app/patients/[id]/reporte/page.tsx:129`).

## Fuera de alcance
- Migración `NOT NULL` / backfill de legados.
