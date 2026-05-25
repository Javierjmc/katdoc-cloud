// lib/utils.ts
// ============================================================
// Funciones utilitarias compartidas en toda la app
// ============================================================

/**
 * Calcula la edad legible a partir de una fecha de nacimiento.
 * Devuelve formato "X año(s)" o "X mes(es)" o "Recién nacido".
 */
export function calcularEdad(fechaNacimiento: string | null | undefined): string {
  if (!fechaNacimiento) return 'Edad desconocida';
  const born   = new Date(fechaNacimiento);
  const now    = new Date();
  const years  = now.getFullYear() - born.getFullYear();
  const months = now.getMonth() - born.getMonth() + years * 12;
  if (months < 1) return 'Recién nacido';
  if (months < 12) return `${months} mes${months !== 1 ? 'es' : ''}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (m === 0) return `${y} año${y !== 1 ? 's' : ''}`;
  return `${y} año${y !== 1 ? 's' : ''} y ${m} mes${m !== 1 ? 'es' : ''}`;
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
      return { label: 'No examinado', className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' };
  }
}
