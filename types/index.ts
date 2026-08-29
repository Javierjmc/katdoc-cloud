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
  active?: boolean;
  created_at: string;
  // Relación expandida
  tutor?: Tutor;
};

// Valores posibles para el status de cada sistema
export type SistemaStatus = 'N' | 'AN' | 'NE';

// Nota de descargo por sistema: { [key]: 'texto de descargo' }
export type SistemasNotasMap = Partial<Record<keyof SistemasStatusMap, string>>;

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

export type Vaccination = {
  id: string;
  patient_id: string;
  record_id?: string;
  vacuna: string;
  fecha_aplicacion?: string;
  fecha_proxima_dosis?: string;
  marca?: string;
  lote?: string;
  dosis?: string;
  observaciones?: string;
  created_at: string;
};

export type LabAnalyte = {
  nombre: string;
  valor: string;
  unidad?: string;
  rango?: string;
  flag?: 'N' | 'ALTO' | 'BAJO';
};

export type LaboratoryExam = {
  id: string;
  patient_id: string;
  record_id?: string;
  nombre_examen: string;
  laboratorio_origen?: string;
  fecha_examen?: string;
  fecha_proximo_control?: string;
  analitos: LabAnalyte[];
  notas?: string;
  file_url?: string;
  file_type?: string;
  created_at: string;
};

export type PrescriptionMedication = {
  nombre: string;
  presentacion?: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  via?: string;
  indicaciones?: string;
};

export type Prescription = {
  id: string;
  patient_id: string;
  record_id?: string;
  titulo?: string;
  fecha?: string;
  medicamentos: PrescriptionMedication[];
  notas?: string;
  created_at: string;
};

export type EcografiaMedicion = {
  nombre: string;
  valor: string;
  unidad?: string;
};

export type Ecografia = {
  id: string;
  patient_id: string;
  record_id?: string;
  fecha?: string;
  organo?: string;
  hallazgos?: string;
  conclusiones?: string;
  mediciones: EcografiaMedicion[];
  imagenes: string[];
  created_at: string;
};

export type NotificationConfig = {
  id: string;
  tipo: string;
  label: string;
  dias_antes: number;
  dias_despues: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: string;
  patient_id: string;
  tutor_id?: string;
  tipo: string;
  titulo: string;
  descripcion?: string;
  fecha_evento: string;
  fecha_ventana: string;
  estado: 'pendiente' | 'enviado' | 'descartado';
  canal?: string;
  fecha_envio?: string;
  created_at: string;
  // Relación expandida
  patient?: { id: string; nombre: string; active?: boolean };
  tutor?: { id: string; nombre: string; telefono?: string; email?: string };
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
  sistemas_notas?: SistemasNotasMap;
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
  'Comatoso',
  'Hiperactivo',
  'Agresivo',
  'Ansioso',
  'Otro',
] as const;

// ─── Opciones del Examen Clínico ──────────────────────────────
// El valor marcado con (*) es el que se pre-selecciona en registros nuevos.

export const PULSO_OPTIONS = ['Fuerte', 'Regular'] as const;
export const PULSO_DEFAULT = 'Fuerte';

export const GANGLIOS_OPTIONS = ['Reactivos', 'No reactivos', 'No palpable'] as const;
export const GANGLIOS_DEFAULT = 'No reactivos';

export const MUCOSAS_OPTIONS = [
  'Rosadas y húmedas',
  'Rosadas y secas',
  'Cianóticas',
  'Ictéricas',
  'Pálidas y húmedas',
  'Pálidas y secas',
] as const;
export const MUCOSAS_DEFAULT = 'Rosadas y húmedas';

export type PulsoOption     = typeof PULSO_OPTIONS[number];
export type GangliosOption  = typeof GANGLIOS_OPTIONS[number];
export type MucosasOption   = typeof MUCOSAS_OPTIONS[number];

// Especies disponibles
export const ESPECIES = ['Canino', 'Felino', 'Exótico', 'Bovino', 'Equino', 'Otro'] as const;

// ─── Vista del Dashboard ────────────────────────────────────

export type DashboardRow = {
  patient_id: string;
  patient_nombre: string;
  especie: string;
  raza?: string;
  photo_url?: string;
  active?: boolean;
  tutor_id: string;
  tutor_nombre: string;
  tutor_cedula: string;
  tutor_telefono?: string;
  record_id?: string;
  numero_historia?: string;
  fecha_consulta?: string;
  motivo_consulta?: string;
};
