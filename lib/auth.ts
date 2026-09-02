// lib/auth.ts
// ============================================================
// Sesión por PIN — centralizada (S21).
// Vive en localStorage (compartida entre pestañas). Antes estaba
// en sessionStorage, que es por-pestaña y perdía la sesión al
// abrir una pestaña nueva.
// ============================================================

const AUTH_KEY = 'vetcare_auth';

/** Lee la sesión. Fallback a sessionStorage para no romper sesiones viejas. */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(AUTH_KEY) === 'true') return true;
  } catch {
    /* storage bloqueado */
  }
  try {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Marca la sesión iniciada (localStorage → sincroniza con otras pestañas). */
export function setAuthenticated(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_KEY, 'true');
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    try {
      sessionStorage.setItem(AUTH_KEY, 'true');
    } catch {
      /* sin storage disponible */
    }
  }
}

/** Cierra sesión en ambos storages (localStorage avisa a las otras pestañas). */
export function clearAuthenticated(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}

/** Migra una sesión antigua de sessionStorage a localStorage (una sola vez). */
export function migrateLegacySession(): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(AUTH_KEY) === 'true' && !localStorage.getItem(AUTH_KEY)) {
      localStorage.setItem(AUTH_KEY, 'true');
    }
  } catch {
    /* ignore */
  }
}

export const AUTH_STORAGE_KEY = AUTH_KEY;
