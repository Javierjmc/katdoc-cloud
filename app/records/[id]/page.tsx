'use client';
// app/records/[id]/page.tsx
// Ver y editar una historia clínica existente

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useMedicalRecord, deleteMedicalRecord } from '@/hooks/useMedicalRecords';
import { PageLoader, EmptyState, Card } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import AppShell from '@/components/AppShell';
import { SISTEMAS_CONFIG } from '@/types';
import MedicalRecordForm from '@/components/MedicalRecordForm';

type ViewMode = 'view' | 'edit';

export default function RecordDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const { toast } = useToast();

  const { record, loading } = useMedicalRecord(id);
  const [mode, setMode]     = useState<ViewMode>('view');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) return <PageLoader />;

  if (!record) {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <EmptyState icon="📋" title="No se encontró la historia clínica" />
        </div>
      </AppShell>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await deleteMedicalRecord(id);
    setDeleting(false);
    setConfirmDelete(false);
    if (error) {
      toast(`Error al eliminar: ${error}`, 'error');
    } else {
      toast('Historia eliminada', 'success');
      router.push(`/patients/${record.patient_id}`);
    }
  };

  return (
    <AppShell>
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/patients/${record.patient_id}`} className="p-2 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">‹</Link>
          <div>
            <h1 className="text-lg font-black text-surface-800">{record.numero_historia ?? 'Historia Clínica'}</h1>
            <p className="text-xs text-surface-400">
              {record.fecha_consulta
                ? new Date(record.fecha_consulta).toLocaleDateString('es-VE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })
                : undefined}
            </p>
          </div>
        </div>
        <button
          onClick={() => setMode(mode === 'view' ? 'edit' : 'view')}
          className="px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-semibold transition-colors"
        >
          {mode === 'view' ? '✏️ Editar' : '👁 Ver'}
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {mode === 'edit' ? (
          // ─ Modo edición
          <MedicalRecordForm
            patientId={record.patient_id}
            existingRecord={record}
            sexo={record.patient?.sexo}
            onSuccess={() => setMode('view')}
          />
        ) : (
          // ─ Modo lectura
          <div className="space-y-4">

            {/* Motivo de consulta */}
            {record.motivo_consulta && (
              <Card>
                <h3 className="section-title">🩺 Motivo de Consulta</h3>
                <p className="text-sm text-surface-700 dark:text-surface-200 mt-2 whitespace-pre-wrap">
                  {record.motivo_consulta}
                </p>
              </Card>
            )}

            {/* Constantes vitales */}
            <Card>
              <h3 className="section-title">❤️ Constantes Vitales</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <VitalRow label="Frec. Respiratoria" value={record.f_respiratoria} unit="frpm" />
                <VitalRow label="Frec. Cardíaca"     value={record.f_cardiaca}     unit="fcpm" />
                <VitalRow label="Temperatura"         value={record.temperatura?.toString()} unit="°C" />
                <VitalRow label="Pulso"               value={record.pulso} />
                <VitalRow label="TLC"                 value={record.tiempo_llenado_capilar} />
                <VitalRow label="Ganglios"            value={record.ganglios_linfaticos} />
                <VitalRow label="Mucosas"             value={record.mucosas} />
                <VitalRow label="Actitud"             value={record.actitud_temperamento} />
              </div>
            </Card>

            {/* Órganos y sistemas */}
            {record.sistemas_status && (
              <Card>
                <h3 className="section-title">🔬 Órganos y Sistemas</h3>
                <div className="space-y-1.5 mt-2">
                  {SISTEMAS_CONFIG.map(s => {
                    const status = record.sistemas_status?.[s.key] ?? 'NE';
                    const colorMap = {
                      N:  'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30',
                      AN: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
                      NE: 'text-surface-400 bg-surface-100 dark:bg-surface-800',
                    };
                    return (
                      <div key={s.key}>
                        <div className="flex items-center gap-2 text-sm">
                          <span>{s.icon}</span>
                          <span className="flex-1 text-surface-700 dark:text-surface-200 text-xs">{s.label}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${colorMap[status]}`}>
                            {status}
                          </span>
                        </div>
                        {record.sistemas_notas?.[s.key] && (
                          <p className="mt-1 ml-6 pl-1 border-l-2 border-surface-200 dark:border-surface-700 text-xs text-surface-500 dark:text-surface-400 whitespace-pre-wrap">
                            {record.sistemas_notas[s.key]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {record.descripcion_hallazgos && (
                  <div className="mt-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 text-xs text-surface-600 dark:text-surface-300 whitespace-pre-wrap">
                    {record.descripcion_hallazgos}
                  </div>
                )}
              </Card>
            )}

            {/* Anamnésicos */}
            <Card>
              <h3 className="section-title">📖 Anamnésicos</h3>
              <div className="space-y-1.5 mt-2">
                <AnamRow label="Desparasitación" value={record.ultima_desparasitacion} />
                <AnamRow label="Vacunas"         value={record.vacunas} />
                <AnamRow label="Enfermedades"    value={record.enfermedades_anteriores} />
                <AnamRow label="Tratamientos"    value={record.tratamientos_actuales} />
                <AnamRow label="Alimentación"    value={record.alimentacion} />
                <AnamRow label="Reproductivo"    value={record.historial_reproductivo} />
              </div>
            </Card>

            {/* Documento adjunto */}
            {record.document_url && (
              <a
                href={record.document_url}
                target="_blank"
                rel="noreferrer"
                className="
                  flex items-center gap-2 p-3 rounded-2xl
                  bg-brand-50 dark:bg-brand-950/30
                  border border-brand-200 dark:border-brand-900
                  text-brand-700 dark:text-brand-300 text-sm font-semibold
                  hover:bg-brand-100 transition-colors
                "
              >
                📄 Ver documento PDF adjunto
              </a>
            )}

            {/* Zona de peligro */}
            <div className="pt-2">
              <Button
                variant="danger"
                fullWidth
                onClick={() => setConfirmDelete(true)}
              >
                🗑️ Eliminar esta historia clínica
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar historia clínica"
        message="¿Eliminar esta historia clínica? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <style jsx global>{`
        .section-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: rgb(96 96 96);
          border-bottom: 1px solid rgb(224 224 224);
          padding-bottom: 0.5rem;
        }
        .dark .section-title {
          color: rgb(192 192 192);
          border-bottom-color: rgb(64 64 64);
        }
      `}</style>
    </AppShell>
  );
}

function VitalRow({ label, value, unit }: { label: string; value?: string | null; unit?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-surface-400">{label}</span>
      <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}

function AnamRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-surface-400">{label}: </span>
      <span className="text-xs text-surface-700 dark:text-surface-200">{value}</span>
    </div>
  );
}
