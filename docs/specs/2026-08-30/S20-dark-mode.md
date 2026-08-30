# S20 — Modo oscuro (UX)

**Fase:** 5 · **Prioridad:** media · **Rama:** `feat/katdoc-dark-mode`

## Objetivo
Agregar modo oscuro completo a KATDOC con **auto-por-sistema + toggle manual**
persistido. Mejora la experiencia en consulta (poca luz), sin cambiar
comportamiento clínico.

## Enfoque
- `darkMode: 'class'` (ya configurado en `tailwind.config.ts`).
- `ThemeProvider` aplica/quita la clase `dark` en `<html>`.
- Preferencia guardada en `localStorage` (`katdoc_theme` = `light` | `dark` | `system`).
- Default: `system` (sigue `prefers-color-scheme`).
- El sidebar y el login ya son oscuros por diseño → no requieren cambios.

## Cambios

### Infraestructura (nuevos archivos)
- **`lib/theme.ts`**: helpers puros —
  - `getStoredTheme()`: lee `localStorage` (guardián SSR).
  - `getSystemTheme()`: `window.matchMedia('(prefers-color-scheme: dark)')`.
  - `applyThemeClass(theme, resolved?)`: fija/limpia `document.documentElement.classList`.
- **`components/ThemeProvider.tsx`** (client):
  - Contexto `{ theme, setTheme, resolved }`.
  - Al montar: lee preferencia + sistema → aplica clase sin flash.
  - `useEffect` que escucha cambios del sistema solo si `theme === 'system'`.
  - Expone `setTheme` que persiste y aplica.
- **`components/ui/ThemeToggle.tsx`**:
  - Ícono sol/luna según `resolved`.
  - Un clic alterna claro/oscuro (persiste explícito, deja de seguir sistema).
  - Variante compacta para sidebar y bottom nav.

### Integración
- **`app/layout.tsx`**: envolver `{children}` en `<ThemeProvider>`.

### AppShell
- Sidebar desktop (`lg`) y colapsable (`md`): botón de tema junto a "Cerrar sesión".
- Bottom nav mobile: ítem de tema.

### Conversión a `dark:` (~25 archivos, mapeo consistente con la base existente)

| Clase actual | Variante dark |
|---|---|
| `bg-white` (cards/paneles) | `dark:bg-surface-800` |
| `bg-surface-50` (detalle interno) | `dark:bg-surface-900` |
| `bg-surface-100` | `dark:bg-surface-800` |
| `bg-surface-200` (skeletons) | `dark:bg-surface-700` |
| `bg-surface-300` (toggles off) | `dark:bg-surface-600` |
| `text-surface-800` | `dark:text-white` |
| `text-surface-700` | `dark:text-surface-200` |
| `text-surface-600` | `dark:text-surface-300` |
| `text-surface-500` | `dark:text-surface-400` |
| `text-surface-400` | `dark:text-surface-500` |
| `border-surface-200` | `dark:border-surface-700` |
| `border-surface-100` | `dark:border-surface-800` |
| `hover:bg-surface-100` | `dark:hover:bg-surface-800` |
| `hover:bg-surface-200` | `dark:hover:bg-surface-700` |
| `hover:text-surface-600` | `dark:hover:text-surface-300` |
| `hover:text-surface-800` | `dark:hover:text-white` |
| Header sticky `bg-white` | `dark:bg-surface-800/90` |

Archivos objetivo: `app/agenda`, `app/config`, `app/dashboard`, `app/notifications`,
`app/patients/*`, `app/records/*`, `app/tutors/*`, `components/AppShell`,
`components/AppointmentsSection`, `components/VaccinationsSection`,
`components/LabExamsSection`, `components/PrescriptionsSection`,
`components/EcografiasSection`, `components/PatientForm`,
`components/ui/LoadMoreButton`.

### globals.css
- `.dark { color-scheme: dark; }` (inputs nativos, selects, scrollbars).
- `body` → `bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-surface-100`.

## Criterios de aceptación
- [ ] Toggle en sidebar (desktop/tablet) y bottom nav (mobile).
- [ ] Al primer ingreso sigue la preferencia del sistema; el toggle la fuerza.
- [ ] La elección persiste al recargar.
- [ ] Sin flash de tema claro al recargar en modo oscuro.
- [ ] Todas las páginas/componentes UI se ven correctamente en ambos modos.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. `npm run dev`, activar oscuro en el sistema → la app arranca oscura.
2. Toggle a claro → persiste tras F5.
3. Recorrer: login, dashboard, pacientes, ficha, agenda, notificaciones, config,
   tutores, records en ambos modos.
4. `grep -r "bg-white" app components` → todas tienen variante `dark:`.
