// lib/supabase.ts
// ============================================================
// Cliente Supabase — singleton para toda la aplicación
// ============================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    '❌ Faltan variables de entorno de Supabase. Revisa tu archivo .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnon);

// ─── Helpers de Storage ────────────────────────────────────

/**
 * Sube una foto de mascota al bucket `pet-photos`
 * y devuelve la URL pública.
 */
export async function uploadPetPhoto(
  file: File,
  patientId: string
): Promise<string | null> {
  const ext      = file.name.split('.').pop();
  const filePath = `${patientId}/profile.${ext}`;

  const { error } = await supabase.storage
    .from('pet-photos')
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error('Error subiendo foto:', error.message);
    return null;
  }

  const { data } = supabase.storage
    .from('pet-photos')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Sube un documento PDF al bucket `medical-documents`
 * y devuelve la URL pública.
 */
export async function uploadMedicalDocument(
  file: File,
  recordId: string
): Promise<string | null> {
  const filePath = `${recordId}/reporte.pdf`;

  const { error } = await supabase.storage
    .from('medical-documents')
    .upload(filePath, file, { upsert: true, contentType: 'application/pdf' });

  if (error) {
    console.error('Error subiendo documento:', error.message);
    return null;
  }

  const { data } = supabase.storage
    .from('medical-documents')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Sube un archivo (PDF/imagen) de un examen de laboratorio al bucket
 * `lab-exams` y devuelve la URL pública.
 */
export async function uploadLabExamFile(
  file: File,
  examId: string
): Promise<string | null> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const filePath = `${examId}/archivo.${ext}`;

  const { error } = await supabase.storage
    .from('lab-exams')
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error('Error subiendo examen:', error.message);
    return null;
  }

  const { data } = supabase.storage
    .from('lab-exams')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Sube una imagen de ecografía al bucket `ecografias`.
 * @param index Índice de la imagen dentro del estudio (para rutas únicas).
 */
export async function uploadEcografiaImage(
  file: File,
  ecografiaId: string,
  index: number
): Promise<string | null> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filePath = `${ecografiaId}/${index}.${ext}`;

  const { error } = await supabase.storage
    .from('ecografias')
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error('Error subiendo ecografía:', error.message);
    return null;
  }

  const { data } = supabase.storage
    .from('ecografias')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Sube un archivo (PDF) de una ecografía/rayos X al bucket `ecografias`
 * (S35). Devuelve { url } o null si falla.
 */
export async function uploadEcografiaArchivo(
  file: File,
  ecografiaId: string,
  nombre: string
): Promise<{ url: string; nombre: string; tipo: string } | null> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const filePath = `${ecografiaId}/${nombre}.${ext}`;

  const { error } = await supabase.storage
    .from('ecografias')
    .upload(filePath, file, { upsert: true, contentType: file.type || undefined });

  if (error) {
    console.error('Error subiendo archivo de ecografía:', error.message);
    return null;
  }

  const { data } = supabase.storage
    .from('ecografias')
    .getPublicUrl(filePath);

  return { url: data.publicUrl, nombre: file.name, tipo: file.type };
}
