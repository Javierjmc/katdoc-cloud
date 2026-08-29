# S14 — Motor de recordatorios (scan + cola + cron)

**Fase:** 3 · **Prioridad:** media · **Rama:** `feat/javier/motor-recordatorios`

## Objetivo
Detectar cuándo a un paciente le toca una vacuna/examen próximo (según las ventanas
de `notification_config`) y crear filas **pendientes** en `reminders` de forma
idempotente, para que el centro de notificaciones (S15) las procese.

## Diseño de datos

### Migración SQL (parte de S19)
```sql
CREATE TABLE IF NOT EXISTS reminders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tutor_id        UUID REFERENCES tutors(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,           -- 'vacuna' | 'desparasitacion' | 'examen' | 'control'
  titulo          TEXT NOT NULL,           -- ej: 'Vacuna Nobivac próxima'
  descripcion     TEXT,
  fecha_evento    DATE NOT NULL,           -- fecha próxima dosis / control
  fecha_ventana   DATE NOT NULL,           -- fecha a partir de la cual se avisa
  estado          TEXT NOT NULL DEFAULT 'pendiente',
                 -- 'pendiente' | 'enviado' | 'descartado'
  canal           TEXT,                    -- 'whatsapp' | 'email' (último usado)
  fecha_envio     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotencia: una sola fila por (patient, tipo, fecha_evento, titulo)
  UNIQUE (patient_id, tipo, fecha_evento, titulo)
);
CREATE INDEX idx_reminders_estado     ON reminders (estado);
CREATE INDEX idx_reminders_ventana    ON reminders (fecha_ventana);
CREATE INDEX idx_reminders_patient_id ON reminders (patient_id);
```

### Vistas de origen del scan
- `vaccinations.fecha_proxima_dosis` (vacunas y, con `tipo='desparasitacion'`,
  las filas marcadas como desparasitación — ver S7).
- `laboratory_exams.fecha_proximo_control` (exámenes).
- Solo pacientes con `active = true` y tutor con teléfono/email.

## Cambios

### `lib/notifications/scan.ts` (nuevo, server-only)
- Función `scanReminders()`:
  1. Lee `notification_config` (tipos habilitados).
  2. Para cada `vaccination` con `fecha_proxima_dosis` y cada `laboratory_exam`
     con `fecha_proximo_control`, calcula `fecha_ventana = fecha_evento - dias_antes`
     (y tolerancia `+ dias_despues`).
  3. Si `hoy >= fecha_ventana` y `estado` de esa fila no está resuelto, hace
     `INSERT ... ON CONFLICT DO NOTHING` (idempotente).
  4. Devuelve `{ creados, existentes }`.

### `app/api/reminders/scan/route.ts` (nuevo)
- `GET`/`POST`: ejecuta `scanReminders()` y devuelve el conteo.
- `Cron` header check (Vercel `x-vercel-cron` → sin auth extra; ver nota abajo).

### Cron
- `vercel.json`: agregar
  ```json
  "crons": [{ "path": "/api/reminders/scan", "schedule": "0 13 * * *" }]
  ```
  (1:00 PM UTC ≈ mañana en VZ). Documentar que el plan Hobby de Vercel soporta cron.

### Scan on-demand (sin esperar el cron)
- `hooks/useReminders.ts`: al abrir `/notifications`, llamar a `/api/reminders/scan`
  primero y luego listar. Así la app funciona aunque el cron no esté activo.

## Criterios de aceptación
- [ ] El scan crea recordatorios pendientes para vacunas/exámenes en ventana.
- [ ] Correr el scan dos veces seguidas no duplica filas (idempotente).
- [ ] Pacientes inactivos o config deshabilitada no generan recordatorios.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Con una vacuna cuya próxima dosis está dentro de la ventana → scan → fila creada.
2. Repetir scan → conteo `existentes` y sin duplicados.
3. Deshabilitar el tipo en `notification_config` → scan no crea filas de ese tipo.
