// lib/authToken.ts
// ============================================================
// S43: token de sesión firmado (HMAC-SHA256) para la cookie httpOnly.
// Usa Web Crypto para funcionar tanto en el middleware (Edge) como en
// los route handlers (Node).
// ============================================================

function toBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Firma el PIN con el secreto. El token resultante va en la cookie. */
export async function createAuthToken(pin: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(pin));
  return toBase64Url(new Uint8Array(signature));
}

/** Verifica el token en tiempo (casi) constante. */
export async function verifyAuthToken(
  token: string | undefined | null,
  pin: string,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const expected = await createAuthToken(pin, secret);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
