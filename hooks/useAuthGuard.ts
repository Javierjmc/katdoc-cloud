// hooks/useAuthGuard.ts
// ============================================================
// Hook reutilizable para proteger cualquier página con PIN
// Uso: const { ready } = useAuthGuard();
// Si ready es false, el hook ya está redirigiendo al login.
// Escucha cambios de otras pestañas (storage): si cierran sesión,
// esta pestaña también redirige al login.
// ============================================================
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, AUTH_STORAGE_KEY } from '@/lib/auth';

export function useAuthGuard() {
  const router  = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!isAuthenticated()) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    };

    check();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        if (!isAuthenticated()) {
          router.replace('/login');
        } else {
          setReady(true);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [router]);

  return { ready };
}
