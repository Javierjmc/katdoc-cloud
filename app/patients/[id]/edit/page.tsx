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
      <header className="bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        <Link href={`/patients/${id}`} className="p-2 rounded-xl text-surface-400 dark:text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">‹</Link>
        <div>
          <h1 className="text-lg font-black text-surface-800 dark:text-white">Editar Paciente</h1>
          <p className="text-xs text-surface-400 dark:text-surface-500">{patient?.nombre}</p>
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
