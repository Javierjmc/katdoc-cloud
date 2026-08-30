'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import type { DashboardRow } from '@/types';
import { ESPECIES } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useLoadMore } from '@/hooks/useLoadMore';
import { LoadMoreButton } from '@/components/ui';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useCalendarEvents';

export default function DashboardPage() {
  const router = useRouter();
  const [rows, setRows]       = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterEspecie, setFilterEspecie] = useLocalStorage('dashboard_especie', '');
  const debouncedSearch = useDebounce(search, 250);

  // Próximos eventos (7 días)
  const today = new Date();
  const weekFrom = toYMD(today);
  const weekTo   = toYMD(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
  const { events, loading: eventsLoading } = useCalendarEvents(weekFrom, weekTo);

  const upcoming = useMemo(() => events.filter(e => {
    if (e.type !== 'cita') return true;
    return e.estado === 'programada' || e.estado === 'confirmada';
  }), [events]);

  useEffect(() => {
    const auth = sessionStorage.getItem('vetcare_auth');
    if (auth !== 'true') router.replace('/login');
  }, [router]);

  useEffect(() => {
    supabase.from('dashboard_search').select('*').eq('active', true).order('fecha_consulta', { ascending: false })
      .then(({ data }) => { setRows((data ?? []) as DashboardRow[]); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return rows.filter(row => {
      const matchSearch = !q || [row.patient_nombre, row.tutor_nombre, row.tutor_cedula, row.numero_historia ?? '']
        .some(f => f.toLowerCase().includes(q));
      return matchSearch && (!filterEspecie || row.especie === filterEspecie);
    });
  }, [rows, debouncedSearch, filterEspecie]);

  const PAGE_SIZE = 9;
  const { visible, hasMore, loadMore } = useLoadMore(filtered, PAGE_SIZE);

  const uniquePatients = new Set(rows.map(r => r.patient_id)).size;
  const uniqueTutors   = new Set(rows.map(r => r.tutor_id)).size;
  const totalRecords   = rows.filter(r => r.record_id).length;

  return (
    <AppShell>
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-surface-800 tracking-tight">Dashboard</h1>
          <p className="text-xs text-surface-400 hidden sm:block">Bienvenido a KATDOC</p>
        </div>
        <Link href="/patients/new" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold transition-colors shadow-md shadow-brand-500/20">
          <span>➕</span>
          <span className="hidden sm:inline">Nuevo Paciente</span>
        </Link>
      </header>

      <div className="px-4 lg:px-8 py-6 max-w-6xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 lg:gap-6">
          <StatCard icon="👥" label="Tutores"   value={uniqueTutors}   color="text-blue-600"  bg="bg-blue-50"  loading={loading} />
          <StatCard icon="🐾" label="Pacientes" value={uniquePatients} color="text-brand-600" bg="bg-brand-50" loading={loading} />
          <StatCard icon="📋" label="Consultas" value={totalRecords}   color="text-green-600" bg="bg-green-50" loading={loading} />
        </div>

        {/* Próximos eventos (7 días) */}
        <section className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-surface-800 text-sm flex items-center gap-2">📅 Próximos eventos</h2>
            <Link href="/agenda" className="text-xs font-bold text-brand-600 hover:text-brand-700">Ver agenda ›</Link>
          </div>

          {eventsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-surface-200 animate-pulse" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-surface-400 py-3 text-center">Sin citas ni controles pendientes esta semana.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(e => (
                <Link key={`${e.type}-${e.id}`} href={`/patients/${e.patientId}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-surface-200 hover:border-brand-400 hover:bg-brand-50/40 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${EVENT_META[e.type].dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-surface-800 truncate">{e.titulo}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${EVENT_META[e.type].badge}`}>{EVENT_META[e.type].label}</span>
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5 truncate">
                      🐾 {e.patientNombre}
                      <span className="text-surface-300"> · </span>
                      {new Date(e.fecha + 'T12:00:00').toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {e.hora && <span className="text-surface-300"> · </span>}
                      {e.hora && <span>🕐 {e.hora}</span>}
                    </p>
                  </div>
                  <span className="text-surface-300 text-lg">›</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Buscador */}
        <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm space-y-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">🔍</span>
            <input type="search" placeholder="Buscar mascota, tutor, cédula, n° historia..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-50 border border-surface-200 text-surface-800 placeholder:text-surface-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 text-sm" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['', ...ESPECIES].map(e => (
              <button key={e} onClick={() => setFilterEspecie(e)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${filterEspecie === e ? 'bg-brand-500 text-white shadow-sm' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'}`}>
                {e || 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div>
          <p className="text-sm text-surface-500 font-medium mb-3">
            {loading ? 'Cargando...' : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`}
          </p>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 rounded-2xl bg-surface-200 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <span className="text-5xl mb-3">🔍</span>
              <p className="font-bold text-surface-600">{search ? 'Sin resultados' : 'Sin pacientes aún'}</p>
              <p className="text-sm text-surface-400 mt-1">{search ? `No hay coincidencias para "${search}"` : 'Registra el primer paciente.'}</p>
              {!search && <Link href="/patients/new" className="mt-4 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold">Registrar paciente</Link>}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map(row => <PatientCard key={`${row.patient_id}-${row.record_id}`} row={row} />)}
            </div>
          )}
          {hasMore && !loading && <LoadMoreButton visible={visible.length} total={filtered.length} onClick={loadMore} />}
        </div>
      </div>
    </AppShell>
  );
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EVENT_META: Record<CalendarEvent['type'], { label: string; dot: string; badge: string }> = {
  cita:            { label: 'Cita',            dot: 'bg-brand-500',  badge: 'bg-brand-50 text-brand-600 border-brand-200' },
  vacuna:          { label: 'Vacuna',          dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-600 border-blue-200' },
  desparasitacion: { label: 'Desparasitación', dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 border-green-200' },
  examen:          { label: 'Control examen',  dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
};

function StatCard({ icon, label, value, color, bg, loading }: {
  icon: string; label: string; value: number; color: string; bg: string; loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-surface-200 p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center text-xl mb-3`}>{icon}</div>
      {loading ? <div className="h-7 w-12 bg-surface-200 rounded animate-pulse mb-1" />
               : <p className={`text-2xl font-black ${color}`}>{value}</p>}
      <p className="text-xs text-surface-400 font-medium">{label}</p>
    </div>
  );
}

function PatientCard({ row }: { row: DashboardRow }) {
  const emoji: Record<string, string> = { Canino:'🐶', Felino:'🐱', Exótico:'🦜', Bovino:'🐄', Equino:'🐴', Otro:'🐾' };
  return (
    <Link href={`/patients/${row.patient_id}`} className="
      block bg-white rounded-2xl border border-surface-200
      hover:border-brand-400 hover:shadow-md hover:shadow-brand-500/10
      transition-all duration-200 p-4 group
    ">
      <div className="flex gap-3 items-center">
        <div className="shrink-0">
          {row.photo_url
            ? <Image src={row.photo_url} alt={row.patient_nombre} width={52} height={52} className="w-[52px] h-[52px] rounded-xl object-cover" />
            : <div className="w-[52px] h-[52px] rounded-xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center text-2xl">{emoji[row.especie] ?? '🐾'}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-surface-800 truncate group-hover:text-brand-600 transition-colors">{row.patient_nombre}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-200 font-semibold shrink-0">{row.especie}</span>
          </div>
          <p className="text-xs text-surface-500 truncate mt-0.5">👤 {row.tutor_nombre} · {row.tutor_cedula}</p>
          {row.numero_historia && (
            <p className="text-xs text-surface-400 mt-0.5">
              📋 {row.numero_historia}
              {row.fecha_consulta && <span> · {new Date(row.fecha_consulta).toLocaleDateString('es-VE')}</span>}
            </p>
          )}
        </div>
        <span className="text-surface-300 group-hover:text-brand-400 text-lg">›</span>
      </div>
      {row.motivo_consulta && (
        <p className="mt-2 text-xs text-surface-500 bg-surface-50 rounded-xl px-3 py-2 line-clamp-2">{row.motivo_consulta}</p>
      )}
    </Link>
  );
}
