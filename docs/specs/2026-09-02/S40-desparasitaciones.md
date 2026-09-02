# S40 — Sección propia "Desparasitaciones" en la ficha

**Prioridad:** media · **Rama:** directo a `main`

## Objetivo
Registrar desparasitaciones de forma **explícita** y separada de las vacunas:
hoy se cuelan como "vacuna" cuyo nombre contiene una keyword (desparasit, drontal,
ivermectina…) y el tipo se **adivina** en `scan.ts:13` y `useCalendarEvents.ts:51`.

Modelo elegido (confirmado): **sección propia "Desparasitaciones"** en la ficha
del paciente, con catálogo rápido y su propia gestión, guardando en la misma
tabla `vaccinations` con un campo de tipo explícito.

## Contexto
- `VaccinationsSection` lista `vaccinations` de un paciente sin distinguir
  tipo.
- El motor de recordatorios distingue vacuna vs desparasitación SOLO por
  keywords en `vacuna` → un desparasitante mal tipeado se manda como "vacuna"
  y la notificación dice "vacunación".
- El calendario hace lo mismo (guess por keyword).

## Cambios

### Migración SQL (nueva)
```sql
ALTER TABLE vaccinations
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'vacuna';
-- 'vacuna' | 'desparasitacion'

-- Backfill: las filas históricas que parecen desparasitantes se reclasifican.
UPDATE vaccinations SET categoria = 'desparasitacion'
WHERE lower(vacuna) LIKE '%desparasit%' OR lower(vacuna) LIKE '%drontal%'
   OR lower(vacuna) LIKE '%milbemax%' OR lower(vacuna) LIKE '%ivermectina%'
   OR lower(vacuna) LIKE '%bravecto%' OR lower(vacuna) LIKE '%nexgard%'
   OR lower(vacuna) LIKE '%simparica%' OR lower(vacuna) LIKE '%febendazol%'
   OR lower(vacuna) LIKE '%praziquantel%';
```

### `types/index.ts`
- `Vaccination.categoria?: 'vacuna' | 'desparasitacion'`.
- Constante `DESPARASITANTES = ['Praziquantel + Pirantel + Febantel (Drontal Plus)','Milbemicina + Praziquantel (Milbemax)','Ivermectina','Fenbendazol','Selamectina','Moxidectina','Piperazina','Otro']`
  (ajustar catálogo en implementación).

### Datos compartidos
- `lib/constants.ts` (o un helper nuevo): listas `VACUNAS_COMMUNES` opcional;
  mínimo `DESPARASITANTES`.

### `hooks/useVaccinations.ts`
- `useVaccinations(patientId, categoria?)` filtra por `categoria` cuando se pasa.
- `createVaccination`/`update` reciben `categoria` en el input (tipos).

### Componentes
- Refactor mínimo de `VaccinationsSection.tsx` para no duplicar lógica:
  - Extraer a funciones/componentes compartidos el editor de fila
    (fecha aplicación/próxima dosis, marca, dosis, observaciones), el
    `statusBadge` y `formatearFecha` (hoy privados de esa sección).
- **Nuevo `components/DewormingSection.tsx`**:
  - Tarjeta "🐛 Desparasitaciones" (header + "+ Registrar").
  - Editor: Producto (datalist con `DESPARASITANTES`), Fecha de aplicación,
    Próxima dosis, Marca, Dosis, Observaciones → guarda con
    `categoria='desparasitacion'`.
  - Lista con estado (vencida/próxima/al día) reutilizando el badge de vacunas.
- **`VaccinationsSection`**: filtrar a `categoria='vacuna'` (o incluir solo
  vacunas + mostrar las que por legacy no tienen tipo como "vacuna").
- **`app/patients/[id]/page.tsx`**: agregar `<DewormingSection patientId={id} />`
  debajo de `VaccinationsSection`.

### Motores (dejan de adivinar)
- `lib/notifications/scan.ts`: usar `categoria` para el `tipo` del reminder; el
  guess por keyword queda solo como fallback para filas legacy sin categoría.
- `hooks/useCalendarEvents.ts`: igual (fallback keyword si no hay categoría).

### Reporte (`app/patients/[id]/reporte/page.tsx`)
- En la sección Vacunas/Desparasitaciones separar por `categoria` o agregar
  filas con tipo. Mantener simple: mostrar una columna o grupo
  "Desparasitaciones".

## Criterios de aceptación
- [ ] En la ficha existe la sección "Desparasitaciones" independiente.
- [ ] Registrar un desparasitante crea un reminder tipo `desparasitacion` con
      la ventana de `notification_config` de desparasitación (21 días) y el
      texto correcto, sin depender del nombre.
- [ ] En el calendario aparece como evento verde "Desparasitación".
- [ ] Las vacunas registradas antes siguen apareciendo en "Vacunas".
- [ ] `npm run build`, `npm run lint` y migración pasan.

## Verificación
1. En una ficha, registrar "Drontal Plus" en Desparasitaciones con próxima
   dosis en 20 días → corre scan → reminder tipo desparasitación (no vacuna).
2. Ver el calendario → aparece el evento verde de desparasitación.
3. Registrar una vacuna normal → sigue en "Vacunas" y genera reminder vacuna.
4. Revisar un registro viejo de "Ivermectina" → reclasificado por el backfill.
5. Reporte imprimible sin romper.
