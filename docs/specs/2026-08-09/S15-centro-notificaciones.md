# S15 — Centro de notificaciones + envío WhatsApp/email

**Fase:** 3 · **Prioridad:** media · **Rama:** `feat/javier/centro-notificaciones`

## Objetivo
Pantalla donde el staff ve los recordatorios pendientes (próximos y vencidos) y los
envía al cliente por **WhatsApp** (link wa.me prellenado) o **email** (Resend o
mailto), registrando el envío.

## Dependencias
- S14 (tabla `reminders` y scan).
- S16 (capa de proveedores) para `buildWhatsAppLink` / `sendEmail`.

## Cambios

### `lib/notifications/messages.ts` (nuevo)
- `buildWhatsAppLink(tutorTelefono, mensaje)`:
  - Normaliza el teléfono a formato internacional: quita `0` inicial y `-`/espacios;
    si empieza con `0412` → `58 412...`; si ya trae `58`, lo deja. Prefijo `https://wa.me/<num>?text=<encodeURIComponent(mensaje)>`.
  - Si no hay teléfono válido, devuelve `null` (el UI muestra "Sin teléfono").
- `buildMensajeRecordatorio(reminder)` → mensaje amigable:
  ```
  🐾 KATDOC
  Hola <tutor>! Le recordamos que <paciente> tiene próximo/a su <titulo>
  📅 Fecha límite: <fecha>
  <descripcion?>
  ¡Los esperamos! 🩺
  ```
- `buildEmailRecordatorio(reminder)` → `{ subject, html }` (HTML simple, responsive).

### `app/notifications/page.tsx` (nuevo)
- Nav item "Notificaciones" en `AppShell` (icono 🔔, badge con pendientes).
- Al montar: llama `/api/reminders/scan` (S14) y luego lista pendientes con
  `useReminders`.
- Agrupa por urgencia:
  - **🔴 Vencidos** (`fecha_evento < hoy`)
  - **🟠 Próximos** (en ventana, `hoy >= fecha_ventana` y `fecha_evento >= hoy`)
- Cada tarjeta: paciente, tutor, tipo, título, fecha evento, descripción.
- Acciones:
  - **WhatsApp** → `window.open(buildWhatsAppLink(...))`; luego "Marcar enviado".
  - **Email** → si `RESEND_API_KEY` configurada: `POST /api/notifications/email`;
    si no: `mailto:`. Luego "Marcar enviado".
  - **Marcar enviado** → `updateReminderEstado(id, 'enviado', canal)`.
  - **Descartar** → `estado = 'descartado'`.
- Banner "Chequear ahora" → dispara el scan manualmente.

### `app/api/notifications/email/route.ts` (nuevo, server-only)
- `POST` con `{ to, subject, html }`.
- Si hay `RESEND_API_KEY`: envía vía Resend (SDK `resend` o fetch a API REST) desde
  `onboarding@...` (dominio verificado) y registra log.
- Si no hay clave: responde `{ simulated: true }` (el cliente cae a `mailto:`).
- Nunca expone la clave al cliente.

### `app/api/reminders/route.ts` (nuevo)
- `GET` lista pendientes (join tutor + paciente), `PATCH { id, estado, canal }`.

## Criterios de aceptación
- [ ] Los recordatorios pendientes se listan agrupados por urgencia.
- [ ] WhatsApp abre `wa.me` con el teléfono del tutor normalizado y mensaje prellenado.
- [ ] Email envía por Resend cuando hay clave; si no, cae a `mailto:`.
- [ ] Marcar enviado/descartar actualiza el estado y quita la fila de pendientes.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Generar recordatorio (S14) → abrir `/notifications`.
2. Tocar WhatsApp → se abre wa.me con el número y mensaje correctos.
3. Marcar enviado → desaparece de la lista y queda `estado='enviado'`.
4. Sin `RESEND_API_KEY` → email abre el cliente de correo.
