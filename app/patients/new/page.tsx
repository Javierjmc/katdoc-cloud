'use client';
// Lee query params del tutor cuando viene desde la página de Tutores
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AppShell from '@/components/AppShell';
import PatientForm from '@/components/PatientForm';
import { PageLoader } from '@/components/ui/Badge';
import Link from 'next/link';

function NewPatientContent() {
  const router = useRouter();
  const params = useSearchParams();

  // Pre-rellena datos del tutor si vienen por URL
  const prefillTutor = params.get('tutorId') ? {
    id:        params.get('tutorId')   ?? undefined,
    nombre:    params.get('nombre')    ?? '',
    cedula:    params.get('cedula')    ?? '',
    telefono:  params.get('telefono')  ?? '',
    email:     params.get('email')     ?? '',
    direccion: params.get('direccion') ?? '',
  } : undefined;

  return (
    <AppShell>
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        <Link href={prefillTutor ? '/tutors' : '/patients'} className="p-2 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">‹</Link>
        <div>
          <h1 className="text-lg font-black text-surface-800">Nuevo Paciente</h1>
          <p className="text-xs text-surface-400">
            {prefillTutor?.nombre ? `Tutor: ${prefillTutor.nombre}` : 'Completa los datos del propietario y la mascota'}
          </p>
        </div>
      </header>
      <div className="max-w-2xl mx-auto">
        <PatientForm
          prefillTutor={prefillTutor}
          onSuccess={(id) => router.push(`/patients/${id}`)}
        />
      </div>
    </AppShell>
  );
}

export default function NewPatientPage() {
  return <Suspense fallback={<PageLoader />}><NewPatientContent /></Suspense>;
}
