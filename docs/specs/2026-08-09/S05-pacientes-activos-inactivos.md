# S5 — Pacientes activos e inactivos (pestaña aparte)

**Fase:** 1 · **Prioridad:** media · **Rama:** `feat/javier/pacientes-activos-inactivos`

## Objetivo
Soportar pacientes **activos** e **inactivos**. Los inactivos viven en una pestaña
aparte en `/patients`, se ocultan del dashboard y quedan fuera de las notificaciones.

## Cambios

### Migración SQL (parte de S19)
```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX idx_patients_active ON patients (active);
```

### `types/index.ts`
- Agregar `active?: boolean` a `Patient`.

### `app/patients/page.tsx`
- Tabs superiores: `Activos` / `Inactivos` (con contador de cada uno).
  - Tab activos: query con `.eq('active', true)`.
  - Tab inactivos: query con `.eq('active', false)`, mismo grid/lista, con un badge
    "Inactivo" en las tarjetas.
- El estado de tab se mantiene con `useLocalStorage('patients_tab')`.

### `app/dashboard/page.tsx`
- Filtro en la query a `dashboard_search`/`patients`: solo activos
  (`.eq('active', true)` en la fuente de datos; la vista `dashboard_search` debe
  exponer `active` — ver S19).

### `app/patients/[id]/page.tsx` (perfil)
- Botón "Activar / Desactivar paciente" con `ConfirmDialog`:
  - Desactivar → `updatePatient(id, { active: false })`.
  - Activar → `updatePatient(id, { active: true })`.
- Badge de estado en la cabecera (Activo/Inactivo).

### `hooks/usePatients.ts`
- `usePatients(active?: boolean)` opcional; pasar el filtro al fetch.

## Criterios de aceptación
- [ ] Pestaña Activos/Inactivos funcional con contadores.
- [ ] Los inactivos no aparecen en el dashboard.
- [ ] Desde el perfil se puede activar/desactivar con confirmación.
- [ ] El tab elegido persiste entre navegaciones.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Crear paciente → desactivarlo desde su perfil.
2. Confirmar que desaparece del dashboard y pasa a la pestaña Inactivos.
3. Reactivarlo → vuelve a Activos y al dashboard.
