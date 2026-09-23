# S48 — Modal de cita: datos del tutor + recordatorio por WhatsApp

**Prioridad:** media · **Rama:** `feat/<dev>/s48-cita-tutor-whatsapp` · **Toca:** agenda, citas, mensajes

## Objetivo
En el detalle de una cita (modal del día de la agenda y fila de citas del perfil),
mostrar **datos del propietario** y poder **enviarle un recordatorio por WhatsApp**
con un toque.

## Contexto
- Modal del día: `app/agenda/page.tsx:243-284` muestra paciente/hora/motivo, pero
  **no** el tutor ni teléfono.
- `hooks/useCalendarEvents.ts:28-36,99-111` no trae tutor; el `CalendarEvent` no
  tiene esos campos.
- `components/AppointmentsSection.tsx:227-235` no muestra/normaliza el tutor,
  aunque `useAppointments.ts:41` ya trae `tutor:tutors(id,nombre,telefono,email)`.
- Enviar WhatsApp ya existe para recipes (`PrescriptionsSection.sendWhatsApp`) y
  `lib/notifications/messages.ts` tiene `buildWhatsAppLink` +
  `normalizePhoneForWhatsApp`.
- Citas "libres" (S38) guardan `tutor_nombre` / `telefono_tutor` a mano.

## Cambios

### `hooks/useCalendarEvents.ts`
- En el query de `appointments`, incluir `tutor:tutors(id, nombre, telefono)`
  y los campos `tutor_nombre`, `telefono_tutor`.
- `CalendarEvent`: agregar `tutorNombre?: string`, `tutorTelefono?: string`.
- Mapear: tutor de la ficha si existe; si no, los campos de cita libre.

### `lib/notifications/messages.ts`
- Nuevo `buildMensajeCita(opts: { paciente?: string; tutor?: string; fecha: string; hora?: string; motivo?: string }): string`
  con el formato KATDOC (saludo, paciente, fecha/hora, motivo, tagline).

### `app/agenda/page.tsx` (modal del día)
- Por cada cita: mostrar `👤 {{tutorNombre}} · 📞 {{tutorTelefono}}` cuando exista.
- Botón "📲 Recordar por WhatsApp" (solo en eventos `type === 'cita'` con teléfono):
  usa `buildWhatsAppLink(tutorTelefono, buildMensajeCita(...))`; si no hay teléfono,
  toast "El propietario no tiene teléfono".

### `components/AppointmentsSection.tsx`
- En la fila (`CitaRow`) o su modal, mostrar tutor (`a.tutor?.nombre`) y teléfono, y
  agregar el botón de WhatsApp con el mismo mensaje.

## Criterios de aceptación
- [ ] El modal del día muestra nombre y teléfono del propietario de la cita.
- [ ] El botón abre WhatsApp (`wa.me`) con el mensaje prellenado correcto.
- [ ] Si no hay teléfono, se avisa y no se rompe.
- [ ] Funciona tanto para citas de paciente como para citas libres (S38).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Agendar cita con paciente+tutor con teléfono → abrir el día → ver tutor → WhatsApp.
2. Cita libre con teléfono escrito → mismo flujo.
3. Cita sin teléfono → toast.
