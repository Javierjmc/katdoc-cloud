// app/api/auth/route.ts
// ============================================================
// S43: sesión por cookie httpOnly.
//  - POST: valida el PIN y setea la cookie firmada.
//  - GET:  indica si la cookie actual es válida.
//  - DELETE: borra la cookie (logout).
// ============================================================

import { NextResponse } from 'next/server';
import { createAuthToken, verifyAuthToken } from '@/lib/authToken';

const SESSION_COOKIE = 'katdoc_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function pinValue(): string {
  return process.env.APP_PIN || process.env.NEXT_PUBLIC_APP_PIN || '0000';
}

function secretValue(pin: string): string {
  return process.env.AUTH_SECRET || pin;
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export async function GET(request: Request) {
  const pin = pinValue();
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  const authenticated = await verifyAuthToken(token, pin, secretValue(pin));
  return NextResponse.json({ authenticated });
}

export async function POST(request: Request) {
  let body: { pin?: string } = {};
  try {
    body = (await request.json()) as { pin?: string };
  } catch {
    /* body inválido */
  }

  const pin = pinValue();
  if (!body.pin || body.pin !== pin) {
    return NextResponse.json({ ok: false, error: 'PIN incorrecto' }, { status: 401 });
  }

  const token = await createAuthToken(pin, secretValue(pin));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: MAX_AGE });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  return res;
}
