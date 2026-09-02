# S22 — Autocompletar tutor en "Nuevo Paciente" + teléfono con prefijo +58

**Prioridad:** alta · **Rama:** directo a `main` · **Depende:** S23 (duplicidad)

## Objetivo
- En el formulario de nuevo paciente, al escribir el **nombre o cédula del
  propietario**, sugerir tutores ya registrados (autocompletar) para no crear
  duplicados y ahorrar tipeo.
- El campo **Teléfono** arranca con el prefijo **+58** (Venezuela) para que
  los enlaces de WhatsApp funcionen sin pasos extra.

## Contexto
`components/PatientForm.tsx` pide tutor con campos de texto libres y sin
sugerencias. El teléfono hoy tiene placeholder `0412-000-0000` sin prefijo.
`normalizePhoneForWhatsApp` (`lib/utils.ts:54`) ya acepta formatos `+58...`,
`0412...`, `58...` y `0058...`, por lo que guardar `+58 412 0000000` funciona.

## Cambios

### `components/PatientForm.tsx`
- Cargar tutores existentes (hasta ~100, ordenados por nombre) al montar:
  `supabase.from('tutors').select('id, nombre, cedula, telefono, email, direccion').order('nombre')`.
- En el campo **Nombre completo** agregar autocompletar con `<datalist>`
  (nativo, sin librerías) cuyo `option` sea `"{nombre} — V-{cedula}"`. Al
  seleccionar una sugerencia, o al detectar cédula existente al salir del
  campo:
  - Rellenar **todos** los datos del tutor (cédula, teléfono, email, dirección).
  - Guardar internamente `tutorId` y marcar el formulario como
    "tutor existente" (bloquear edición de cédula, o mostrar aviso de que se
    actualizarán sus datos si se editan —ver S23).
  - El paciente se crea con `createPatientWithTutor(..., { tutorId })`.
- Campo Teléfono:
  - Prefijo visual fijo `+58` y valor editable sin país (ej. `412-000-0000`).
  - Implementación mínima sugerida: un estado `telefono` que guarda `+58 ` +
    dígitos; a la hora de guardar se normaliza con `normalizePhoneForWhatsApp`.
  - Texto de ayuda: "Formato: 412-1234567 · se usará para WhatsApp".
  - `type="tel"`, `inputMode="tel"`.
- Reutilizar la búsqueda de cédula de S23 (`findTutorByCedula`) para pre-rellenar.

### `lib/schemas.ts`
- `tutorSchema.telefono`: validación que acepte dígitos/espacios/guiones y `+`
  (max 20), con mensaje amigable.

### No tocar
- `hooks/usePatients.ts` (la duplicidad/vinculación se resuelve en S23).

## Criterios de aceptación
- [ ] Escribir un nombre/cédula de un tutor existente muestra sugerencias y,
      al elegir, rellena cédula, teléfono y email.
- [ ] El teléfono muestra siempre `+58` como base y el guardado persiste un
      teléfono que WhatsApp reconoce (el enlace wa.me funciona).
- [ ] Al guardar con un tutor elegido del autocompletar **no** se crea un tutor
      duplicado (queda ligado al existente).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Ir a `/patients/new`, escribir "Mar" → aparecen Marías existentes.
2. Seleccionar una → se rellenan cédula/teléfono y queda "tutor existente".
3. Guardar → el paciente aparece bajo ese tutor en `/tutors`, sin duplicado.
4. Guardar un paciente nuevo completo con teléfono `412-...` y probar un
   "Enviar por WhatsApp" de receta → abre `wa.me/58412...`.
