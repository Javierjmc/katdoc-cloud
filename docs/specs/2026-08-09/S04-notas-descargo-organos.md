# S4 — Notas de descargo por órgano/sistema

**Fase:** 0 · **Prioridad:** media · **Rama:** `feat/javier/notas-descargo-organos`

## Objetivo
Permitir escribir un texto de descargo/observación libre en **cada** órgano o sistema
del checklist clínico, además del estado N/AN/NE.

## Contexto
El checklist (`components/MedicalRecordForm.tsx` `SistemaRow`, líneas 308-339) solo
permite marcar `N`/`AN`/`NE`. La nota debe persistir por sistema sin romper el
formato JSONB actual.

## Diseño de datos
- Nueva columna en `medical_records`: `sistemas_notas JSONB` — mapa
  `{ [key: SistemaKey]: string }`.
- Se mantiene `sistemas_status` intacto (N/AN/NE). La nota es complementaria.
- Ejemplo:
  ```json
  { "respiratorio": "Estridor leve, se recomienda seguimiento en 15 días." }
  ```

## Cambios

### Migración SQL (parte de S19)
```sql
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS sistemas_notas JSONB;
```

### `types/index.ts`
- Agregar `sistemas_notas?: Record<string, string>` a `MedicalRecord`.
- Agregar tipo `SistemasNotasMap = Partial<Record<keyof SistemasStatusMap, string>>`.

### `components/MedicalRecordForm.tsx`
- `SistemaRow`: agregar botón de nota (`✎`) que expande un `Textarea` inline debajo
  del nombre del sistema.
- Estado: `sistemas_notas` en el form; `setNotaSistema(key, texto)`.
- Payload: incluir `sistemas_notas` (solo si tiene contenido; filtrar claves vacías).
- Autofocus en el textarea al abrir; guardar en cada cambio (`onBlur` o en el save).

### `app/records/[id]/page.tsx` (vista)
- En el card de Órganos y Sistemas, mostrar la nota debajo de cada fila que tenga
  `sistemas_notas[s.key]` (estilo texto pequeño sobre fondo `surface-50`).

## Criterios de aceptación
- [ ] Cada sistema del checklist puede abrir una nota de descargo y escribir texto.
- [ ] La nota se guarda en `sistemas_notas` y se muestra en la vista de la historia.
- [ ] Notas vacías no se persisten.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Crear consulta → abrir nota en "Respiratorio" → escribir → guardar.
2. Abrir `/records/[id]` → ver la nota debajo de Respiratorio.
3. Re-editar → confirmar que la nota se conserva y es editable.
