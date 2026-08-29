'use client';
// components/ui/PageHeader.tsx
// Cabecera reutilizable para todas las páginas interiores

import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  backHref?: string;
  action?:   React.ReactNode;
}

export function PageHeader({ title, subtitle, backHref, action }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="
      sticky top-0 z-30
      bg-white/90 dark:bg-surface-900/90
      backdrop-blur-md
      border-b border-surface-200 dark:border-surface-800
      px-4 py-3
      flex items-center gap-3
      shadow-sm
    ">
      {backHref && (
        <button
          onClick={() => router.push(backHref)}
          className="
            p-2 rounded-xl
            text-surface-500 hover:text-surface-800 dark:hover:text-white
            hover:bg-surface-100 dark:hover:bg-surface-800
            transition-colors shrink-0
          "
          aria-label="Volver"
        >
          ‹
        </button>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-surface-800 dark:text-white truncate text-base leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
