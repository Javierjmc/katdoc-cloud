# S18 — Consistencia visual y limpieza de calidad

**Fase:** 4 · **Prioridad:** baja · **Rama:** `fix/javier/consistencia-visual`

## Objetivo
Unificar la paleta (brand/surface), reemplazar diálogos nativos y corregir
inconsistencias de layout. **No cambia comportamiento clínico.**

## Problemas detectados en auditoría

1. **Tokens mixtos:** `components/MedicalRecordForm.tsx` y `components/ui/*` usan
   `slate-*`/`teal-*`; el resto de la app usa `brand-*` (naranja KATDOC) y
   `surface-*`. Resultado: botones teal vs naranja, fondos grises distintos.
2. **Diálogos nativos:** `app/records/[id]/page.tsx:36-42` usa `confirm()`/`alert()`.
3. **Sin AppShell:** `app/records/[id]/page.tsx` no renderiza `AppShell` (sin nav).
4. **Back del PageHeader** usa `router.back()` en lugar de `backHref` (inconsistente
   con el resto).

## Cambios

### `components/ui/*` y `components/MedicalRecordForm.tsx`
- Mapear la paleta a los tokens del proyecto:
  - `slate-50/100/200` → `surface-50/100/200`
  - `slate-700/800/900` → `surface-700/800/900`
  - `text-slate-*` → `text-surface-*`
  - `teal-500` (botón primario) → `brand-500`
  - `teal-*` (badges/éxito) → `brand-*` o `green-*` para éxito, manteniendo
    semántica.
- Añadir variante de éxito al `Badge`/`Button` si hace falta (color `green` ya
  existe en `Badge`).

### `app/records/[id]/page.tsx`
- Envolver el contenido en `AppShell` (consistente con `patients/*`).
- Reemplazar `confirm()`/`alert()` por `ConfirmDialog` (ya existe en
  `components/ui/ConfirmDialog.tsx`) + `useToast` para errores.
- Usar `PageHeader` con `backHref` correcto.

### `components/ui/PageHeader.tsx`
- Respaldar el comportamiento: si hay `backHref`, navegar a él (`router.push`);
  si no, `router.back()`. (Evita quedar atrapado en historial vacío.)

### Verificación global
- `npm run build` y `npm run lint` sin errores.
- Recorrer las páginas en modo claro y oscuro comparando que el naranja KATDOC
  predomine como color de acción.

## Criterios de aceptación
- [ ] No quedan `slate-*`/`teal-*` en componentes de UI ni en `MedicalRecordForm`
      (revisar con grep).
- [ ] `/records/[id]` muestra el nav de la app y usa `ConfirmDialog`.
- [ ] `PageHeader` respeta `backHref` cuando existe.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. `grep` de `slate-` y `teal-` en `components/` → sin coincidencias en
   MedicalRecordForm/ui (pueden quedar en `@media print` o estilos intencionales).
2. Abrir `/records/<id>` → nav presente, borrado con diálogo de confirmación.
