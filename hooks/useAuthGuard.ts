// hooks/useAuthGuard.ts
// ============================================================
// Hook reutilizable para proteger cualquier página con PIN
// Uso: const { ready } = useAuthGuard();
// Si ready es false, el hook ya está redirigiendo al login.
//
// S43: la sesión real vive en una cookie httpOnly. El flag local es un atajo;
// si no está pero la cookie sí es válida, se restaura sin pedir PIN (evita
// loops de redirect). Escucha cambios de otras pestañas (storage): si cierran
// sesión, esta pestaña también redirige al login.
// ============================================================
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, setAuthenticated, AUTH_STORAGE_KEY } from '@/lib/auth';

export function useAuthGuard() {
  const router  = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const resolve = async () => {
      if (isAuthenticated()) { if (active) setReady(true); return; }
      // Fallback: puede haber cookie válida aunque el flag local no exista.
      try {
        const res = await fetch('/api/auth');
        const data = res.ok ? await res.json() : null;
        if (!active) return;
        if (data?.authenticated) { setAuthenticated(); setReady(true); }
        else router.replace('/login');
      } catch {
        if (active) router.replace('/login');
      }
    };
    resolve();

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== AUTH_STORAGE_KEY) return;
      if (isAuthenticated()) setReady(true);
      else router.replace('/login');
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, [router]);

  return { ready };
}
