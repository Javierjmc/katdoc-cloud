// middleware.ts (raíz del proyecto)
// ============================================================
// Protección de rutas — redirige a /login si no hay sesión
// NOTA: La autenticación final se valida en el cliente (sessionStorage).
// Este middleware redirige la raíz al dashboard.
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirigir raíz al dashboard (el dashboard mismo verifica auth)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/patients/:path*', '/records/:path*'],
};
