'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { usePatient } from '@/hooks/usePatients';
import { useMedicalRecords } from '@/hooks/useMedicalRecords';
import AppShell from '@/components/AppShell';
import { PageLoader, EmptyState } from '@/components/ui/Badge';
import { calcularEdad } from '@/lib/utils';

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { patient, loading: pLoading } = usePatient(id);
  const { records, loading: rLoading } = useMedicalRecords(id);

  if (pLoading) return <PageLoader />;
  if (!patient) return (
    <AppShell>
      <EmptyState icon="🔍" title="Paciente no encontrado" />
    </AppShell>
  );

  const emoji: Record<string, string> = { Canino:'🐶', Felino:'🐱', Exótico:'🦜', Bovino:'🐄', Equino:'🐴', Otro:'🐾' };

  return (
    <AppShell>
      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/patients" className="p-2 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">‹</Link>
          <div>
            <h1 className="text-lg font-black text-surface-800">{patient.nombre}</h1>
            <p className="text-xs text-surface-400">{patient.especie} · {patient.raza ?? 'Sin raza'}</p>
          </div>
        </div>
        <Link href={`/records/new?patientId=${id}`}
          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors shadow-md shadow-brand-500/20">
          + Consulta
        </Link>
      </header>

      <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Columna izquierda ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Foto + datos básicos */}
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
              <div className="h-48 bg-brand-50 flex items-center justify-center relative">
                {patient.photo_url
                  ? <Image src={patient.photo_url} alt={patient.nombre} fill className="object-cover" />
                  : <span className="text-7xl">{emoji[patient.especie] ?? '🐾'}</span>
                }
              </div>
              <div className="p-4">
                <h2 className="text-xl font-black text-surface-800">{patient.nombre}</h2>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Chip label={patient.especie} color="brand" />
                  {patient.sexo && <Chip label={patient.sexo} color="slate" />}
                  {patient.color && <Chip label={patient.color} color="slate" />}
                </div>
                {patient.fecha_nacimiento && (
                  <p className="text-sm text-surface-500 mt-3">📅 {calcularEdad(patient.fecha_nacimiento)}</p>
                )}
                <Link href={`/patients/${id}/edit`}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-600 text-sm font-semibold transition-colors">
                  ✏️ Editar datos
                </Link>
              </div>
            </div>

            {/* Propietario */}
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm p-4">
              <h3 className="text-sm font-black text-surface-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-brand-50 flex items-center justify-center text-sm">👤</span>
                Propietario
              </h3>
              <div className="space-y-2">
                {[
                  { icon: '🧑', label: patient.tutor?.nombre },
                  { icon: '🪪', label: patient.tutor?.cedula },
                  { icon: '📞', label: patient.tutor?.telefono },
                  { icon: '📧', label: patient.tutor?.email },
                  { icon: '📍', label: patient.tutor?.direccion },
                ].filter(r => r.label).map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span>{r.icon}</span>
                    <span className="text-surface-600 break-all">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Columna derecha: historial ── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-surface-800 text-lg">
                Historial de Consultas
                <span className="ml-2 text-sm font-bold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">{records.length}</span>
              </h3>
              <Link href={`/records/new?patientId=${id}`} className="text-sm font-bold text-brand-500 hover:underline">+ Nueva</Link>
            </div>

            {rLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-surface-200 animate-pulse" />)}
              </div>
            ) : records.length === 0 ? (
              <EmptyState icon="📋" title="Sin consultas" subtitle="Registra la primera consulta."
                action={<Link href={`/records/new?patientId=${id}`} className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold">Nueva Consulta</Link>}
              />
            ) : (
              <div className="space-y-3">
                {records.map(record => (
                  <Link key={record.id} href={`/records/${record.id}`}
                    className="flex items-start gap-4 bg-white rounded-2xl border border-surface-200 hover:border-brand-400 hover:shadow-md hover:shadow-brand-500/10 p-4 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center shrink-0">
                      <span className="text-xl">📋</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-brand-600 text-sm">{record.numero_historia}</span>
                        <span className="text-xs text-surface-400">{record.fecha_consulta ? new Date(record.fecha_consulta).toLocaleDateString('es-VE') : '—'}</span>
                      </div>
                      {record.motivo_consulta && (
                        <p className="text-sm text-surface-600 mt-1 line-clamp-2">{record.motivo_consulta}</p>
                      )}
                    </div>
                    <span className="text-surface-300 group-hover:text-brand-400 transition-colors mt-1">›</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Chip({ label, color }: { label: string; color: 'brand' | 'slate' }) {
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
      color === 'brand'
        ? 'bg-brand-50 text-brand-600 border-brand-200'
        : 'bg-surface-100 text-surface-500 border-surface-200'
    }`}>
      {label}
    </span>
  );
}
