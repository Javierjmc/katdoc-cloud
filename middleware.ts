// middleware.ts (raíz del proyecto)
// ============================================================
// S43: protección de rutas server-side.
// Verifica la cookie httpOnly `katdoc_session` (firmada con AUTH_SECRET).
// Sin sesión válida → redirect a /login?next=<ruta>.
// Las API routes quedan fuera del matcher (tienen su propio guard).
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthToken } from '@/lib/authToken';

const SESSION_COOKIE = 'katdoc_session';

function pinValue(): string {
  return process.env.APP_PIN || process.env.NEXT_PUBLIC_APP_PIN || '0000';
}

function secretValue(pin: string): string {
  return process.env.AUTH_SECRET || pin;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // La raíz siempre va al dashboard.
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const pin = pinValue();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifyAuthToken(token, pin, secretValue(pin));

  if (!valid) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/patients/:path*',
    '/tutors/:path*',
    '/records/:path*',
    '/agenda/:path*',
    '/config/:path*',
    '/notifications/:path*',
  ],
};
