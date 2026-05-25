// types/index.ts
// ============================================================
// Tipos TypeScript centralizados — VetCare Pro
// Modificar aquí propaga cambios a toda la app.
// ============================================================

// ─── Entidades de Base de Datos ────────────────────────────

export type Tutor = {
  id: string;
  nombre: string;
  cedula: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  created_at: string;
};

export type Patient = {
  id: string;
  tutor_id: string;
  nombre: string;
  especie: string;
  raza?: string;
  fecha_nacimiento?: string;
  color?: string;
  sexo?: string;
  photo_url?: string;
  created_at: string;
  // Relación expandida
  tutor?: Tutor;
};

// Valores posibles para el status de cada sistema
export type SistemaStatus = 'N' | 'AN' | 'NE';

// JSONB: estado de los 12 sistemas clínicos
export type SistemasStatusMap = {
  estado_general?: SistemaStatus;
  hidratacion?: SistemaStatus;
  tegumentario?: SistemaStatus;
  ojos?: SistemaStatus;
  oidos?: SistemaStatus;
  nariz?: SistemaStatus;
  digestivo?: SistemaStatus;
  respiratorio?: SistemaStatus;
  nervioso?: SistemaStatus;
  musculoesqueletico?: SistemaStatus;
  cardiovascular?: SistemaStatus;
  genitourinario?: SistemaStatus;
  // Añade nuevas claves aquí sin tocar el SQL
};

export type MedicalRecord = {
  id: string;
  patient_id: string;
  numero_historia: string;
  fecha_consulta: string;
  // Anamnésicos
  ultima_desparasitacion?: string;
  vacunas?: string;
  enfermedades_anteriores?: string;
  tratamientos_actuales?: string;
  evolucion?: string;
  alimentacion?: string;
  historial_reproductivo?: string;
  ultimo_celo?: string;
  fecha_ultimo_parto?: string;
  // Motivo
  motivo_consulta?: string;
  // Constantes vitales
  f_respiratoria?: string;
  f_cardiaca?: string;
  temperatura?: number;
  pulso?: string;
  tiempo_llenado_capilar?: string;
  ganglios_linfaticos?: string;
  mucosas?: string;
  actitud_temperamento?: string;
  // Sistemas
  sistemas_status?: SistemasStatusMap;
  descripcion_hallazgos?: string;
  // Adjuntos
  document_url?: string;
  created_at: string;
  // Relación expandida
  patient?: Patient;
};

// ─── Configuración de UI ────────────────────────────────────

/**
 * Config de cada sistema clínico para el checklist dinámico.
 * Añadir un objeto a SISTEMAS_CONFIG es todo lo que se necesita
 * para agregar un nuevo sistema al formulario y la base de datos.
 */
export type SistemaConfig = {
  key: keyof SistemasStatusMap;
  label: string;
  icon: string; // emoji o nombre de icono
};

export const SISTEMAS_CONFIG: SistemaConfig[] = [
  { key: 'estado_general',     label: 'Estado General / Cond. Corporal', icon: '🩺' },
  { key: 'hidratacion',        label: 'Hidratación',                     icon: '💧' },
  { key: 'tegumentario',       label: 'Tegumentario (Piel/Pelo)',        icon: '🐾' },
  { key: 'ojos',               label: 'Ojos',                           icon: '👁️' },
  { key: 'oidos',              label: 'Oídos',                          icon: '👂' },
  { key: 'nariz',              label: 'Nariz',                          icon: '👃' },
  { key: 'digestivo',          label: 'Digestivo',                      icon: '🔵' },
  { key: 'respiratorio',       label: 'Respiratorio',                   icon: '🫁' },
  { key: 'nervioso',           label: 'Sistema Nervioso',               icon: '🧠' },
  { key: 'musculoesqueletico', label: 'Músculo-Esquelético',            icon: '🦴' },
  { key: 'cardiovascular',     label: 'Cardiovascular',                 icon: '❤️' },
  { key: 'genitourinario',     label: 'Genitourinario',                 icon: '🔬' },
];

// Opciones de actitud/temperamento
export const ACTITUD_OPTIONS = [
  'Alerta',
  'Letárgico',
  'Estuporoso',
  'Comatoso',
  'Hiperactivo',
  'Agresivo',
  'Ansioso',
  'Otro',
] as const;

// Especies disponibles
export const ESPECIES = ['Canino', 'Felino', 'Exótico', 'Bovino', 'Equino', 'Otro'] as const;

// ─── Vista del Dashboard ────────────────────────────────────

export type DashboardRow = {
  patient_id: string;
  patient_nombre: string;
  especie: string;
  raza?: string;
  photo_url?: string;
  tutor_id: string;
  tutor_nombre: string;
  tutor_cedula: string;
  tutor_telefono?: string;
  record_id?: string;
  numero_historia?: string;
  fecha_consulta?: string;
  motivo_consulta?: string;
};
