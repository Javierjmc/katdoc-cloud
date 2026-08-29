'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import { ESPECIES } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { calcularEdad } from '@/lib/utils';

type PatientRow = {
  id: string; nombre: string; especie: string; raza?: string;
  sexo?: string; color?: string; fecha_nacimiento?: string; photo_url?: string;
  active?: boolean;
  tutor: { nombre: string; cedula: string; telefono?: string };
};

type TabKey = 'activos' | 'inactivos';

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading]  = useState(true);
  const [search, setSearch]    = useState('');
  const [view, setView]        = useLocalStorage<'grid' | 'list'>('patients_view', 'grid');
  const [tab, setTab]          = useLocalStorage<TabKey>('patients_tab', 'activos');
  const [filterEspecie, setFilterEspecie] = useLocalStorage('patients_especie', '');
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    const auth = sessionStorage.getItem('vetcare_auth');
    if (auth !== 'true') router.replace('/login');
  }, [router]);

  useEffect(() => {
    supabase.from('patients').select('*, tutor:tutors(nombre, cedula, telefono)').order('nombre')
      .then(({ data }) => { setPatients((data ?? []) as PatientRow[]); setLoading(false); });
  }, []);

  const tabPatients = useMemo(() => {
    const active = tab === 'activos';
    return patients.filter(p => (p.active ?? true) === active);
  }, [patients, tab]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return tabPatients.filter(p => {
      const matchSearch = !q || [p.nombre, p.raza ?? '', p.tutor?.nombre ?? '', p.tutor?.cedula ?? ''].some(f => f.toLowerCase().includes(q));
      return matchSearch && (!filterEspecie || p.especie === filterEspecie);
    });
  }, [tabPatients, debouncedSearch, filterEspecie]);

  const emoji: Record<string, string> = { Canino:'🐶', Felino:'🐱', Exótico:'🦜', Bovino:'🐄', Equino:'🐴', Otro:'🐾' };

  return (
    <AppShell>
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-surface-800">Pacientes</h1>
          <p className="text-xs text-surface-400">{loading ? '...' : `${tabPatients.length} registrados`}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="hidden sm:flex bg-surface-100 rounded-xl p-1 gap-1">
            <button onClick={() => setView('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-500'}`}>⊞ Grid</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-500'}`}>☰ Lista</button>
          </div>
          <Link href="/patients/new" className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors shadow-md shadow-brand-500/20">
            ➕ Nuevo
          </Link>
        </div>
      </header>

      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto space-y-4">
        {/* Pestañas activos/inactivos */}
        <div className="flex gap-2">
          <TabButton active={tab === 'activos'} onClick={() => setTab('activos')}
            count={patients.filter(p => (p.active ?? true)).length}
            label="Activos" />
          <TabButton active={tab === 'inactivos'} onClick={() => setTab('inactivos')}
            count={patients.filter(p => !(p.active ?? true)).length}
            label="Inactivos" />
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">🔍</span>
            <input
              type="search" placeholder="Buscar por nombre, raza, tutor..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-50 border border-surface-200 text-surface-800 placeholder:text-surface-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 text-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['', ...ESPECIES].map(e => (
              <button key={e} onClick={() => setFilterEspecie(e)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filterEspecie === e ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                {e || 'Todos'}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-surface-500 font-medium">{loading ? 'Cargando...' : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`}</p>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 rounded-2xl bg-surface-200 animate-pulse" />)}
          </div>
        ) : view === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(p => (
              <Link key={p.id} href={`/patients/${p.id}`}
                className="bg-white rounded-2xl border border-surface-200 hover:border-brand-400 hover:shadow-md hover:shadow-brand-500/10 transition-all group overflow-hidden"
              >
                {/* Foto */}
                <div className="h-36 bg-brand-50 flex items-center justify-center relative overflow-hidden">
                  {p.photo_url
                    ? <Image src={p.photo_url} alt={p.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <span className="text-5xl">{emoji[p.especie] ?? '🐾'}</span>
                  }
                  <div className="absolute top-2 right-2 flex gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/90 text-brand-600 font-bold shadow-sm">{p.especie}</span>
                    {p.active === false && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-700/90 text-white font-bold shadow-sm">Inactivo</span>
                    )}
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <h3 className="font-black text-surface-800 group-hover:text-brand-600 transition-colors">{p.nombre}</h3>
                  <p className="text-xs text-surface-400">{p.raza ?? 'Sin raza'} · {p.sexo ?? '—'}</p>
                  <p className="text-xs text-surface-500 mt-1.5 truncate">👤 {p.tutor?.nombre}</p>
                  {p.fecha_nacimiento && <p className="text-xs text-surface-400">📅 {calcularEdad(p.fecha_nacimiento)}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <Link key={p.id} href={`/patients/${p.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl border border-surface-200 hover:border-brand-400 p-3 transition-all group"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-brand-50 shrink-0 flex items-center justify-center">
                  {p.photo_url ? <Image src={p.photo_url} alt={p.nombre} width={56} height={56} className="object-cover w-full h-full" /> : <span className="text-2xl">{emoji[p.especie] ?? '🐾'}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-surface-800 group-hover:text-brand-600 transition-colors">{p.nombre}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200 font-semibold">{p.especie}</span>
                    {p.active === false && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-500 border border-surface-200 font-semibold">Inactivo</span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 truncate">👤 {p.tutor?.nombre} · {p.tutor?.cedula}</p>
                  <p className="text-xs text-surface-400">{p.raza}{p.fecha_nacimiento ? ` · ${calcularEdad(p.fecha_nacimiento)}` : ''}</p>
                </div>
                <span className="text-surface-300 group-hover:text-brand-400">›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TabButton({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
        active
          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
          : 'bg-white border border-surface-200 text-surface-600 hover:border-brand-400'
      }`}
    >
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-surface-100 text-surface-500'}`}>
        {count}
      </span>
    </button>
  );
}
