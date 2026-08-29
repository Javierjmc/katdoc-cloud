# S13 — Configuración de ventanas de notificación (editable)

**Fase:** 3 · **Prioridad:** media · **Rama:** `feat/javier/config-notificaciones`

## Objetivo
Ventanas de tiempo **editables** que definen con cuánta anticipación se avisa al
cliente de una vacuna/examen próximo. Incluye presets típicos (21 días, 2 meses)
pero el usuario puede cambiarlos o agregar los propios.

## Diseño de datos

### Migración SQL (parte de S19)
```sql
CREATE TABLE IF NOT EXISTS notification_config (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        TEXT NOT NULL UNIQUE,   -- 'vacuna' | 'desparasitacion' | 'examen' | 'control'
  label       TEXT NOT NULL,          -- 'Vacunación', 'Exámenes', ...
  dias_antes  INTEGER NOT NULL,       -- ventana en días antes de la fecha límite
  dias_despues INTEGER NOT NULL DEFAULT 0,  -- tolerancia de días después del vencimiento para avisar
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Presets iniciales
INSERT INTO notification_config (tipo, label, dias_antes) VALUES
  ('vacuna',          'Vacunación',           21),   -- 3 semanas antes
  ('desparasitacion', 'Desparasitación',      21),
  ('examen',          'Exámenes de laboratorio', 60), -- ~2 meses
  ('control',         'Controles',            30)
ON CONFLICT (tipo) DO NOTHING;
```
> Los presets son **sugerencias**; en la UI son editables y agregables.

## Cambios

### `types/index.ts`
- `NotificationConfig` con los campos de la tabla.

### Hook `hooks/useNotificationConfig.ts` (nuevo)
- `useNotificationConfig()` → listar configuraciones.
- `updateNotificationConfig(id, patch)`, `createNotificationConfig`, `deleteNotificationConfig`.

### `app/config/page.tsx` (nuevo) — o `/settings/notificaciones`
- Página de ajustes con:
  - Selector de tipo con presets rápidos ("21 días", "2 meses" / "60 días").
  - Input numérico editable de `dias_antes` y `dias_despues`.
  - Toggle `enabled` por tipo.
  - Botón agregar tipo personalizado.
  - Guardado con feedback via `Toast` (`useToast`).
- Enlace desde el `AppShell` (sección Ajustes) y desde el Centro de Notificaciones.

### `lib/constants.ts`
- `NOTIFICATION_TYPES` con las claves/labels/descripciones para la UI.

## Criterios de aceptación
- [ ] Se listan los presets (21 días, 60 días, etc.) y son editables.
- [ ] Se puede crear una ventana personalizada.
- [ ] Cambios persisten en `notification_config` y el motor (S14) los respeta.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Cambiar `vacuna.dias_antes` de 21 a 7 → guardar → verificar en BD.
2. Agregar un tipo custom (ej: `cita`, 10 días) → aparece en la lista.
3. Deshabilitar `examen` → el scan (S14) no genera recordatorios de exámenes.
