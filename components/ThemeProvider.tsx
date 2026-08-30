'use client';
// components/ThemeProvider.tsx
// ============================================================
// Provee el tema (S20): auto-por-sistema + toggle manual persistido.
// Aplica la clase `dark` en <html>. Sin flash: resuelve de forma
// síncrona en el primer render.
// ============================================================

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  type Theme,
  type ResolvedTheme,
  getStoredTheme,
  resolveTheme,
  applyThemeClass,
  persistTheme,
} from '@/lib/theme';

interface ThemeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Estado inicial síncrono → aplica la clase antes del primer paint.
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  const resolved = resolveTheme(theme);

  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  // Seguir al sistema solo cuando theme === 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeClass(resolveTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    persistTheme(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolveTheme(theme) === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
