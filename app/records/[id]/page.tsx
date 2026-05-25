'use client';
// app/records/[id]/page.tsx
// Ver y editar una historia clínica existente

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMedicalRecord, deleteMedicalRecord } from '@/hooks/useMedicalRecords';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageLoader, EmptyState, Card } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SISTEMAS_CONFIG } from '@/types';
import MedicalRecordForm from '@/components/MedicalRecordForm';

type ViewMode = 'view' | 'edit';

export default function RecordDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const { record, loading } = useMedicalRecord(id);
  const [mode, setMode]     = useState<ViewMode>('view');
  const [deleting, setDeleting] = useState(false);

  if (loading) return <PageLoader />;

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <PageHeader title="Historia no encontrada" backHref="/dashboard" />
        <EmptyState icon="📋" title="No se encontró la historia clínica" />
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta historia clínica? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    const { error } = await deleteMedicalRecord(id);
    if (!error) {
      router.push(`/patients/${record.patient_id}`);
    } else {
      alert('Error al eliminar: ' + error);
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader
        title={record.numero_historia ?? 'Historia Clínica'}
        subtitle={record.fecha_consulta
          ? new Date(record.fecha_consulta).toLocaleDateString('es-VE', {
              day: 'numeric', month: 'long', year: 'numeric',
            })
          : undefined
        }
        backHref={`/patients/${record.patient_id}`}
        action={
          <button
            onClick={() => setMode(mode === 'view' ? 'edit' : 'view')}
            className="
              px-3 py-2 rounded-xl text-sm font-semibold
              bg-slate-100 dark:bg-slate-800
              text-slate-700 dark:text-slate-200
              hover:bg-slate-200 dark:hover:bg-slate-700
              transition-colors
            "
          >
            {mode === 'view' ? '✏️ Editar' : '👁 Ver'}
          </button>
        }
      />

      <div className="max-w-xl mx-auto px-4 py-4">
        {mode === 'edit' ? (
          // ─ Modo edición
          <MedicalRecordForm
            patientId={record.patient_id}
            existingRecord={record}
            onSuccess={() => setMode('view')}
          />
        ) : (
          // ─ Modo lectura
          <div className="space-y-4">

            {/* Motivo de consulta */}
            {record.motivo_consulta && (
              <Card>
                <h3 className="section-title">🩺 Motivo de Consulta</h3>
                <p className="text-sm text-slate-700 dark:text-slate-200 mt-2 whitespace-pre-wrap">
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
                      NE: 'text-slate-400 bg-slate-100 dark:bg-slate-800',
                    };
                    return (
                      <div key={s.key} className="flex items-center gap-2 text-sm">
                        <span>{s.icon}</span>
                        <span className="flex-1 text-slate-700 dark:text-slate-200 text-xs">{s.label}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${colorMap[status]}`}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {record.descripcion_hallazgos && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
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
                  bg-teal-50 dark:bg-teal-950/30
                  border border-teal-200 dark:border-teal-900
                  text-teal-700 dark:text-teal-300 text-sm font-semibold
                  hover:bg-teal-100 transition-colors
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
                loading={deleting}
                onClick={handleDelete}
              >
                🗑️ Eliminar esta historia clínica
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .section-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: rgb(71 85 105);
          border-bottom: 1px solid rgb(226 232 240);
          padding-bottom: 0.5rem;
        }
        .dark .section-title {
          color: rgb(148 163 184);
          border-bottom-color: rgb(30 41 59);
        }
      `}</style>
    </div>
  );
}

function VitalRow({ label, value, unit }: { label: string; value?: string | null; unit?: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}

function AnamRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs text-slate-400">{label}: </span>
      <span className="text-xs text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}
