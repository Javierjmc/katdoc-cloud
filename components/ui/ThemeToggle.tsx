'use client';
// components/ui/ThemeToggle.tsx
// Botón sol/luna que alterna claro/oscuro (S20). Variantes para
// sidebar (desktop) y bottom nav (mobile).

import { useTheme } from '@/components/ThemeProvider';

interface ThemeToggleProps {
  collapsed?: boolean;
  onItem?: boolean;
}

export function ThemeToggle({ collapsed = false, onItem = false }: ThemeToggleProps) {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === 'dark';

  if (onItem) {
    return (
      <button
        onClick={toggle}
        className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-150 min-w-[56px] text-surface-400 hover:text-white"
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        <span className="text-xl">{isDark ? '🌙' : '☀️'}</span>
        <span className="text-[10px] font-semibold">Tema</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`
        flex items-center gap-3 rounded-xl transition-colors text-sm
        text-surface-300 hover:text-white hover:bg-surface-600
        ${collapsed ? 'justify-center p-3' : 'w-full px-4 py-2.5'}
      `}
    >
      <span className="text-lg shrink-0">{isDark ? '🌙' : '☀️'}</span>
      {!collapsed && <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>}
    </button>
  );
}
