# S23 — Duplicidad de tutores: aviso + opción de vincular

**Prioridad:** alta · **Rama:** directo a `main` · **Depende de:** S22 (autocompletar)

## Objetivo
Cuando al registrar un paciente se escribe una **cédula que ya pertenece a un
tutor**, NO crear otro tutor duplicado en silencio: mostrar un aviso claro con
los datos del existente y permitir **"Usar ese tutor"** (agregar la mascota a
su ficha) o corregir la cédula.

## Contexto / problema
`createPatientWithTutor` (`hooks/usePatients.ts:81-127`) hoy:
1. Si llega `tutorId` explícito (desde `/tutors`) lo usa directo.
2. Si no, busca por cédula **y si existe lo reutiliza en silencio**
   (`:95-102`): el usuario nunca se entera de que ya existía el tutor, y si la
   cédula tipeada no coincide exactamente (o el operador inventa una variante)
   se termina generando un duplicado.
3. Solo crea tutor nuevo si no encontró cédula.

Resultado: tutores duplicados con variantes de cédula y sin feedback.

## Enfoque
Decisión de producto (confirmada): **bloquear con aviso** y ofrecer vincular.
Flujo propuesto en `PatientForm.handleSave`:

1. Si el tutor no viene prefijado/vinculado (`!tutorLocked`), y hay cédula:
   - `findTutorByCedula(cedula)` (helper nuevo, normaliza trim+uppercase).
   - Si existe y `tutorId` no coincide → **no guardar**. Mostrar error inline
     (no solo toast):
     > ⚠️ Ya existe un tutor con esa cédula: **María González** (V-12345678)
     > 📞 0412-000-0000
     > [ Usar este tutor ] · [ Usar otra cédula ]
   - "Usar este tutor" → setea `tutorId`, rellena el resto de datos, desactiva
     la cédula (modo tutor-existente) y reintenta el guardado.
   - "Usar otra cédula" → enfoca el campo cédula y limpia el error.
2. Si no existe → crear tutor + paciente como hoy.
3. Si viene `tutorId` por URL (desde página de tutores) → sin cambios.

## Cambios

### `hooks/usePatients.ts`
- Exportar `findTutorByCedula(cedula)` que devuelve el tutor completo
  (`select *`) o `null` (usa `.maybeSingle()`).
- Opcional: `createPatientWithTutor` acepta un flag `strict` para que quien lo
  llame decida, pero **no** es necesario si la UI ya resuelve antes (la UI
  siempre llama con `tutorId` resuelto).

### `components/PatientForm.tsx`
- Nuevo estado: `duplicateTutor: Tutor | null`.
- En `handleSave`, antes de `createPatientWithTutor`, ejecutar la lógica de
  detección (punto 1) cuando corresponda.
- Nuevo bloque de UI bajo los campos del propietario con `DuplicateTutorCard`
  (botones "Usar este tutor" / "Usar otra cédula").
- Estado `tutorLocked`/`selectedTutorId` compartido con S22 para que el
  autocompletar también marque "tutor existente".

## Criterios de aceptación
- [ ] Registrar paciente con cédula de tutor existente → aparece el aviso con
      nombre/cédula/teléfono y NO se guarda solo.
- [ ] "Usar este tutor" → guarda el paciente ligado a ese tutor (1 sola ficha
      de tutor, sin duplicado).
- [ ] "Usar otra cédula" → vuelve a validar con la cédula corregida.
- [ ] Desde `/tutors` (tutor prefijado) no aparece el aviso (ya está resuelto).
- [ ] La cédula con mayúsculas/minúsculas/espacios sigue detectándose
      (normalización).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Cédula `V-12345678` existente → intentar crear paciente con la misma →
   aviso; "Usar este tutor" → mascota creada bajo ese tutor.
2. Contar tutores en `/tutors` antes y después → no aumentó.
3. Cédula inexistente → crea tutor nuevo normal.
4. Repetir flujo desde `/tutors` → no muestra aviso.
