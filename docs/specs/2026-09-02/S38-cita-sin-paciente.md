# S38 — Agendar citas sin paciente registrado ("cita libre")

**Prioridad:** alta · **Rama:** directo a `main`

## Objetivo
Poder agendar una cita aunque el paciente/tutor todavía **no exista como
ficha**, escribiendo a mano el nombre (y contacto) en el momento. Modelo de
datos elegido (confirmado): **cita libre** — la cita queda con `patient_id`
nulo y campos de texto propios; si después se registra la ficha, se puede
vincular.

## Contexto
Hoy `appointments.patient_id` es `NOT NULL` (`migrations/...v3.sql:14`) y el
select de paciente en el modal de agenda es obligatorio
(`app/agenda/page.tsx:236-242`, `appointmentSchema.patient_id` UUID requerido).
Citas sin ficha: por ejemplo consulta de un animal nuevo que llega sin estar
cargado (alta rápida en recepción).

## Cambios

### Migración SQL (nueva)
```sql
ALTER TABLE appointments ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS nombre_paciente TEXT,   -- nombre libre de la mascota
  ADD COLUMN IF NOT EXISTS tutor_nombre    TEXT,   -- persona de contacto
  ADD COLUMN IF NOT EXISTS telefono_tutor   TEXT;  -- para WhatsApp (normalizable)

CREATE INDEX IF NOT EXISTS idx_appointments_libres
  ON appointments (patient_id) WHERE patient_id IS NULL;
```

### `types/index.ts`
- `Appointment`: `patient_id?: string | null`; nuevos `nombre_paciente?`,
  `tutor_nombre?`, `telefono_tutor?`.
- El tipo expandido `patient`/`tutor` ya es opcional → compat.

### `lib/schemas.ts` — `appointmentSchema`
- `patient_id` pasa a **opcional** (refine: si viene, debe ser UUID).
- `superRefine`: en modo "libre" (sin `patient_id`) exige `nombre_paciente`
  (y opcional `tutor_nombre`/`telefono_tutor`).

### `hooks/useAppointments.ts`
- `AppointmentInput`: campos nuevos opcionales. `createAppointment`/`update`
  sin cambios de fondo (inserta lo que venga). En el `.select()` de
  `useAppointments` la relación `patient` ya puede venir null.

### Modal de agenda (`app/agenda/page.tsx`)
- En el select "Paciente" agregar la opción
  **"➕ Paciente no registrado (escribir nombre)"** (`value: '__libre__'`).
- Al elegirla, mostrar campos adicionales: "Nombre de la mascota",
  "Nombre del tutor" (opcional) y "Teléfono (con +58)" (opcional, con
  `normalizePhoneForWhatsApp` al guardar).
- `handleCreate`: arma la cita con `patient_id: null` + los campos libres
  (omitir `tutor_id`).

### Ficha del paciente / AppointmentsSection
- No cambia su alta (ya está ligada al paciente del contexto). El editor solo
  necesita soportar abrir una cita libre para **editarla** (precargar los
  campos libres) si aparece listada aquí (no ocurre: la ficha filtra por
  `patient_id`). OK sin cambios, pero verificar que `fromAppointment` tolera
  `patient_id` nulo sin romper si algún día se filtra distinto.

### Agenda / calendario / dashboard
- `hooks/useCalendarEvents.ts`: en citas, si `a.patient` es null usar
  `a.nombre_paciente ?? 'Paciente sin ficha'`; `patientId: p?.id ?? ''`.
  Los eventos tipo cita se construyen igual; el link en el detalle se omite si
  `patientId` está vacío (S37).
- `app/dashboard/page.tsx` "Próximos eventos": no linkear cuando no hay
  `patientId` (o linkear a la agenda).
- Notificaciones/recordatorios (`lib/notifications/scan.ts`): las citas se
  consultan con `patient:patients!inner(...)` → las citas sin paciente ya
  quedan excluidas del motor (comportamiento deseado; documentar).

### Vincular después (opcional recomendado)
- En el modal de detalle del día (S37) o en AppointmentsSection: botón
  "Vincular a ficha" en citas libres → select de pacientes → hace
  `updateAppointment(id, { patient_id, tutor_id, nombre_paciente: null,
  tutor_nombre: null, telefono_tutor: null })`.

## Criterios de aceptación
- [ ] En el modal de agenda hay una opción para escribir paciente/tutor sin
      ficha; guardar crea una cita válida (listada en el día).
- [ ] La cita libre aparece en el detalle del día con su nombre (sin link a
      ficha) y en la agenda.
- [ ] El motor de recordatorios no intenta notificar a una cita sin paciente.
- [ ] Vincular una cita libre a una ficha la convierte en cita normal.
- [ ] `npm run build`, `npm run lint` y migración pasan.

## Verificación
1. En `/agenda` tocar un día → "+ Agendar cita" → elegir "paciente no
   registrado" → nombre "Cachorro nuevo", teléfono 412-... → guardar → se ve en
   el día con su nombre.
2. Crear otra cita con paciente normal (regresión).
3. Abrir el detalle del día → la cita libre no navega a ficha inexistente.
4. Correr `scan` → las citas libres no generan reminder.
5. Vincular la cita libre a un paciente creado después.
