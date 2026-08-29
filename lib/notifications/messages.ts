// lib/notifications/messages.ts
// ============================================================
// Construcción de mensajes de recordatorio y enlaces.
// ============================================================

import { normalizePhoneForWhatsApp } from '@/lib/utils';
import type { Reminder } from '@/types';

const CLINICA_NOMBRE = 'KATDOC';
const CLINICA_TAGLINE = 'Bienestar animal, otra manera de amar';

/**
 * Link wa.me con el mensaje prellenado.
 * Devuelve null si el teléfono no es válido.
 */
export function buildWhatsAppLink(telefono: string | null | undefined, mensaje: string): string | null {
  const phone = normalizePhoneForWhatsApp(telefono);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
}

/** Mensaje de recordatorio amigable para WhatsApp. */
export function buildMensajeRecordatorio(r: Reminder): string {
  const paciente = r.patient?.nombre ?? 'su mascota';
  const tutor = r.tutor?.nombre;
  const fecha = r.fecha_evento ? new Date(r.fecha_evento).toLocaleDateString('es-VE') : '';
  const tipoLabel = TIPO_LABELS[r.tipo] ?? r.tipo;

  const lines = [
    `🐾 ${CLINICA_NOMBRE}`,
    `Hola ${tutor ? tutor.split(' ')[0] : ''}! 👋`,
    '',
    `Le recordamos que ${paciente} tiene próximo/a su ${tipoLabel.toLowerCase()}:`,
    `📌 ${r.titulo}`,
    `📅 Fecha límite: ${fecha}`,
  ];
  if (r.descripcion && r.descripcion !== `Paciente ${paciente}`) {
    lines.push(`📝 ${r.descripcion}`);
  }
  lines.push('', `${CLINICA_TAGLINE}.`);
  return lines.join('\n');
}

/** Asunto y cuerpo HTML para email. */
export function buildEmailRecordatorio(r: Reminder): { subject: string; html: string } {
  const subject = `🐾 Recordatorio: ${r.titulo}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 16px;">
      <h2 style="margin: 0 0 12px; color: #E8724A;">🐾 ${CLINICA_NOMBRE}</h2>
      <p>Hola${r.tutor?.nombre ? ` ${r.tutor.nombre.split(' ')[0]}` : ''}! 👋</p>
      <p>Le recordamos que <strong>${r.patient?.nombre ?? 'su mascota'}</strong> tiene próximo/a su
        <strong>${TIPO_LABELS[r.tipo] ?? r.tipo}</strong>:</p>
      <p style="font-size: 18px;"><strong>${r.titulo}</strong></p>
      <p>Fecha límite: <strong>${r.fecha_evento ? new Date(r.fecha_evento).toLocaleDateString('es-VE') : ''}</strong></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
      <p style="color: #888; font-size: 12px;">${CLINICA_TAGLINE}.</p>
    </div>
  `;
  return { subject, html };
}

const TIPO_LABELS: Record<string, string> = {
  vacuna:          'Vacuna',
  desparasitacion: 'Desparasitación',
  examen:          'Examen de laboratorio',
  control:         'Control',
};
