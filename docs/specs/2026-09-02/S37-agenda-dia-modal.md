# S37 — Agenda: tocar un día abre el detalle en modal

**Prioridad:** media · **Rama:** directo a `main`

## Objetivo
Que al **tocar un día** del calendario de `/agenda` se abra un **modal /
bottom-sheet** con los eventos de ese día y el botón "Agendar cita". Hoy el
detalle se renderiza en un panel fijo **debajo** del calendario
(`app/agenda/page.tsx:192-226`) y en mobile el usuario no lo percibe al tocar
un día (queda fuera de vista).

## Contexto
En `app/agenda/page.tsx`, el `onClick` de cada celda hace
`setSelected(date)` y abajo se muestra el panel. El default ya selecciona hoy
(`:49`). El modal de "Agendar cita" (`showCreate`, `:230-261`) ya existe y
sirve de patrón visual.

## Cambios
- `app/agenda/page.tsx`:
  - Nuevo estado `dayModal: string | null` (la fecha del día a mostrar).
  - El `onClick` de cada día → `setDayModal(date)` y `setSelected(date)` (para
    conservar el resaltado en el grid).
  - Reemplazar el **panel inline** (`{selected && (...)}`) por un modal:
    - Overlay `fixed inset-0 z-50 flex items-end sm:items-center` (bottom-sheet
      en mobile, centrado en desktop), mismo estilo que `showCreate`.
    - Contenido: título con fecha larga (reutilizar el formateo con
      `new Date(day + 'T12:00:00')`), lista de eventos del día (badges de tipo,
      hora, paciente con link a `/patients/{patientId}` cuando exista —
      contemplar S38: si la cita es sin paciente, mostrar el nombre en texto y
      sin link), botón "+ Agendar cita" que abre el modal de creación
      (`openCreate(day)`) cerrando el de detalle.
    - Vacío: "Sin eventos este día".
    - Cerrar con backdrop, ✕, Esc. Fondo no scrollea.
  - Quitar el `{selected && ...}` inline (el estado `selected` queda solo para
    el resaltado del grid + `goToday`).
  - Opcional: si el día tiene eventos y hay muchos, scroll interno
    (`max-h-[70vh] overflow-y-auto`).

## Criterios de aceptación
- [ ] Tocar un día → se abre el modal/bottom-sheet con sus eventos.
- [ ] El día tocado queda resaltado en el calendario.
- [ ] "Agendar cita" dentro del modal abre el formulario con esa fecha
      preseleccionada.
- [ ] Evento con paciente → link a la ficha; sin paciente (S38) → texto plano.
- [ ] Cerrar con backdrop/✕/Esc y sin scroll del fondo.
- [ ] "Hoy" sigue funcionando (vuelve al mes actual y resalta hoy).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. `/agenda`, tocar un día con citas/vacunas → modal con lista.
2. Tocar un día sin eventos → modal con "Sin eventos este día".
3. Mobile (375px): el modal aparece como bottom-sheet y no se pierde de vista.
4. Navegar de mes y tocar "Hoy".
