'use client';
// Página para editar datos de un tutor
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import { PageLoader } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorMessage, SuccessMessage } from '@/components/ui/Badge';
import type { Tutor } from '@/types';

export default function EditTutorPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [tutor, setTutor]     = useState<Partial<Tutor>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    supabase.from('tutors').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setTutor(data); setLoading(false); });
  }, [id]);

  const set = (key: keyof Tutor, val: string) => setTutor(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!tutor.nombre?.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!tutor.cedula?.trim()) { setError('La cédula es obligatoria.'); return; }
    setSaving(true); setError(''); setSuccess('');
    const { error: err } = await supabase.from('tutors').update({
      nombre: tutor.nombre, cedula: tutor.cedula,
      telefono: tutor.telefono, email: tutor.email, direccion: tutor.direccion,
    }).eq('id', id);
    if (err) setError(err.message);
    else { setSuccess('Datos actualizados.'); setTimeout(() => router.push('/tutors'), 1000); }
    setSaving(false);
  };

  if (loading) return <PageLoader />;

  return (
    <AppShell>
      <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        <Link href="/tutors" className="p-2 rounded-xl text-surface-400 dark:text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">‹</Link>
        <div>
          <h1 className="text-lg font-black text-surface-800 dark:text-white">Editar Propietario</h1>
          <p className="text-xs text-surface-400 dark:text-surface-500">{tutor.nombre}</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4 pb-28">
        {error   && <ErrorMessage   message={error}   />}
        {success && <SuccessMessage message={success} />}

        <Field label="Nombre completo" required>
          <Input value={tutor.nombre ?? ''} onChange={e => set('nombre', e.target.value)} placeholder="María González" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cédula / DNI" required>
            <Input value={tutor.cedula ?? ''} onChange={e => set('cedula', e.target.value)} placeholder="V-12345678" />
          </Field>
          <Field label="Teléfono">
            <Input value={tutor.telefono ?? ''} onChange={e => set('telefono', e.target.value)} placeholder="0412-000-0000" type="tel" />
          </Field>
        </div>
        <Field label="Email">
          <Input value={tutor.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" type="email" />
        </Field>
        <Field label="Dirección">
          <Input value={tutor.direccion ?? ''} onChange={e => set('direccion', e.target.value)} placeholder="Urb. Las Palmas..." />
        </Field>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-surface-800 border-t border-surface-200 dark:border-surface-700 px-4 py-3 md:left-16 lg:left-64">
          <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
            💾 Guardar Cambios
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
