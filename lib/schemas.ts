// lib/schemas.ts
// ============================================================
// Esquemas de validación con zod (S25).
// Centraliza reglas por entidad y se usa en los formularios.
// ============================================================
import { z } from 'zod';

const optionalTrimmed = (min: number, max: number, msg: string) =>
  z.string().trim().min(min, msg).max(max);

// ─── Tutor ───────────────────────────────────────────────────
export const tutorSchema = z.object({
  nombre:    optionalTrimmed(2, 120, 'El nombre del tutor es obligatorio'),
  cedula:    optionalTrimmed(3, 30, 'La cédula del tutor es obligatoria'),
  telefono:  z.string().trim().max(20, 'Teléfono demasiado largo').optional(),
  email:     z.string().trim().email('Email inválido').max(120).optional().or(z.literal('')),
  direccion: z.string().trim().max(200).optional(),
});

// ─── Paciente ────────────────────────────────────────────────
export const patientSchema = z.object({
  nombre:           optionalTrimmed(1, 100, 'El nombre del paciente es obligatorio'),
  especie:          optionalTrimmed(1, 40, 'La especie es obligatoria'),
  raza:             z.string().trim().max(80).optional(),
  fecha_nacimiento: z.string().trim().refine(
    v => v === '' || (!Number.isNaN(Date.parse(v))),
    'Fecha de nacimiento inválida'
  ).optional().or(z.literal('')),
  color:            z.string().trim().max(60).optional(),
  sexo:             z.enum(['', 'Macho', 'Hembra']).optional(),
  photo_url:        z.string().trim().optional(),
});

export const patientFormSchema = z.object({
  tutor:   tutorSchema,
  patient: patientSchema,
});

// ─── Cita ────────────────────────────────────────────────────
export const appointmentSchema = z.object({
  patient_id: z.string().uuid('Selecciona un paciente'),
  fecha:      z.string().trim().refine(v => !Number.isNaN(Date.parse(v)), 'La fecha es obligatoria'),
  hora:       z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida').optional().or(z.literal('')),
  motivo:     z.string().trim().max(200).optional(),
  notas:      z.string().trim().max(500).optional(),
  estado:     z.enum(['programada', 'confirmada', 'completada', 'cancelada', 'no_asistio']).optional(),
});

// ─── Vacuna ──────────────────────────────────────────────────
export const vaccinationSchema = z.object({
  vacuna:             optionalTrimmed(1, 120, 'El nombre de la vacuna es obligatorio'),
  fecha_aplicacion:   z.string().trim().optional().or(z.literal('')),
  fecha_proxima_dosis: z.string().trim().optional().or(z.literal('')),
});

// ─── Utilidades ──────────────────────────────────────────────
export type FieldErrors = Record<string, string>;

/** Extrae el primer error por campo de un resultado zod. */
export function toFieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Valida y devuelve errores planos o null si es válido. */
export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): FieldErrors | null {
  const res = schema.safeParse(data);
  if (res.success) return null;
  return toFieldErrors(res.error);
}
