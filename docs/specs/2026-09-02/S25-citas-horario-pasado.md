# S25 — No permitir agendar citas en fecha/hora ya pasada

**Prioridad:** alta · **Rama:** directo a `main`

## Objetivo
Impedir crear/editar una cita cuya `fecha` (y `hora`, si se indica) ya quedó
en el pasado. Hoy el formulario acepta cualquier fecha/hora.

## Contexto
Las citas se crean/editan desde dos lugares:
- `components/AppointmentsSection.tsx` (ficha del paciente) → `handleSave`.
- `app/agenda/page.tsx` (modal "Agendar cita") → `handleCreate`.

En ambos casos `appointmentSchema` (`lib/schemas.ts:40`) solo valida formato
de fecha/hora, no pasado. Tampoco hay guard de negocio.

## Enfoque
Validación de negocio + UX, no solo zod (porque compara dos campos contra
"ahora"):

### Helper `lib/utils.ts`
- `isPastDateTime(fecha: string, hora?: string): boolean`
  - Si `hora` está vacía: `true` si `fecha` es **anterior a hoy** (fecha de hoy
    sin hora = "programada para hoy", permitida).
  - Si `hora` existe (HH:MM): comparar `fecha + 'T' + hora` contra `now`
    (construir con hora local del dispositivo).
  - Usar comparaciones en fecha local (no ISO/UTC) para no reintroducir el bug
    de zona horaria del S33.

### `lib/schemas.ts`
- Añadir un `superRefine` a `appointmentSchema` que, cuando haya `fecha`/`hora`,
  invoque `isPastDateTime` y devuelva el mensaje
  `'No se puede agendar en una fecha/hora pasada'` en el path `hora` (o
  `fecha`). Cuidado: solo para **create**; al **editar** una cita pasada para
  cambiar su estado no debe bloquearse (ver siguiente punto).

### `components/AppointmentsSection.tsx`
- En `handleSave`:
  - Modo `create`: si `isPastDateTime(...)` → toast de error y no guardar.
  - Modo `edit`: bloquear solo si el usuario **cambió** fecha/hora a un valor
    pasado; si mantiene la fecha/hora original pasada (para cambiar estado o
    notas) permitir.

### `app/agenda/page.tsx`
- En `handleCreate`: mismo guard que el modo create. Además, al seleccionar un
  día del mes anterior o marcar hora menor a la actual en "hoy", mostrar el
  error del zod en el campo `hora`.

## Criterios de aceptación
- [ ] Intentar agendar con fecha pasada → error visible y no se guarda.
- [ ] Intentar agendar "hoy" con una hora anterior a la actual → error.
- [ ] Agendar "hoy" sin hora (programada) → permitido.
- [ ] Editar una cita pasada solo para cambiar su estado → permitido.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. En `/agenda`, elegir un día pasado → botón Agendar → muestra error.
2. Elegir hoy, hora 00:30 (o pasada) → error.
3. Hoy sin hora → se guarda.
4. En la ficha de un paciente: crear cita pasada → error; editar una pasada
   para marcarla "completada" → OK.
