# S39 — Notificaciones: avisos internos en la app y envío automático a clientes

**Prioridad:** alta · **Rama:** directo a `main`

## Objetivo
Que KATDOC (a) **avise internamente al staff** cuando hay recordatorios
nuevos/por vencer (badge + aviso en vivo), y (b) **envíe automáticamente** los
recordatorios a los clientes por **email** (Resend, free tier) cuando entran en
ventana, manteniendo **WhatsApp manual** (`wa.me`) por ahora. Incluye un
**doc de costos** de la API de WhatsApp Business para decidir después.

## Contexto (estado actual)
- Motor: `lib/notifications/scan.ts` crea `reminders` según `notification_config`
  (ventanas en días) — idempotente por UNIQUE.
- Cron Vercel llama `GET/POST /api/reminders/scan` (`vercel.json`) → hoy solo
  **crea** recordatorios; **no envía nada**.
- Centro de notificaciones (`app/notifications/page.tsx`): envía **manual**
  (WhatsApp wa.me, email por botón). Email vía
  `POST /api/notifications/email` (Resend) con fallback `mailto:`.
- No hay realtime/badge: el staff debe entrar a la sección y tocar
  "Chequear ahora".

## Enfoque (en fases)

### Fase A — Avisos internos en la app (Realtime + badge)
- **Habilitar Realtime** sobre la tabla `reminders` (migración):
  ```sql
  alter publication supabase_realtime add table reminders;
  ```
  (Con la anon key actual sin RLS, la suscripción funciona; si se agrega RLS
  después, ajustar a `authenticated`.)
- **Hook `hooks/useRealtimeReminders.ts`**:
  - Suscribe a `supabase.channel('reminders-live').on('postgres_changes',
    { event: '*', schema: 'public', table: 'reminders' }, cb)`.
  - Al recibir cambios (insert/update con `estado='pendiente'`) → dispara
    `refetch()` del listado de pendientes y un **toast global**
    ("Nuevo recordatorio: <titulo>").
  - Se integra donde ya vive `useReminders` (centro de notificaciones) y/o en
    un componente global de badges.
- **Badge en la navegación**: en `AppShell` (desktop sidebar y bottom nav
  mobile), el ítem "Avisos" muestra un contador con el nº de `reminders`
  `estado='pendiente'` + vencidos. Conteo inicial + actualización vía el hook
  realtime (fetch de conteo `select('id', { count: 'exact' })`).
- El toast/badge funciona solo mientras hay una pestaña abierta (Web Push
  queda como mejora opcional, Fase D).

### Fase B — Envío automático de email (cron + dispatch)
- Nueva función server `lib/notifications/dispatch.ts`:
  `dispatchEmails()`:
  1. Lee `reminders` `estado='pendiente'` cuyo `fecha_ventana <= hoy` y
     `hoy <= fecha_evento + grace` (misma lógica de ventana de `scan.ts`).
  2. Para cada uno con `tutor.email` y con el tipo habilitado para email
     (`notification_config` + flag nuevo, ver abajo): arma asunto/cuerpo con
     `buildEmailRecordatorio`, lo envía con el provider Resend, y en éxito
     actualiza `reminders` → `estado='enviado'`, `canal='email'`,
     `fecha_envio=now()` y registra en `notification_log` (`logNotification`).
  3. Protege contra reintento (solo toca filas pendientes; la actualización es
     atómica vía UPDATE ... WHERE estado='pendiente').
- **Migración SQL**:
  ```sql
  ALTER TABLE notification_config
    ADD COLUMN IF NOT EXISTS email_auto BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE notification_config
    ADD COLUMN IF NOT EXISTS whatsapp_auto BOOLEAN NOT NULL DEFAULT FALSE;
  ```
- **Config** (`app/config/page.tsx`): toggle "Enviar email automático" por
  tipo (edita `email_auto`). (WhatsApp auto queda apagado/oculto hasta Fase C.)
- **API route `/api/reminders/scan/route.ts`**: que el scan (GET de cron)
  corra `scanReminders()` + `dispatchEmails()`; el POST manual del botón
  "Chequear ahora" solo escanea (sin enviar) para que el staff decida — o bien
  agregar un endpoint `/api/reminders/dispatch` protegido por `CRON_SECRET`.
  Decisión en implementación; mantener separados scan y dispatch.

### Fase C — (Decisión posterior, no implementar ahora)
- Doc **`docs/WHATSAPP_API_COSTOS.md`** con:
  - Opciones: Meta WhatsApp Cloud API directo vs agregadores (Twilio, 360dialog).
  - Costos orientativos por conversación/mensaje (Meta cobra por conversación
    de 24 h iniciada; Twilio ~USD 0.005–0.007/mensaje según país, más número).
  - Requisitos: cuenta Business, número verificado, plantillas aprobadas
    (mensajes de recordatorio = plantillas), región VE.
  - Qué cambia en el código (implementar `sendWhatsApp` real en
    `lib/notifications/provider.ts` + canal `whatsapp_auto`).
  - Recomendación: empezar con wa.me + email automático (fase A/B) sin costo.

### Fase D — Web Push (opcional, backlog)
- Service worker + VAPID para recibir avisos aunque la app esté cerrada. Sin
  costo directo pero requiere HTTPS (Vercel), solicitud de permiso y manejo de
  suscripciones. No es parte de este spec salvo nota.

## Criterios de aceptación
- [ ] Al crear/actualizar un reminder aparece aviso/badge en "Avisos" en vivo
      (pestaña abierta) y el conteo del nav se actualiza.
- [ ] El cron (o dispatch manual) envía automáticamente el email a los clientes
      con recordatorio en ventana y lo marca enviado + loguea.
- [ ] Tipos sin `email_auto` no envían automáticamente.
- [ ] WhatsApp sigue manual (wa.me) y sin cambios.
- [ ] Entregado el doc `docs/WHATSAPP_API_COSTOS.md`.
- [ ] `npm run build`, `npm run lint` y migración pasan.

## Verificación
1. Crear una vacuna con próxima dosis en 15 días (config 21 días antes) →
   correr scan → reminder pendiente → aparece badge.
2. En otra pestaña, abrir `/notifications` → se ve sin recargar (realtime).
3. Poner `email_auto=TRUE` en vacuna con email de prueba → correr dispatch →
   llega el email y el reminder pasa a "enviado" con log.
4. WhatsApp manual sigue funcionando.
5. Revisar `notification_config` nuevos toggles en `/config`.
