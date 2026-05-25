'use client';
// components/MedicalRecordForm.tsx

import { useState, useCallback } from 'react';
import { supabase, uploadMedicalDocument } from '@/lib/supabase';
import {
  SISTEMAS_CONFIG,
  ACTITUD_OPTIONS,
  type MedicalRecord,
  type SistemaStatus,
  type SistemasStatusMap,
} from '@/types';

type FormData = Omit<MedicalRecord, 'id' | 'created_at' | 'patient'>;

interface MedicalRecordFormProps {
  patientId: string;
  existingRecord?: Partial<MedicalRecord>;
  onSuccess?: (record: MedicalRecord) => void;
}

const INITIAL_SISTEMAS: SistemasStatusMap = Object.fromEntries(
  SISTEMAS_CONFIG.map(s => [s.key, 'NE'])
) as SistemasStatusMap;

export default function MedicalRecordForm({
  patientId,
  existingRecord,
  onSuccess,
}: MedicalRecordFormProps) {
  const [form, setForm] = useState<Partial<MedicalRecord>>({
    patient_id:      patientId,
    numero_historia: existingRecord?.numero_historia ?? '',
    fecha_consulta:  existingRecord?.fecha_consulta  ?? new Date().toISOString().split('T')[0],
    sistemas_status: existingRecord?.sistemas_status ?? INITIAL_SISTEMAS,
    ...existingRecord,
  });

  const [pdfFile, setPdfFile]   = useState<File | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  const set = useCallback((key: keyof MedicalRecord, value: unknown) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const setSistema = useCallback((key: keyof SistemasStatusMap, status: SistemaStatus) => {
    setForm(prev => ({
      ...prev,
      sistemas_status: { ...prev.sistemas_status, [key]: status },
    }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const isNew = !existingRecord?.id;

      // Payload limpio — sin undefined ni null
      const payload: Record<string, unknown> = {};

      const allFields: (keyof MedicalRecord)[] = [
        'patient_id','numero_historia','fecha_consulta',
        'ultima_desparasitacion','vacunas','enfermedades_anteriores',
        'tratamientos_actuales','evolucion','alimentacion',
        'historial_reproductivo','ultimo_celo','fecha_ultimo_parto',
        'motivo_consulta','f_respiratoria','f_cardiaca','temperatura',
        'pulso','tiempo_llenado_capilar','ganglios_linfaticos',
        'mucosas','actitud_temperamento','descripcion_hallazgos',
        'sistemas_status',
      ];

      payload.patient_id = patientId;

      allFields.forEach(f => {
        const val = form[f];
        if (val !== undefined && val !== null && val !== '') {
          payload[f] = val;
        }
      });

      // Sistemas siempre incluirlo aunque esté vacío
      if (form.sistemas_status) {
        payload.sistemas_status = form.sistemas_status;
      }

      let savedData: MedicalRecord;

      if (isNew) {
        // INSERT
        const { data, error: err } = await supabase
          .from('medical_records')
          .insert(payload)
          .select()
          .single();

        if (err) throw new Error(err.message);
        savedData = data as MedicalRecord;
      } else {
        // UPDATE
        const { data, error: err } = await supabase
          .from('medical_records')
          .update(payload)
          .eq('id', existingRecord!.id!)
          .select()
          .single();

        if (err) throw new Error(err.message);
        savedData = data as MedicalRecord;
      }

      // Subir PDF después de tener el ID
      if (pdfFile && savedData.id) {
        const url = await uploadMedicalDocument(pdfFile, savedData.id);
        if (url) {
          await supabase
            .from('medical_records')
            .update({ document_url: url })
            .eq('id', savedData.id);
          savedData.document_url = url;
        }
      }

      setSaved(true);
      onSuccess?.(savedData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(`Error al guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 pb-24">

      <Section title="📋 Identificación" defaultOpen>
        <div className="grid grid-cols-2 gap-3">
          <Field label="N° Historia" className="col-span-2 sm:col-span-1">
            <Input
              value={form.numero_historia ?? ''}
              onChange={v => set('numero_historia', v)}
              placeholder="HC-2026-0001"
            />
          </Field>
          <Field label="Fecha de Consulta" className="col-span-2 sm:col-span-1">
            <Input
              type="date"
              value={form.fecha_consulta?.toString().split('T')[0] ?? ''}
              onChange={v => set('fecha_consulta', v)}
            />
          </Field>
          <Field label="Motivo de Consulta" className="col-span-2">
            <Textarea
              value={form.motivo_consulta ?? ''}
              onChange={v => set('motivo_consulta', v)}
              placeholder="Describe el motivo principal de la visita..."
              rows={3}
            />
          </Field>
        </div>
      </Section>

      <Section title="📖 Anamnésicos">
        <div className="grid grid-cols-1 gap-3">
          <Field label="Última Desparasitación (Fecha y Producto)">
            <Input value={form.ultima_desparasitacion ?? ''} onChange={v => set('ultima_desparasitacion', v)} placeholder="Ej: 15/01/2025 — Ivermectina 1%" />
          </Field>
          <Field label="Vacunas (Fecha, Marca, Lote)">
            <Input value={form.vacunas ?? ''} onChange={v => set('vacunas', v)} placeholder="Ej: 20/03/2025 — Nobivac — Lote A1234" />
          </Field>
          <Field label="Enfermedades Anteriores">
            <Textarea value={form.enfermedades_anteriores ?? ''} onChange={v => set('enfermedades_anteriores', v)} placeholder="Patologías previas relevantes..." />
          </Field>
          <Field label="Tratamientos Actuales">
            <Textarea value={form.tratamientos_actuales ?? ''} onChange={v => set('tratamientos_actuales', v)} placeholder="Medicamentos o terapias en curso..." />
          </Field>
          <Field label="Evolución">
            <Textarea value={form.evolucion ?? ''} onChange={v => set('evolucion', v)} placeholder="Evolución de los síntomas actuales..." />
          </Field>
          <Field label="Alimentación">
            <Input value={form.alimentacion ?? ''} onChange={v => set('alimentacion', v)} placeholder="Ej: Croquetas premium 2x/día" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Historial Reproductivo" className="col-span-2 sm:col-span-1">
              <Select
                value={form.historial_reproductivo ?? ''}
                onChange={v => set('historial_reproductivo', v)}
                options={['Entero/a', 'Esterilizado/a', 'Castrado/a', 'Desconocido']}
                placeholder="Seleccionar..."
              />
            </Field>
            <Field label="Último Celo" className="col-span-2 sm:col-span-1">
              <Input value={form.ultimo_celo ?? ''} onChange={v => set('ultimo_celo', v)} placeholder="Ej: Hace 2 meses / No aplica" />
            </Field>
            <Field label="Último Parto" className="col-span-2 sm:col-span-1">
              <Input value={form.fecha_ultimo_parto ?? ''} onChange={v => set('fecha_ultimo_parto', v)} placeholder="Fecha o descripción" />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="❤️ Examen Clínico / Constantes Vitales">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frec. Respiratoria (frpm)">
            <Input value={form.f_respiratoria ?? ''} onChange={v => set('f_respiratoria', v)} placeholder="Ej: 24" inputMode="numeric" />
          </Field>
          <Field label="Frec. Cardíaca (fcpm)">
            <Input value={form.f_cardiaca ?? ''} onChange={v => set('f_cardiaca', v)} placeholder="Ej: 80" inputMode="numeric" />
          </Field>
          <Field label="Temperatura (°C)">
            <Input type="number" step="0.1" value={form.temperatura?.toString() ?? ''} onChange={v => set('temperatura', parseFloat(v) || undefined)} placeholder="Ej: 38.5" />
          </Field>
          <Field label="Pulso">
            <Input value={form.pulso ?? ''} onChange={v => set('pulso', v)} placeholder="Ej: Fuerte y regular" />
          </Field>
          <Field label="T. Llenado Capilar">
            <Input value={form.tiempo_llenado_capilar ?? ''} onChange={v => set('tiempo_llenado_capilar', v)} placeholder="Ej: < 2 seg" />
          </Field>
          <Field label="Ganglios Linfáticos">
            <Input value={form.ganglios_linfaticos ?? ''} onChange={v => set('ganglios_linfaticos', v)} placeholder="Ej: No palpables" />
          </Field>
          <Field label="Mucosas">
            <Input value={form.mucosas ?? ''} onChange={v => set('mucosas', v)} placeholder="Ej: Rosadas, húmedas" />
          </Field>
          <Field label="Actitud / Temperamento">
            <Select
              value={form.actitud_temperamento ?? ''}
              onChange={v => set('actitud_temperamento', v)}
              options={[...ACTITUD_OPTIONS]}
              placeholder="Seleccionar..."
            />
          </Field>
        </div>
      </Section>

      <Section title="🔬 Órganos y Sistemas">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          <strong>N</strong> Normal · <strong>AN</strong> Anormal · <strong>NE</strong> No Examinado
        </p>
        <div className="space-y-2">
          {SISTEMAS_CONFIG.map(sistema => (
            <SistemaRow
              key={sistema.key}
              sistema={sistema}
              value={form.sistemas_status?.[sistema.key] ?? 'NE'}
              onChange={status => setSistema(sistema.key, status)}
            />
          ))}
        </div>
        <Field label="Descripción de Hallazgos Anormales" className="mt-4">
          <Textarea
            value={form.descripcion_hallazgos ?? ''}
            onChange={v => set('descripcion_hallazgos', v)}
            placeholder="Detalla cualquier hallazgo anormal..."
            rows={4}
          />
        </Field>
      </Section>

      <Section title="📎 Documentos Adjuntos">
        <Field label="Subir Reporte PDF">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-teal-400 transition-colors">
            <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files?.[0] ?? null)} className="hidden" id="pdf-upload" />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <div className="text-2xl mb-1">📄</div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {pdfFile ? pdfFile.name : 'Toca para seleccionar un PDF'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Máximo 10 MB</p>
            </label>
          </div>
        </Field>
        {form.document_url && (
          <a href={form.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-teal-600 dark:text-teal-400 hover:underline mt-2">
            📄 Ver documento actual
          </a>
        )}
      </Section>

      {/* Footer fijo */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-3">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        {saved && <p className="text-xs text-teal-600 dark:text-teal-400 mb-2">✓ Historia guardada correctamente</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
            saving
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-teal-500 hover:bg-teal-600 active:scale-95 text-white shadow-lg shadow-teal-500/30'
          }`}
        >
          {saving ? '⏳ Guardando...' : '💾 Guardar Historia Clínica'}
        </button>
      </div>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────

function SistemaRow({ sistema, value, onChange }: {
  sistema: typeof SISTEMAS_CONFIG[number];
  value: SistemaStatus;
  onChange: (s: SistemaStatus) => void;
}) {
  const options: { val: SistemaStatus; color: string }[] = [
    { val: 'N',  color: 'bg-green-500 text-white' },
    { val: 'AN', color: 'bg-red-500 text-white' },
    { val: 'NE', color: 'bg-slate-400 text-white' },
  ];
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
      <span className="text-lg shrink-0">{sistema.icon}</span>
      <span className="text-sm flex-1 text-slate-700 dark:text-slate-200 leading-tight">{sistema.label}</span>
      <div className="flex gap-1 shrink-0">
        {options.map(opt => (
          <button
            key={opt.val}
            onClick={() => onChange(opt.val)}
            className={`w-9 h-8 rounded-lg text-xs font-bold transition-all duration-150 ${
              value === opt.val
                ? opt.color + ' shadow-sm'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            {opt.val}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children, defaultOpen = false }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left font-semibold text-sm text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        {title}
        <span className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = '' }: {
  label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', inputMode, step }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; step?: string;
}) {
  return (
    <input
      type={type} step={step} inputMode={inputMode} value={value}
      onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2.5 rounded-xl text-sm resize-none bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all"
    />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all appearance-none"
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
