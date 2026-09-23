'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthenticated, clearAuthenticated, migrateLegacySession, AUTH_STORAGE_KEY } from '@/lib/auth';

const PIN_LENGTH = 4;

function nextTarget(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') ? next : '/dashboard';
}

export default function LoginPage() {
  const router  = useRouter();
  const [pin, setPin]     = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    migrateLegacySession();

    // S43: la sesión real vive en una cookie httpOnly. Si es válida, entra
    // sin pedir PIN; si el flag local quedó viejo, se limpia.
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth');
        const data = res.ok ? await res.json() : null;
        if (!active) return;
        if (data?.authenticated) {
          setAuthenticated();
          router.replace(nextTarget());
        } else {
          clearAuthenticated();
        }
      } catch {
        /* sin red: se queda en el login */
      }
    })();

    // Si se loguea en otra pestaña, esta también salta al dashboard.
    const handleStorage = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY && e.newValue === 'true') {
        router.replace(nextTarget());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      active = false;
      window.removeEventListener('storage', handleStorage);
    };
  }, [router]);

  const validatePin = useCallback(async (attempt: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: attempt }),
      });
      if (!res.ok) throw new Error('PIN incorrecto');
      setAuthenticated();
      router.replace(nextTarget());
    } catch {
      setShake(true);
      setError('PIN incorrecto');
      setTimeout(() => { setPin(''); setShake(false); setError(''); }, 800);
    }
  }, [router]);

  const handleInput = useCallback((digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === PIN_LENGTH) setTimeout(() => validatePin(newPin), 100);
  }, [pin, validatePin]);

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-700 px-6 py-10">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-3xl bg-brand-500 flex items-center justify-center shadow-2xl shadow-brand-500/40">
          <span className="text-4xl">🐾</span>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">
            KAT<span className="text-brand-400">DOC</span>
          </h1>
          <p className="text-sm text-surface-300 mt-1">Bienestar animal, otra manera de amar</p>
        </div>
      </div>

      {/* PIN dots */}
      <div className={`flex gap-5 mb-3 ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
            pin.length > i ? 'bg-brand-400 border-brand-400 scale-125' : 'bg-transparent border-surface-400'
          }`} />
        ))}
      </div>

      <div className="h-6 mb-6">
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      </div>

      {/* Teclado */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((key, idx) => {
          if (key === '') return <div key={idx} />;
          const isDel = key === '⌫';
          return (
            <button key={idx}
              onClick={() => isDel ? setPin(p => p.slice(0,-1)) : handleInput(key)}
              className={`h-16 rounded-2xl text-xl font-bold transition-all duration-150 active:scale-95 select-none ${
                isDel
                  ? 'bg-surface-600 text-surface-300 hover:bg-surface-500 hover:text-brand-400'
                  : 'bg-surface-600 text-white hover:bg-surface-500 hover:text-brand-400'
              }`}
            >
              {key}
            </button>
          );
        })}
      </div>

      <p className="mt-10 text-xs text-surface-500 text-center">Acceso protegido · KATDOC v1.0</p>

      <style jsx global>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-10px)}
          40%{transform:translateX(10px)}
          60%{transform:translateX(-7px)}
          80%{transform:translateX(7px)}
        }
      `}</style>
    </main>
  );
}
