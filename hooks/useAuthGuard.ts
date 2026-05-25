// hooks/useAuthGuard.ts
// ============================================================
// Hook reutilizable para proteger cualquier página con PIN
// Uso: const { ready } = useAuthGuard();
// Si ready es false, el hook ya está redirigiendo al login.
// ============================================================
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuthGuard() {
  const router  = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem('vetcare_auth');
    if (auth !== 'true') {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  return { ready };
}
