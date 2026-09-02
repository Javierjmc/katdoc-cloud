// lib/utils.ts
// ============================================================
// Funciones utilitarias compartidas en toda la app
// ============================================================

/**
 * Calcula la edad legible a partir de una fecha de nacimiento.
 * Incluye días: "4 meses y 12 días", "25 días", "2 años y 3 meses".
 * Fechas en hora local (mediodía) para no desfasar por zona horaria.
 */
export function calcularEdad(fechaNacimiento: string | null | undefined): string {
  if (!fechaNacimiento) return 'Edad desconocida';

  const nac = new Date(`${fechaNacimiento}T12:00:00`);
  if (Number.isNaN(nac.getTime())) return 'Edad desconocida';

  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);

  if (nac.getTime() > hoy.getTime()) return '—'; // fecha futura

  const totalDias = Math.floor((hoy.getTime() - nac.getTime()) / 86400000);

  if (totalDias < 30) {
    return totalDias === 0 ? 'Recién nacido' : `${totalDias} día${totalDias !== 1 ? 's' : ''}`;
  }

  const { years, months, days } = diffYMD(nac, hoy);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} año${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mes${months !== 1 ? 'es' : ''}`);
  if (days > 0) parts.push(`${days} día${days !== 1 ? 's' : ''}`);

  if (parts.length === 0) return 'Recién nacido';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}

/** Diferencia en años/meses/días entre dos fechas (b >= a), respetando fin de mes. */
function diffYMD(a: Date, b: Date): { years: number; months: number; days: number } {
  let years = b.getFullYear() - a.getFullYear();
  let cursor = new Date(a);
  cursor.setFullYear(a.getFullYear() + years);
  if (cursor.getTime() > b.getTime() && years > 0) {
    years -= 1;
    cursor = new Date(a);
    cursor.setFullYear(a.getFullYear() + years);
  }

  let months = 0;
  while (true) {
    const next = addMonthsClamped(cursor, 1);
    if (next.getTime() > b.getTime()) break;
    cursor = next;
    months += 1;
  }

  const days = Math.max(0, Math.floor((b.getTime() - cursor.getTime()) / 86400000));
  return { years, months, days };
}

/** Suma meses a una fecha recortando el día al último día del mes destino. */
function addMonthsClamped(date: Date, delta: number): Date {
  const res = new Date(date);
  const day = res.getDate();
  res.setDate(1);
  res.setMonth(res.getMonth() + delta);
  const lastDay = new Date(res.getFullYear(), res.getMonth() + 1, 0).getDate();
  res.setDate(Math.min(day, lastDay));
  res.setHours(12, 0, 0, 0);
  return res;
}

/**
 * Formatea una fecha ISO a formato local venezolano/español.
 * Ej: "15 de enero de 2025"
 */
export function formatearFecha(
  fecha: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-VE', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
    ...options,
  });
}

/**
 * Formatea fecha corta: "15/01/2025"
 */
export function formatearFechaCorta(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-VE');
}

/**
 * Normaliza un teléfono venezolano a formato internacional para wa.me.
 * "0412-1234567" / "+58 412 1234567" → "584121234567"
 * Devuelve null si no se reconoce.
 */
export function normalizePhoneForWhatsApp(telefono?: string | null): string | null {
  if (!telefono) return null;
  const digits = telefono.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('58')) return digits;
  if (digits.length === 10 && digits.startsWith('0')) return `58${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('0058')) return digits.slice(2);
  if (digits.length >= 11 && digits.startsWith('58')) return digits;
  return null;
}

// ─── Helpers de fecha local (S33) ────────────────────────────
// Evitan el bug de "un día antes": una fecha guardada a medianoche UTC se ve
// el día anterior en Venezuela. Guardamos a mediodía local y mostramos
// siempre componentes locales.

/** Fecha de HOY en hora local, formato YYYY-MM-DD. */
export function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Convierte "YYYY-MM-DD" (de un input date) a ISO completo a mediodía local,
 * para persistir en columnas TIMESTAMPTZ sin corrimiento de día.
 */
export function fechaInputToISO(f: string | null | undefined): string {
  if (!f || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return f ?? '';
  const d = new Date(`${f}T12:00:00`);
  return Number.isNaN(d.getTime()) ? f : d.toISOString();
}

/**
 * Convierte un valor ISO (TIMESTAMPTZ) a "YYYY-MM-DD" local para precargar
 * un input date. Si ya viene "YYYY-MM-DD" lo devuelve tal cual.
 */
export function isoToFechaInput(iso: string | null | undefined): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Indica si una fecha (y hora opcional) de una cita ya quedó en el pasado.
 * - Fecha anterior a hoy → pasado.
 * - Hoy sin hora → no pasado (se considera "programada para hoy").
 * - Hoy con hora → pasado si esa hora ya pasó (hora local del dispositivo).
 */
export function isPastDateTime(fecha?: string | null, hora?: string | null): boolean {
  if (!fecha) return false;
  const hoy = hoyLocal();
  if (fecha < hoy) return true;
  if (fecha === hoy && hora && /^\d{2}:\d{2}$/.test(hora)) {
    const [hh, mm] = hora.split(':').map(Number);
    const now = new Date();
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
    return candidate.getTime() < now.getTime();
  }
  return false;
}

/**
 * Trunca un texto a N caracteres y agrega "..." si excede.
 */
export function truncar(texto: string | null | undefined, maxLen = 80): string {
  if (!texto) return '';
  return texto.length > maxLen ? texto.slice(0, maxLen) + '…' : texto;
}

/**
 * Genera un ID único de 8 caracteres (para uso temporal en el cliente).
 */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Devuelve las iniciales de un nombre completo.
 * Ej: "María González" → "MG"
 */
export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');
}

/**
 * Emoji por especie de animal.
 */
export const ESPECIE_EMOJI: Record<string, string> = {
  Canino:  '🐶',
  Felino:  '🐱',
  Exótico: '🦜',
  Bovino:  '🐄',
  Equino:  '🐴',
  Otro:    '🐾',
};

export function emojiEspecie(especie: string): string {
  return ESPECIE_EMOJI[especie] ?? '🐾';
}

/**
 * Clasifica el color de un badge de status de sistema clínico.
 */
export type SistemaBadgeStyle = {
  label: string;
  className: string;
};

export function sistemaBadgeStyle(status: string): SistemaBadgeStyle {
  switch (status) {
    case 'N':
      return { label: 'Normal', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
    case 'AN':
      return { label: 'Anormal', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    default:
      return { label: 'No examinado', className: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400' };
  }
}
