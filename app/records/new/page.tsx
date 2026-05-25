'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePatient } from '@/hooks/usePatients';
import { getNextNumeroHistoria } from '@/hooks/useMedicalRecords';
import AppShell from '@/components/AppShell';
import { PageLoader } from '@/components/ui/Badge';
import MedicalRecordForm from '@/components/MedicalRecordForm';

function NewRecordContent() {
  const params    = useSearchParams();
  const router    = useRouter();
  const patientId = params.get('patientId') ?? '';
  const { patient, loading } = usePatient(patientId);
  const [nextNumber, setNextNumber] = useState('');

  useEffect(() => { getNextNumeroHistoria().then(setNextNumber); }, []);

  if (loading || !nextNumber) return <PageLoader />;

  return (
    <AppShell>
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        <Link href={patientId ? `/patients/${patientId}` : '/patients'} className="p-2 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">‹</Link>
        <div>
          <h1 className="text-lg font-black text-surface-800">Nueva Consulta</h1>
          {patient && <p className="text-xs text-surface-400">Paciente: {patient.nombre}</p>}
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <MedicalRecordForm
          patientId={patientId}
          existingRecord={{ numero_historia: nextNumber }}
          onSuccess={(record) => router.push(`/records/${record.id}`)}
        />
      </div>
    </AppShell>
  );
}

export default function NewRecordPage() {
  return <Suspense fallback={<PageLoader />}><NewRecordContent /></Suspense>;
}
