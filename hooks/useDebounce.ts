// hooks/useDebounce.ts
// Retrasa la actualización de un valor hasta que el usuario deja de escribir.
// Evita búsquedas en Supabase en cada pulsación de teclado.

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
