// lib/brand.ts
// ============================================================
// Datos y rutas de marca de la clinica.
// Unico lugar donde vive el branding: si cambia el logo, el sello,
// la direccion o el telefono, se cambia aca.
// En Fonendo este objeto se reemplaza por la config de cada clinica.
// ============================================================

export const BRAND = {
  name: 'KATDOC',
  subtitle: 'Historias Clínicas',
  tagline: 'Bienestar animal, otra manera de amar',

  /** Logo completo: login, membrete de PDFs, reporte impreso. */
  logo: '/brand/katdoc-logo.jpg',
  /** Marca corta (mosaico de animales): sidebar, favicon, espacios chicos. */
  mark: '/brand/katdoc-mark.jpg',
  /** Firma y sello de la medico veterinario, con fondo blanco. */
  sello: '/brand/katdoc-sello.jpg',
  /** QR de contacto impreso en las recetas. */
  qr: '/brand/katdoc-qr.jpg',

  address: 'Altavista Sur, Carrera Gurí',
  phone: '0424-922.95.39',
  handle: '@katdoc.mv',
} as const;
