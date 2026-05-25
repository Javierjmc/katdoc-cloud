'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePatient } from '@/hooks/usePatients';
import AppShell from '@/components/AppShell';
import { PageLoader } from '@/components/ui/Badge';
import PatientForm from '@/components/PatientForm';

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { patient, loading } = usePatient(id);

  if (loading) return <PageLoader />;

  return (
    <AppShell>
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        <Link href={`/patients/${id}`} className="p-2 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">‹</Link>
        <div>
          <h1 className="text-lg font-black text-surface-800">Editar Paciente</h1>
          <p className="text-xs text-surface-400">{patient?.nombre}</p>
        </div>
      </header>
      <div className="max-w-2xl mx-auto">
        {patient && (
          <PatientForm
            existingPatient={patient}
            onSuccess={() => router.push(`/patients/${id}`)}
          />
        )}
      </div>
    </AppShell>
  );
}
