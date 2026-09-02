# S24 — Botón "Guardar" invisible en mobile (fichas y consultas)

**Prioridad:** alta · **Rama:** directo a `main` · **Cubre reportes:** "no aparece botón de registrar/guardar nuevo paciente en mobile" y "nueva consulta no tiene el botón para guardar"

## Objetivo
Que el botón de guardado de los **formularios de página completa** sea visible
y operable en pantallas móviles:
- `components/PatientForm.tsx` ("Registrar Paciente" / "Guardar Cambios").
- `components/MedicalRecordForm.tsx` ("Guardar Historia Clínica").

## Causa raíz (verificada en código)
Ambos formularios usan un **footer fijo**:
- `PatientForm.tsx:242` → `fixed bottom-0 left-0 right-0 z-40 ... md:left-16 lg:left-64`.
- `MedicalRecordForm.tsx:406` → `fixed bottom-0 left-0 right-0 z-40`.

La **bottom nav de mobile** (`components/AppShell.tsx:129`) también es
`fixed bottom-0 ... z-40` y **aparece después en el DOM** (`<nav>` es hermano
posterior a `<main>`, que contiene el footer). Con igual `z-index`, el
navegador pinta encima al elemento posterior → en `< md` la nav (alto ~72px +
`safe-area`) **tapa el footer completo** → el botón de guardar no se ve ni se
puede tocar.

Los modales (citas, vacunas, exámenes…) no sufren porque usan `z-50` y son
bottom-sheets sobre la nav.

## Enfoque
**Opción A (recomendada):** ocultar la bottom nav en las rutas de formulario
de página completa, dejando el footer fijo en `bottom-0` (ya funciona en
desktop). Las rutas afectadas tienen header propio con botón "‹" para volver,
por lo que la nav no se pierde:
- `/patients/new`
- `/patients/[id]/edit`
- `/records/new`
- `/records/[id]` en modo edición (toggle `view`/`edit`)

**Opción B (alternativa si se prefiere conservar la nav):** desplazar los
footers fijos por encima de la nav en mobile usando una clase compartida, p. ej.
`bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-0` (y su
contraparte en el padding inferior del contenido `pb-*`), centralizando la
altura de la nav en una constante/`h-[--bottom-nav]`.

Implementar A. Si tras probar en dispositivo el negocio quiere conservar la
bottom nav también en esos formularios, aplicar B como refinamiento (no en
este spec).

## Cambios

### `components/AppShell.tsx`
- Calcular si la ruta es "formulario de página completa" con `usePathname()`.
- En la bottom nav (`md:hidden`): `hidden` (no render) cuando esté en esas
  rutas, y agregar a `<main>` el padding inferior correcto en cada caso
  (hoy `pb-20 md:pb-0`); en rutas de formulario mobile sin nav el contenido
  necesita `pb-*` suficiente para el footer fijo (los formularios ya agregan
  `pb-24`/`pb-28` propios; validar que alcance).

### `components/PatientForm.tsx`
- Sin cambios de estructurales mayores; verificar que con la nav oculta el
  footer queda visible (`md:left-16 lg:left-64` ya contempla sidebars).

### `components/MedicalRecordForm.tsx`
- Al quedar sin nav en mobile, el footer `fixed bottom-0` debe respetar los
  sidebars en `md`/`lg` (hoy NO tiene `md:left-16 lg:left-64`, a diferencia de
  PatientForm). Agregarle los mismos offsets para que en tablet/desktop no se
  meta debajo del sidebar.

## Criterios de aceptación
- [ ] En móvil (<768px): al crear/editar paciente se ve "Registrar Paciente"
      o "Guardar Cambios" arriba de todo, operable.
- [ ] En móvil: al crear/editar una historia clínica se ve "Guardar Historia
      Clínica".
- [ ] En desktop/tablet los footers quedan alineados a la derecha del sidebar
      (no bajo él).
- [ ] Los modales de las secciones siguen funcionando (no afectados).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. `npm run dev`, DevTools en vista móvil (375x667).
2. `/patients/new` → confirmar botón visible + guardado correcto.
3. `/patients/:id/edit`, `/records/new?patientId=...`, `/records/:id` en modo
   edición.
4. Repetir en ancho desktop (1440) y tablet (768/1024) → botones alineados.
5. Probar en un teléfono real (Chrome/Android y Safari/iOS) por si el teclado
   virtual o el safe-area interfieren; ajustar el padding inferior si hace falta.
