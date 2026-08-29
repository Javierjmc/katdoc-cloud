'use client';
// app/error.tsx
// Boundary global de errores de Next.js App Router

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error global:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col items-center justify-center px-6 text-center">
      <span className="text-5xl mb-4">⚠️</span>
      <h2 className="text-xl font-bold text-surface-800 dark:text-white mb-2">
        Algo salió mal
      </h2>
      <p className="text-sm text-surface-400 mb-6 max-w-xs">
        {error.message ?? 'Ocurrió un error inesperado.'}
      </p>
      <button
        onClick={reset}
        className="
          px-5 py-3 rounded-xl font-semibold text-sm
          bg-brand-500 hover:bg-brand-600 text-white
          transition-colors
        "
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
