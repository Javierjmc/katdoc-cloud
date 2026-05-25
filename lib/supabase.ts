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
