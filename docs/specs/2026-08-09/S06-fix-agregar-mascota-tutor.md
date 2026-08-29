# S6 — Fix: "Agregar mascota a un tutor" da error

**Fase:** 1 · **Prioridad:** alta · **Rama:** `fix/javier/agregar-mascota-tutor`

## Síntoma
Desde `Tutores → + Agregar mascota`, al guardar se produce un error (falla la
creación de la mascota).

## Análisis de causa raíz
En `hooks/usePatients.ts:78-116`, `createPatientWithTutor`:

1. Ignora el `tutorId` que ya llega por la URL (`patients/new?tutorId=...`).
2. Localiza al tutor **solo por cédula** con `eq('cedula', valor)`:
   - Comparación **case-sensitive** y sin trim. Si el valor en BD difiere en
     mayúsculas/espacios (ej: `V-10234567` vs `v-10234567`), el `maybeSingle()`
     devuelve `null` → se intenta `INSERT` de un tutor duplicado → violación del
     `CONSTRAINT tutors_cedula_unique` → error "duplicate key value violates unique
     constraint".
3. El flujo no hace `encodeURIComponent` explícito (mitigado por `URLSearchParams`
   en `buildNewPetUrl`, pero conviene robustez adicional).

**Hipótesis principal:** fallo de coincidencia de cédula → intento de duplicado.
**A diagnosticar en el entorno real:** verificar también que RLS no esté habilitado
en `tutors`/`patients` con políticas ausentes (lo cual rompería solo este insert).

## Cambios

### `hooks/usePatients.ts` — `createPatientWithTutor`
- Nueva firma que acepta `tutorId?: string`:
  ```ts
  createPatientWithTutor(input, opts?: { tutorId?: string })
  ```
- **Flujo priorizado:**
  1. Si `opts.tutorId` existe → usarlo directamente (sin buscar por cédula).
  2. Si no, buscar por cédula **normalizada** (trim + uppercase):
     ```ts
     const cedula = (input.tutor.cedula ?? '').trim().toUpperCase();
     eq('cedula', cedula)
     ```
     y si no existe, insertar con la cédula normalizada.
- Devolver el error claro al UI (sin cambiar el contrato `{ patientId, error }`).

### `components/PatientForm.tsx`
- Pasar `tutorId` (desde `prefillTutor.id`) a `createPatientWithTutor`.

### `app/patients/new/page.tsx`
- `prefillTutor` ya expone `id` → asegurar que se propaga a `PatientForm`.

### Diagnóstico (paso 1 de la ejecución)
- Con acceso a Supabase (SQL editor), correr:
  ```sql
  SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('tutors','patients');
  ```
  - Si `relrowsecurity = true` y no hay políticas, es la causa → documentar en S19
    (habilitar políticas anon de lectura/escritura o desactivar RLS, decisión con dueño).
- Revisar si hay cédulas duplicadas con diferencias de formato:
  ```sql
  SELECT cedula, count(*) FROM tutors GROUP BY cedula HAVING count(*) > 1;
  ```

## Criterios de aceptación
- [ ] Agregar una mascota desde la página de Tutores funciona sin error.
- [ ] El `tutorId` de la URL se respeta (no se re-busca por cédula).
- [ ] Si una cédula ya existe, se reutiliza el tutor (sin duplicar).
- [ ] El resultado del diagnóstico RLS/duplicados queda documentado en el PR.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. `Tutores` → expandir tutor → `+ Agregar mascota` → completar → Guardar.
2. Verificar que la mascota aparece bajo ese tutor y que no se creó un tutor duplicado.
3. Repetir el flujo con cédula en minúsculas/espacios → debe funcionar igual.
