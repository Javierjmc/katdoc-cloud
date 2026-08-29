# S16 — Capa de proveedores de notificaciones (intercambiable)

**Fase:** 3 · **Prioridad:** media · **Rama:** `feat/javier/proveedores-notificaciones`

## Objetivo
Aislar la lógica de envío (WhatsApp y email) detrás de una interfaz, de modo que hoy
funcione con **link wa.me + Resend** y mañana se pueda cambiar a **Twilio / Meta
WhatsApp Cloud / SMTP / Inngest** sin tocar las páginas.

## Diseño

### `lib/notifications/provider.ts` (nuevo, server-safe)
```ts
export interface NotificationMessage {
  to: string;            // teléfono o email
  subject?: string;      // solo email
  body: string;          // texto plano
  html?: string;         // solo email
}

export interface NotificationProvider {
  sendWhatsApp(msg: NotificationMessage): Promise<SendResult>;
  sendEmail(msg: NotificationMessage): Promise<SendResult>;
}

export type SendResult =
  | { ok: true; externalId?: string; channel: 'whatsapp' | 'email' }
  | { ok: false; error: string; channel: 'whatsapp' | 'email' };
```

### Implementación MVP `WaLinkProvider`
- `sendWhatsApp` → valida/retorna el **link wa.me** (no envía; el staff confirma en
  WhatsApp). Devuelve `{ ok: true, channel: 'whatsapp', externalId: <url> }`.
- `sendEmail` → si `RESEND_API_KEY`: envía por Resend; si no, `{ ok: false, error: 'no key' }`
  para que el UI caiga a `mailto:`.

### Resolución según env (`lib/notifications/index.ts`)
- `getProvider(): NotificationProvider` → según `NEXT_PUBLIC_NOTIF_PROVIDER`
  (`'wa-link'` por defecto). Se deja el switch para agregar `'twilio'`, `'meta'`,
  `'smtp'` después.

### Registro de logs (`notification_log`)
Migración (S19):
```sql
CREATE TABLE IF NOT EXISTS notification_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  canal       TEXT NOT NULL,        -- 'whatsapp' | 'email'
  destino     TEXT NOT NULL,
  estado      TEXT NOT NULL,        -- 'enviado' | 'error' | 'simulado'
  detalle     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
`logNotification(...)` escribe aquí siempre que `sendWhatsApp`/`sendEmail` devuelvan
`ok` o `error`, y al "marcar enviado" manualmente (S15).

### Documentación de upgrade (en `lib/notifications/README.md` o comentario del módulo)
- **Meta WhatsApp Cloud API:** necesita número verificado + token; implementar
  `sendWhatsApp` con `POST https://graph.facebook.com/v19.0/<phone_id>/messages`.
- **Twilio:** SDK `twilio`, número de Twilio + credenciales.
- **Inngest:** reemplazar el cron de Vercel (S14) por una step function
  `onSchedule({ cron: '0 13 * * *' })` que ejecute el mismo `scanReminders()` +
  envío con retry automático.
- **SMTP:** implementar `sendEmail` con `nodemailer`.

## Criterios de aceptación
- [ ] WhatsApp/email pasan por la interfaz `NotificationProvider`.
- [ ] Con `RESEND_API_KEY` el email se envía; sin ella, `ok:false` y el UI usa mailto.
- [ ] Todos los envíos (exitosos o no) quedan en `notification_log`.
- [ ] La documentación de upgrade existe en el código.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Enviar un email con clave de Resend → log `estado='enviado'` + `externalId`.
2. Enviar sin clave → log `estado='error'` (o 'simulado') y el UI muestra mailto.
3. Generar link wa.me → log con el link como `detalle`.
