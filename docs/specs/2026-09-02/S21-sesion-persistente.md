# S21 — Sesión persistente entre pestañas (auth)

**Prioridad:** alta · **Rama:** directo a `main` · **Toca:** login, guards, logout

## Objetivo
Que al abrir una pestaña nueva (o ventana) la sesión de KATDOC **se mantenga
logueada**, sin tener que volver a escribir el PIN. Hoy la sesión se pierde al
abrir otra pestaña.

## Causa raíz (verificada)
La autenticación por PIN se guarda en **`sessionStorage`** (`vetcare_auth =
'true'`), y `sessionStorage` es **por pestaña**: no se comparte entre pestañas.
No está en `localStorage` (la hipótesis del reporte era inversa).

Usos actuales del flag:
- `app/login/page.tsx:15` (redirige si ya hay sesión) y `:20` (lo escribe).
- `hooks/useAuthGuard.ts:17` (guarda de páginas que lo usan).
- Guardas duplicadas inline: `app/dashboard/page.tsx:36`, `app/patients/page.tsx:35`, `app/tutors/page.tsx:27`.
- Logout: `components/AppShell.tsx:20` (`sessionStorage.removeItem`).

## Enfoque
1. Mover el flag de sesión a **`localStorage`** (compartido entre pestañas).
2. Centralizar la lógica en un helper para eliminar la duplicación inline.
3. Sincronizar entre pestañas con el evento `storage` (si una pestaña cierra
   sesión, las demás también).
4. **Migración de sesión existente**: si `sessionStorage` ya tiene
   `vetcare_auth='true'`, copiarlo a `localStorage` la primera vez para no
   forzar re-login a quien ya estaba logueado.

Nota de seguridad: es una app de clínica con PIN de 4 dígitos (sin RLS ni
Supabase Auth). Guardar en `localStorage` es aceptable en este contexto; si en
el futuro hay auth real multi-usuario, esto se reemplaza por cookies/tokens.

## Cambios

### `lib/auth.ts` (nuevo) — cliente
Helpers únicos:
- `AUTH_KEY = 'vetcare_auth'`.
- `isAuthenticated(): boolean` — lee `localStorage`.
- `setAuthenticated()` — escribe `localStorage` (dispara `storage` a otras
  pestañas automáticamente).
- `clearAuthenticated()` — limpia `localStorage` **y** `sessionStorage`.
- `migrateLegacySession()` — copia de `sessionStorage` a `localStorage` si
  existe y no está en `localStorage`.

### `app/login/page.tsx`
- `validatePin`: usa `setAuthenticated()`.
- `useEffect` de arranque: usa `isAuthenticated()` + `migrateLegacySession()`.

### `hooks/useAuthGuard.ts`
- Reemplaza la lectura de `sessionStorage` por `isAuthenticated()`.
- Agrega listener `storage`: si otra pestaña cierra sesión (key `vetcare_auth`
  borrada), redirigir a `/login` en esta pestaña también.

### Guardas inline
- En `app/dashboard/page.tsx`, `app/patients/page.tsx`, `app/tutors/page.tsx`
  reemplazar el `useEffect` inline por `useAuthGuard()` (o por un helper común
  `useAuth()`), eliminando código repetido.

### `components/AppShell.tsx`
- `handleLogout` → `clearAuthenticated()` (borra ambos storages).

## Criterios de aceptación
- [ ] Con sesión iniciada, abrir una pestaña nueva pega en `/dashboard` sin PIN.
- [ ] Cerrar sesión en una pestaña desloguea también las demás (redirige a `/login`).
- [ ] Usuarios ya logueados antes del deploy no pierden sesión (migración).
- [ ] Código repetido de guards inline eliminado (usa helpers).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Login con PIN → abrir pestaña nueva → directo a dashboard.
2. Nueva pestaña incógnito aparte (no comparte storage) → pide PIN (correcto).
3. Cerrar sesión en tab A → tab B salta a `/login`.
4. Recargar con F5 → sigue logueado.
