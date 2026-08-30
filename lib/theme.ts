// lib/theme.ts
// ============================================================
// Helpers puros de tema (S20). Sin efectos: solo leer/aplicar.
// ============================================================

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'katdoc_theme';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(THEME_STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

/** Aplica (o quita) la clase `dark` en <html>. */
export function applyThemeClass(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

/** Persiste la preferencia y aplica la clase inmediatamente. */
export function persistTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyThemeClass(resolveTheme(theme));
}
