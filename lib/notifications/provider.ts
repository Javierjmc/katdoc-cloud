// lib/notifications/provider.ts
// ============================================================
// Capa de proveedores de notificaciones (S16).
// Hoy: WhatsApp por link wa.me + email por Resend.
// Mañana: Twilio / Meta WhatsApp Cloud / SMTP / Inngest.
// ============================================================

import { buildWhatsAppLink } from './messages';

export interface NotificationMessage {
  to: string;            // teléfono o email
  subject?: string;      // solo email
  body: string;          // texto plano
  html?: string;         // solo email
  attachment?: {         // solo email (ej. PDF de una Recipe)
    filename: string;
    dataBase64: string;
  };
}

export type SendResult =
  | { ok: true; externalId?: string; channel: 'whatsapp' | 'email' }
  | { ok: false; error: string; channel: 'whatsapp' | 'email' };

export interface NotificationProvider {
  /** Construye el enlace wa.me (el envío lo confirma el staff en WhatsApp). */
  buildWhatsAppLink?(to: string, body: string): string | null;
  sendWhatsApp(msg: NotificationMessage): Promise<SendResult>;
  sendEmail(msg: NotificationMessage): Promise<SendResult>;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? 'KATDOC <onboarding@resend.dev>';

/** Proveedor MVP: WhatsApp por link (manual), email por Resend con fallback. */
export class WaLinkProvider implements NotificationProvider {
  buildWhatsAppLink(to: string, body: string): string | null {
    return buildWhatsAppLink(to, body);
  }

  async sendWhatsApp(msg: NotificationMessage): Promise<SendResult> {
    const url = buildWhatsAppLink(msg.to, msg.body);
    if (!url) {
      return { ok: false, error: 'Teléfono no válido para WhatsApp', channel: 'whatsapp' };
    }
    // El "envío" es manual: devolvemos el enlace para que el staff lo abra.
    return { ok: true, externalId: url, channel: 'whatsapp' };
  }

  async sendEmail(msg: NotificationMessage): Promise<SendResult> {
    if (!RESEND_API_KEY) {
      return { ok: false, error: 'RESEND_API_KEY no configurada', channel: 'email' };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [msg.to],
          subject: msg.subject ?? 'Notificación KATDOC',
          text: msg.body,
          ...(msg.html ? { html: msg.html } : {}),
          ...(msg.attachment
            ? { attachments: [{ filename: msg.attachment.filename, content: msg.attachment.dataBase64 }] }
            : {}),
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 160)}`, channel: 'email' };
      }

      const json = (await res.json()) as { id?: string };
      return { ok: true, externalId: json.id, channel: 'email' };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Error de red enviando email',
        channel: 'email',
      };
    }
  }
}

export function getProvider(): NotificationProvider {
  // Switch para futuros proveedores (twilio/meta/smtp) según env.
  return new WaLinkProvider();
}
