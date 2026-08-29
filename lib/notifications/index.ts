// lib/notifications/index.ts
// ============================================================
// Exports públicos del módulo de notificaciones.
// ============================================================

export { getProvider, WaLinkProvider } from './provider';
export type { NotificationProvider, NotificationMessage, SendResult } from './provider';
export { buildWhatsAppLink, buildMensajeRecordatorio, buildEmailRecordatorio } from './messages';
export { scanReminders } from './scan';
export { logNotification } from './log';

// ── Nota de upgrade (S16) ──────────────────────────────────────
// Para conectar servicios de pago más adelante:
//  - Meta WhatsApp Cloud API: implementar sendWhatsApp con POST a
//    https://graph.facebook.com/v19.0/<phone_id>/messages (token + número verificado).
//  - Twilio: usar el SDK twilio (SID + token).
//  - SMTP: implementar sendEmail con nodemailer.
//  - Inngest: reemplazar el cron de Vercel (vercel.json) por una step function
//    onSchedule({ cron: '0 13 * * *' }) que ejecute scanReminders() con retry.
// La interfaz NotificationProvider ya está aislada para estos cambios.
