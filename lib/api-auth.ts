// lib/api-auth.ts
// ============================================================
// Guard de autorización mínimo para API routes (S26).
// Acepta:
//  - Header `x-app-pin` con el PIN de la app (cliente logueado).
//  - `Authorization: Bearer <CRON_SECRET>` (Vercel Cron).
// ============================================================

export function isAuthorized(request: Request): boolean {
  const pin = process.env.NEXT_PUBLIC_APP_PIN;
  if (pin && request.headers.get('x-app-pin') === pin) return true;

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`) return true;

  return false;
}

/** Lee el PIN de la app desde el cliente (NEXT_PUBLIC, es público). */
export function appPinHeader(): Record<string, string> {
  return { 'x-app-pin': process.env.NEXT_PUBLIC_APP_PIN ?? '' };
}
