// lib/constants.ts
// ============================================================
// Constantes globales de la aplicación
// Centralizar aquí evita valores duplicados en componentes.
// ============================================================

export const APP_NAME    = 'VetCare Pro';
export const APP_VERSION = '1.0.0';

// Nombres de los buckets de Supabase Storage
export const BUCKET_PET_PHOTOS        = 'pet-photos';
export const BUCKET_MEDICAL_DOCUMENTS = 'medical-documents';

// Tamaños máximos de archivos (en bytes)
export const MAX_PHOTO_SIZE    = 5  * 1024 * 1024;  // 5 MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;  // 10 MB

// Tipos de archivo permitidos
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOC_TYPES   = ['application/pdf'];

// Paginación
export const RECORDS_PER_PAGE = 20;

// Status de los sistemas clínicos
export const SISTEMA_STATUS = {
  N:  'Normal',
  AN: 'Anormal',
  NE: 'No Examinado',
} as const;

// Rutas de la aplicación
export const ROUTES = {
  login:         '/login',
  dashboard:     '/dashboard',
  newPatient:    '/patients/new',
  patient:       (id: string) => `/patients/${id}`,
  editPatient:   (id: string) => `/patients/${id}/edit`,
  newRecord:     (patientId: string) => `/records/new?patientId=${patientId}`,
  record:        (id: string) => `/records/${id}`,
} as const;
