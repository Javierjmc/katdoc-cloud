# S36 — Perfil del paciente: Historial de consultas primero + secciones colapsables

**Prioridad:** media · **Rama:** directo a `main`

## Objetivo
En la ficha del paciente:
1. Que el **Historial de Consultas** sea lo primero (hoy las Citas aparecen
   antes y empujan el historial muy abajo).
2. Que las secciones clínicas (Citas, Vacunas, Exámenes, Recipe, Ecografías)
   sean **colapsables/desplegables** para que no ocupen todo el scroll ni se
   pisen entre sí.

## Contexto
`app/patients/[id]/page.tsx` columna derecha (`:152-204`) ordena:
`AppointmentsSection` → `VaccinationsSection` → `LabExamsSection` →
`PrescriptionsSection` → `EcografiasSection` → (bloque "Historial de
Consultas"). Ninguna sección es colapsable; con varios registros la página se
hace kilométrica y el historial (lo más consultado) queda al final.

## Enfoque

### Orden
1. Bloque **"Historial de Consultas"** (cards con link a `/records/[id]`).
2. Luego las secciones clínicas.

### Colapsables
Cada sección clínica tiene hoy su propio header (título + botón de acción
"Agendar / + Registrar / + Cargar / + Nueva / + Nueva…"). La vía de menor
fricción y menor riesgo: **dar a cada una un estado colapsado** que oculte el
cuerpo (manteniendo el header siempre visible) con un chevron ▾ que rote:

- Enfoque recomendado: crear **`components/ui/CollapsibleSection.tsx`**
  (header `{titulo, children, action, defaultOpen}` con botón que alterna) y
  envolver **por fuera** cada tarjeta existente, o refactorizar cada section
  para aceptar `defaultOpen`. Evaluar en implementación cuál implica menos
  cambios:
  - Opción 1 (menos invasiva): el wrapper externo recibe el `children` = la
    tarjeta completa, y colapsa con transición de altura; el header interno de
    cada sección queda debajo del header del wrapper → doble header (feo).
  - Opción 2 (recomendada): modificar cada *Section (AppointmentsSection,
    VaccinationsSection, LabExamsSection, PrescriptionsSection,
    EcografiasSection) para que su **propio** header incluya un chevron y el
    estado `collapsed`, ocultando solo el contenido (`p-4 space-y-2`) pero
    manteniendo visible el botón de acción del header (Agendar / + Registrar…).
    Defaults:
    - Historial de Consultas: siempre abierto, sin chevron (es la prioridad).
    - Citas: abierto por defecto.
    - Vacunas / Exámenes / Recipe / Ecografías: **cerrados** por defecto
      (se abren al tocar). Si el negocio prefiere otra cosa, cambiar el default.
  - Preferir opción 2 para evitar cabeceras duplicadas; se tocan 5 componentes
    de forma acotada.

### `app/patients/[id]/page.tsx`
- Mover el bloque "Historial de Consultas" arriba de la columna derecha.
- Mantener su EmptyState y su "Nueva Consulta".

## Criterios de aceptación
- [ ] En la ficha, el primer bloque del historial clínico es "Historial de
      Consultas".
- [ ] Citas/Vacunas/Exámenes/Recipe/Ecografías se abren y cierran con un
      chevron; el botón de acción del header queda visible aunque esté cerrado.
- [ ] Al abrir la ficha, solo Historial y Citas están expandidos (resto
      cerrados) — o el default que se acuerde.
- [ ] El toggle no rompe los modales internos de cada sección.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Abrir un paciente con varias vacunas/citas/consultas.
2. Verificar orden (historial primero), cerrar/abrir cada sección, crear un
   registro desde una sección cerrada (el header sigue con su botón).
3. Recargar → los defaults se mantienen.
4. Desktop + mobile.
