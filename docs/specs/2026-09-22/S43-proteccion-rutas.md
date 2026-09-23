# S43 — Protección de rutas con cookie httpOnly + middleware

**Prioridad:** alta · **Rama:** `feat/<dev>/s43-proteccion-rutas` · **Toca:** auth, middleware, login, AppShell, páginas

## Objetivo
Que **ninguna ruta interna se pueda abrir por URL directa sin sesión**. Hoy, p. ej.
`https://katdoc-cloud.vercel.app/patients/6ff052fc-...` renderiza el perfil sin
pedir el PIN. Al abrir cualquier ruta protegida sin sesión, debe **redirigir a
`/login`** (server-side, antes de pintar contenido).

## Causa raíz (verificada)
- `middleware.ts:11-24` **no valida auth**: solo redirige `/` → `/dashboard`. El
  `matcher` (`:23`) además solo cubre `/`, `/dashboard`, `/patients`, `/records`.
- La sesión es un flag en **localStorage** (`lib/auth.ts`), es decir **solo
  client-side**. El server no la conoce.
- Solo 3 páginas llaman `useAuthGuard()` (`dashboard`, `patients`, `tutors`).
  **Sin guard:** `patients/[id]`, `patients/[id]/edit`, `patients/[id]/reporte`,
  `patients/new`, `records/[id]`, `records/new`, `agenda`, `config`,
  `notifications`, `tutors/[id]/edit`.
- Decisión: resolverlo con **cookie httpOnly + middleware** (no RLS).

## Enfoque
La cookie httpOnly la setea un route handler al validar el PIN; el middleware la
valida en cada request y redirige. El guard cliente se conserva como defensa en
profundidad y para el redirect instantáneo.

## Cambios

### Variables de entorno
- Agregar `AUTH_SECRET` (secreto de servidor, no `NEXT_PUBLIC`) para firmar la
  cookie.
- PIN de servidor: usar `APP_PIN` (server-only) con fallback a
  `NEXT_PUBLIC_APP_PIN`. Documentar en `.env.local.example` y en Vercel.
  > Nota: `NEXT_PUBLIC_APP_PIN` viaja en el bundle, así que por sí solo no
  > protege; la firma con `AUTH_SECRET` es lo que hace que la cookie no se pueda
  > forjar.

### `app/api/auth/route.ts` (nuevo)
- `POST` `{ pin: string }`:
  - comparar contra `APP_PIN` / `NEXT_PUBLIC_APP_PIN`; si no coincide → `401`.
  - si coincide → setear cookie `katdoc_session` = **token HMAC-SHA256** del PIN
    con `AUTH_SECRET` (Web Crypto), `httpOnly`, `sameSite: 'lax'`, `secure` en
    producción, `path: '/'`, `maxAge` (p. ej. 30 días).
- `DELETE`: borra la cookie.

### `middleware.ts`
- Leer cookie `katdoc_session` y verificar el HMAC contra `AUTH_SECRET`.
- Sin cookie válida y ruta protegida → redirect a
  `/login?next=<pathname+search>`.
- Con cookie válida, si entra a `/login` → redirect a `/dashboard` (o `next`).
- `matcher`: `/`, `/dashboard/:path*`, `/patients/:path*`, `/tutors/:path*`,
  `/records/:path*`, `/agenda/:path*`, `/config/:path*`,
  `/notifications/:path*`. Excluir `/login`, `/api/auth`, `/_next`, assets.
- Mantener el redirect de `/` → `/dashboard`.

### `app/login/page.tsx`
- `validatePin`: si `attempt === APP_PIN` (comparación cliente para UX), hacer
  `POST /api/auth` con el PIN, luego `setAuthenticated()` (flag local) y
  `router.replace(next ?? '/dashboard')` leyendo `useSearchParams` (`next`).
- Si el POST falla → mostrar error, no dejar pasar.

### `components/AppShell.tsx`
- `handleLogout`: `DELETE /api/auth` (borra cookie) **y** `clearAuthenticated()`
  (limpia localStorage) antes de `router.replace('/login')`.

### Páginas sin guard
- Añadir `const { ready } = useAuthGuard()` y **no renderizar contenido hasta
  `ready`** en: `patients/[id]`, `patients/[id]/edit`, `patients/[id]/reporte`,
  `patients/new`, `records/[id]`, `records/new`, `agenda`, `config`,
  `notifications`, `tutors/[id]/edit`.
- Reutilizar el patrón de `app/patients/page.tsx`.

### `hooks/useAuthGuard.ts` / `lib/auth.ts`
- Sin cambios de contrato. Opcional: que `useAuthGuard` también consulte
  `/api/auth` (GET) para reflejar la cookie; no es imprescindible porque el
  middleware ya bloquea server-side.

## Criterios de aceptación
- [ ] Abrir `/patients/<uuid>` en navegador privado (sin cookie) → redirige a
      `/login`.
- [ ] Abrir `/records/<uuid>`, `/agenda`, `/config`, `/notifications`,
      `/patients/new`, `/tutors/<uuid>/edit` sin sesión → redirige a `/login`.
- [ ] Tras loguear con el PIN → vuelve a la ruta solicitada (`?next=`) o a
      `/dashboard`, y la ruta abre.
- [ ] Recargar estando logueado → no vuelve a pedir PIN (cookie persistente).
- [ ] Logout → la cookie se elimina y las rutas vuelven a redirigir.
- [ ] Un PIN incorrecto no setea cookie.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Incógnito: pegar la URL del ejemplo (`/patients/6ff052fc-...`) → login.
2. Loguear → llegar al perfil; F5 → sigue dentro.
3. Cerrar sesión → pegar de nuevo la URL → login.
4. Probar `?next` apuntando a una ruta profunda.
5. Inspeccionar cookies: `katdoc_session` debe ser httpOnly y no legible por JS.

## Riesgo residual (documentar, no resolver aquí)
La `anon key` de Supabase es pública y las tablas no tienen RLS: un atacante
podría seguir consultando la API de Supabase directamente. Esta spec bloquea el
**acceso casual por URL** en la app, no el acceso directo a la API. Endurecerlo
con RLS/auth real queda como follow-up aparte.
