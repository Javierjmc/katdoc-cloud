'use client';
// app/patients/[id]/reporte/page.tsx
// Reporte imprimible del paciente: secciones activables y nota editable.

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { PageLoader } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePatient } from '@/hooks/usePatients';
import { useMedicalRecords } from '@/hooks/useMedicalRecords';
import { useVaccinations } from '@/hooks/useVaccinations';
import { useLaboratoryExams } from '@/hooks/useLaboratoryExams';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { useEcografias } from '@/hooks/useEcografias';
import { SISTEMAS_CONFIG } from '@/types';
import { calcularEdad, formatearFecha, emojiEspecie } from '@/lib/utils';

type SectionKey = 'datos' | 'historial' | 'vacunas' | 'examenes' | 'recetas' | 'ecografias';

const SECTION_LABELS: Record<SectionKey, string> = {
  datos:      'Datos del paciente',
  historial:  'Historial de consultas',
  vacunas:    'Vacunas',
  examenes:   'Exámenes de laboratorio',
  recetas:    'Recetas',
  ecografias: 'Ecografías',
};

const ALL_SECTIONS: SectionKey[] = ['datos', 'historial', 'vacunas', 'examenes', 'recetas', 'ecografias'];

export default function ReportePage() {
  const { id } = useParams<{ id: string }>();
  const { patient, loading: pLoading } = usePatient(id);
  const { records, loading: rLoading } = useMedicalRecords(id);
  const { vaccinations, loading: vLoading } = useVaccinations(id);
  const { exams, loading: eLoading } = useLaboratoryExams(id);
  const { prescriptions, loading: prLoading } = usePrescriptions(id);
  const { ecografias, loading: ecLoading } = useEcografias(id);

  const [sections, setSections] = useState<Record<SectionKey, boolean>>(
    Object.fromEntries(ALL_SECTIONS.map(s => [s, true])) as Record<SectionKey, boolean>
  );
  const [notaGeneral, setNotaGeneral] = useState('');
  const [titulo, setTitulo] = useState('Informe clínico');

  const loading = pLoading || rLoading || vLoading || eLoading || prLoading || ecLoading;

  if (loading) return <PageLoader />;
  if (!patient) return (
    <AppShell>
      <div className="p-8 text-center text-surface-500 dark:text-surface-400">Paciente no encontrado</div>
    </AppShell>
  );

  const toggle = (s: SectionKey) => setSections(prev => ({ ...prev, [s]: !prev[s] }));
  const hasAny = ALL_SECTIONS.some(s => sections[s]);

  return (
    <AppShell>
      {/* Cabecera (no se imprime) */}
      <header className="no-print bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/patients/${id}`} className="p-2 rounded-xl text-surface-400 dark:text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">‹</Link>
          <div>
            <h1 className="text-lg font-black text-surface-800 dark:text-white">Reporte del paciente</h1>
            <p className="text-xs text-surface-400 dark:text-surface-500">{patient.nombre}</p>
          </div>
        </div>
        <Button onClick={() => window.print()}>🖨 Imprimir</Button>
      </header>

      <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto space-y-4">
        {/* Configuración (no se imprime) */}
        <div className="no-print bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-4 space-y-3">
          <p className="text-xs font-black text-surface-600 dark:text-surface-300 uppercase tracking-wide">Secciones del reporte</p>
          <div className="flex flex-wrap gap-2">
            {ALL_SECTIONS.map(s => (
              <button
                key={s}
                onClick={() => toggle(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  sections[s]
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
              >
                {SECTION_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">Título del reporte</span>
              <input value={titulo} onChange={e => setTitulo(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl text-sm border border-surface-200 dark:border-surface-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">Nota general</span>
              <textarea value={notaGeneral} onChange={e => setNotaGeneral(e.target.value)} rows={1}
                className="mt-1 w-full px-3 py-2 rounded-xl text-sm border border-surface-200 dark:border-surface-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 resize-none"
                placeholder="Observación que quieras incluir en el reporte..." />
            </label>
          </div>
        </div>

        {!hasAny && (
          <div className="no-print text-center py-10 text-surface-500 dark:text-surface-400">Activa al menos una sección para generar el reporte.</div>
        )}

        {/* ── Reporte imprimible ── */}
        {hasAny && (
          <div className="reporte-print bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6">
            {/* Encabezado */}
            <div className="text-center border-b-2 border-surface-300 pb-4 mb-4">
              <p className="text-2xl font-black">🐾 KATDOC</p>
              <p className="text-lg font-bold mt-1">{titulo}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400">Fecha de emisión: {formatearFecha(new Date().toISOString())}</p>
            </div>

            {sections.datos && (
              <section className="mb-5">
                <h2 className="text-sm font-black uppercase tracking-wide border-b border-surface-200 dark:border-surface-700 pb-1 mb-2">Datos del paciente</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <p><span className="font-semibold">Paciente:</span> {patient.nombre} {emojiEspecie(patient.especie)}</p>
                  <p><span className="font-semibold">Especie / Raza:</span> {patient.especie}{patient.raza ? ` / ${patient.raza}` : ''}</p>
                  <p><span className="font-semibold">Sexo:</span> {patient.sexo ?? '—'}</p>
                  <p><span className="font-semibold">Edad:</span> {calcularEdad(patient.fecha_nacimiento)}</p>
                  {patient.color && <p><span className="font-semibold">Color:</span> {patient.color}</p>}
                  <p className="col-span-2"><span className="font-semibold">Propietario:</span> {patient.tutor?.nombre} {patient.tutor?.cedula && `(${patient.tutor.cedula})`}</p>
                  {(patient.tutor?.telefono || patient.tutor?.email) && (
                    <p className="col-span-2"><span className="font-semibold">Contacto:</span> {patient.tutor?.telefono}{patient.tutor?.telefono && patient.tutor?.email ? ' · ' : ''}{patient.tutor?.email}</p>
                  )}
                </div>
              </section>
            )}

            {sections.historial && (
              <section className="mb-5">
                <h2 className="text-sm font-black uppercase tracking-wide border-b border-surface-200 dark:border-surface-700 pb-1 mb-2">Historial de consultas</h2>
                {records.length === 0 ? (
                  <p className="text-sm text-surface-400 dark:text-surface-500">Sin consultas registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {records.map(r => (
                      <div key={r.id} className="text-sm">
                        <p className="font-semibold">{r.numero_historia} · {formatearFecha(r.fecha_consulta)}</p>
                        {r.motivo_consulta && <p className="text-surface-600 dark:text-surface-300">{r.motivo_consulta}</p>}
                        {r.descripcion_hallazgos && <p className="text-surface-600 dark:text-surface-300 whitespace-pre-wrap">{r.descripcion_hallazgos}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {sections.vacunas && (
              <section className="mb-5">
                <h2 className="text-sm font-black uppercase tracking-wide border-b border-surface-200 dark:border-surface-700 pb-1 mb-2">Vacunas</h2>
                {vaccinations.length === 0 ? (
                  <p className="text-sm text-surface-400 dark:text-surface-500">Sin vacunas registradas.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-surface-500 dark:text-surface-400 border-b border-surface-200 dark:border-surface-700">
                        <th className="py-1 pr-2 font-semibold">Vacuna</th>
                        <th className="py-1 pr-2 font-semibold">Aplicada</th>
                        <th className="py-1 pr-2 font-semibold">Próxima</th>
                        <th className="py-1 font-semibold">Marca / Lote</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vaccinations.map(v => (
                        <tr key={v.id} className="border-b border-surface-100 dark:border-surface-800">
                          <td className="py-1 pr-2">{v.vacuna}</td>
                          <td className="py-1 pr-2">{v.fecha_aplicacion ? formatearFecha(v.fecha_aplicacion) : '—'}</td>
                          <td className="py-1 pr-2">{v.fecha_proxima_dosis ? formatearFecha(v.fecha_proxima_dosis) : '—'}</td>
                          <td className="py-1">{v.marca ?? ''}{v.marca && v.lote ? ' / ' : ''}{v.lote ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {sections.examenes && (
              <section className="mb-5">
                <h2 className="text-sm font-black uppercase tracking-wide border-b border-surface-200 dark:border-surface-700 pb-1 mb-2">Exámenes de laboratorio</h2>
                {exams.length === 0 ? (
                  <p className="text-sm text-surface-400 dark:text-surface-500">Sin exámenes registrados.</p>
                ) : (
                  <div className="space-y-3">
                    {exams.map(e => (
                      <div key={e.id} className="text-sm">
                        <p className="font-semibold">{e.nombre_examen} · {e.fecha_examen ? formatearFecha(e.fecha_examen) : 'Sin fecha'}{e.laboratorio_origen ? ` (${e.laboratorio_origen})` : ''}</p>
                        {e.analitos.length > 0 && (
                          <table className="w-full mt-1">
                            <thead>
                              <tr className="text-left text-surface-500 dark:text-surface-400 border-b border-surface-200 dark:border-surface-700">
                                <th className="py-0.5 pr-2 font-semibold">Analito</th>
                                <th className="py-0.5 pr-2 font-semibold">Valor</th>
                                <th className="py-0.5 pr-2 font-semibold">Unidad</th>
                                <th className="py-0.5 font-semibold">Referencia</th>
                              </tr>
                            </thead>
                            <tbody>
                              {e.analitos.map((a, i) => (
                                <tr key={i} className="border-b border-surface-100 dark:border-surface-800">
                                  <td className="py-0.5 pr-2">{a.nombre}</td>
                                  <td className="py-0.5 pr-2 font-semibold">{a.valor}</td>
                                  <td className="py-0.5 pr-2">{a.unidad ?? ''}</td>
                                  <td className="py-0.5">{a.rango ?? ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {e.notas && <p className="text-surface-600 dark:text-surface-300 mt-1">{e.notas}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {sections.recetas && (
              <section className="mb-5">
                <h2 className="text-sm font-black uppercase tracking-wide border-b border-surface-200 dark:border-surface-700 pb-1 mb-2">Recetas</h2>
                {prescriptions.length === 0 ? (
                  <p className="text-sm text-surface-400 dark:text-surface-500">Sin recetas registradas.</p>
                ) : (
                  <div className="space-y-3">
                    {prescriptions.map(p => (
                      <div key={p.id} className="text-sm">
                        <p className="font-semibold">{p.titulo ?? 'Receta'} · {p.fecha ? formatearFecha(p.fecha) : ''}</p>
                        <ol className="list-decimal list-inside">
                          {p.medicamentos.map((m, i) => (
                            <li key={i} className="text-surface-600 dark:text-surface-300">
                              {m.nombre}
                              {m.dosis && ` — ${m.dosis}`}
                              {m.frecuencia && `, ${m.frecuencia}`}
                              {m.duracion && `, ${m.duracion}`}
                              {m.indicaciones && ` (${m.indicaciones})`}
                            </li>
                          ))}
                        </ol>
                        {p.notas && <p className="text-surface-600 dark:text-surface-300">{p.notas}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {sections.ecografias && (
              <section className="mb-5">
                <h2 className="text-sm font-black uppercase tracking-wide border-b border-surface-200 dark:border-surface-700 pb-1 mb-2">Ecografías</h2>
                {ecografias.length === 0 ? (
                  <p className="text-sm text-surface-400 dark:text-surface-500">Sin ecografías registradas.</p>
                ) : (
                  <div className="space-y-3">
                    {ecografias.map(e => (
                      <div key={e.id} className="text-sm">
                        <p className="font-semibold">Ecografía {e.organo ? `· ${e.organo}` : ''} · {e.fecha ? formatearFecha(e.fecha) : ''}</p>
                        {e.hallazgos && <p className="text-surface-600 dark:text-surface-300 whitespace-pre-wrap">{e.hallazgos}</p>}
                        {e.conclusiones && <p className="text-surface-600 dark:text-surface-300 whitespace-pre-wrap"><span className="font-semibold">Conclusión:</span> {e.conclusiones}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {notaGeneral.trim() && (
              <section className="mb-5">
                <h2 className="text-sm font-black uppercase tracking-wide border-b border-surface-200 dark:border-surface-700 pb-1 mb-2">Nota general</h2>
                <p className="text-sm text-surface-700 dark:text-surface-200 whitespace-pre-wrap">{notaGeneral}</p>
              </section>
            )}

            {/* Sistemas del último registro (si existe) */}
            {records[0]?.sistemas_status && (
              <section>
                <h2 className="text-sm font-black uppercase tracking-wide border-b border-surface-200 dark:border-surface-700 pb-1 mb-2">Estado clínico — último registro</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {SISTEMAS_CONFIG.map(s => {
                    const st = records[0].sistemas_status?.[s.key] ?? 'NE';
                    return (
                      <p key={s.key}><span className="font-semibold">{s.label}:</span> {st}</p>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
