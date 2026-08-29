// app/not-found.tsx
// Página 404 global de Next.js App Router
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col items-center justify-center px-6 text-center">
      <span className="text-6xl mb-4">🐾</span>
      <h1 className="text-2xl font-bold text-surface-800 dark:text-white mb-2">
        Página no encontrada
      </h1>
      <p className="text-sm text-surface-400 mb-6 max-w-xs">
        La dirección que buscas no existe o fue movida.
      </p>
      <Link
        href="/dashboard"
        className="
          px-5 py-3 rounded-xl font-semibold text-sm
          bg-brand-500 hover:bg-brand-600 text-white
          transition-colors shadow-sm
        "
      >
        Volver al Dashboard
      </Link>
    </div>
  );
}
