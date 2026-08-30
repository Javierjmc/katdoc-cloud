'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import AppShell from '@/components/AppShell';
import { useDebounce } from '@/hooks/useDebounce';
import { useLoadMore } from '@/hooks/useLoadMore';
import { LoadMoreButton } from '@/components/ui';

type TutorWithPatients = {
  id: string; nombre: string; cedula: string;
  telefono?: string; email?: string; direccion?: string;
  patients: { id: string; nombre: string; especie: string; photo_url?: string; raza?: string }[];
};

export default function TutorsPage() {
  const router = useRouter();
  const [tutors, setTutors]     = useState<TutorWithPatients[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    const auth = sessionStorage.getItem('vetcare_auth');
    if (auth !== 'true') router.replace('/login');
  }, [router]);

  useEffect(() => {
    supabase.from('tutors').select('*, patients(id, nombre, especie, photo_url, raza)').order('nombre')
      .then(({ data }) => { setTutors((data ?? []) as TutorWithPatients[]); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return tutors;
    return tutors.filter(t =>
      t.nombre.toLowerCase().includes(q) || t.cedula.toLowerCase().includes(q) ||
      t.telefono?.includes(q) || t.patients.some(p => p.nombre.toLowerCase().includes(q))
    );
  }, [tutors, debouncedSearch]);

  const PAGE_SIZE = 10;
  const { visible, hasMore, loadMore } = useLoadMore(filtered, PAGE_SIZE);

  const emoji: Record<string, string> = { Canino:'🐶', Felino:'🐱', Exótico:'🦜', Bovino:'🐄', Equino:'🐴', Otro:'🐾' };

  // Construir query string con datos del tutor para pre-rellenar el formulario
  const buildNewPetUrl = (t: TutorWithPatients) => {
    const params = new URLSearchParams({
      tutorId:   t.id,
      nombre:    t.nombre,
      cedula:    t.cedula,
      telefono:  t.telefono  ?? '',
      email:     t.email     ?? '',
      direccion: t.direccion ?? '',
    });
    return `/patients/new?${params.toString()}`;
  };

  return (
    <AppShell>
      <header className="bg-white border-b border-surface-200 px-4 lg:px-8 py-4 sticky top-0 z-20 shadow-sm">
        <h1 className="text-xl font-black text-surface-800">Tutores / Propietarios</h1>
        <p className="text-xs text-surface-400">{loading ? '...' : `${tutors.length} propietarios registrados`}</p>
      </header>

      <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto space-y-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">🔍</span>
          <input type="search" placeholder="Buscar por nombre, cédula, teléfono o mascota..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-surface-200 text-surface-800 placeholder:text-surface-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 text-sm shadow-sm" />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-surface-200 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20"><span className="text-5xl">👥</span><p className="font-bold text-surface-600 mt-3">Sin resultados</p></div>
        ) : (
          <div className="space-y-3">
            {visible.map(tutor => (
              <div key={tutor.id} className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">

                {/* Cabecera clickeable */}
                <button onClick={() => setExpanded(expanded === tutor.id ? null : tutor.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-surface-50 transition-colors text-left">
                  {/* Iniciales */}
                  <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md shadow-brand-500/20">
                    {tutor.nombre.split(' ').slice(0,2).map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-surface-800 truncate">{tutor.nombre}</h3>
                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                      <span className="text-xs text-surface-500">🪪 {tutor.cedula}</span>
                      {tutor.telefono && <span className="text-xs text-surface-500">📞 {tutor.telefono}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 border border-brand-200">
                      {tutor.patients.length} mascota{tutor.patients.length !== 1 ? 's' : ''}
                    </span>
                    <span className={`text-surface-400 transition-transform duration-200 ${expanded === tutor.id ? 'rotate-180' : ''}`}>▾</span>
                  </div>
                </button>

                {/* Panel expandido */}
                {expanded === tutor.id && (
                  <div className="border-t border-surface-100 px-4 pb-4 pt-3 space-y-4">

                    {/* Datos + botón editar tutor */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-surface-500 bg-surface-50 rounded-xl p-3 flex-1">
                        {tutor.email     && <span>📧 {tutor.email}</span>}
                        {tutor.direccion && <span>📍 {tutor.direccion}</span>}
                        {!tutor.email && !tutor.direccion && <span className="text-surface-400">Sin datos adicionales</span>}
                      </div>
                      {/* ✏️ EDITAR TUTOR */}
                      <Link href={`/tutors/${tutor.id}/edit`}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-600 hover:text-surface-800 text-xs font-bold transition-colors">
                        ✏️ Editar tutor
                      </Link>
                    </div>

                    {/* Mascotas */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-black text-surface-600 uppercase tracking-wide">Mascotas</p>
                        {/* ➕ NUEVA MASCOTA — pre-rellena datos del tutor */}
                        <Link href={buildNewPetUrl(tutor)}
                          className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1">
                          ➕ Agregar mascota
                        </Link>
                      </div>

                      {tutor.patients.length === 0 ? (
                        <p className="text-xs text-surface-400 text-center py-4 bg-surface-50 rounded-xl">
                          Sin mascotas — <Link href={buildNewPetUrl(tutor)} className="text-brand-500 font-bold">Registrar primera</Link>
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {tutor.patients.map(pet => (
                            <Link key={pet.id} href={`/patients/${pet.id}`}
                              className="flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-brand-400 hover:bg-brand-50 transition-all group">
                              {pet.photo_url
                                ? <Image src={pet.photo_url} alt={pet.nombre} width={40} height={40} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                : <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-xl shrink-0">{emoji[pet.especie] ?? '🐾'}</div>
                              }
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-surface-800 truncate group-hover:text-brand-600">{pet.nombre}</p>
                                <p className="text-xs text-surface-400 truncate">{pet.especie}{pet.raza ? ` · ${pet.raza}` : ''}</p>
                              </div>
                              <span className="ml-auto text-surface-300 group-hover:text-brand-400">›</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {hasMore && !loading && <LoadMoreButton visible={visible.length} total={filtered.length} onClick={loadMore} />}
      </div>
    </AppShell>
  );
}
