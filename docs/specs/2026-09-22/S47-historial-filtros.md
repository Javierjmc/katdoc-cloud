# S47 — Historial de consultas minimizable + filtros por fecha

**Prioridad:** media · **Rama:** `feat/<dev>/s47-historial-filtros` · **Toca:** ficha del paciente

## Objetivo
1. Poder **minimizar/expandir** el "Historial de Consultas" del perfil del paciente.
2. **Filtrar por rango de fechas** las consultas del historial.

## Contexto
- `app/patients/[id]/page.tsx:176-215` — el historial está fijo abierto. Las otras
  secciones (`VaccinationsSection`, `DewormingSection`, etc.) ya colapsan con ▾.
- No existe ningún filtro por fecha en la ficha.

## Cambios

### `app/patients/[id]/page.tsx`
- Estado `historialOpen` (default `true`) + botón en el encabezado (igual patrón que
  las demás secciones): título + contador + chevron rotado.
- Estado `desde` / `hasta` (`YYYY-MM-DD`, `<input type="date">`) + botón "Limpiar".
- Filtrar `records` client-side por `fecha_consulta` (usar `parseFechaLocal` de S46):
  - `recordsFiltrados = records.filter(r => (!desde || fecha >= desde) && (!hasta || fecha <= hasta))`.
- Mostrar contador (`X de Y`) y mensaje cuando el filtro deja el historial vacío.
- `records[0]` (último peso) sigue usando el array completo (no el filtrado).

## Criterios de aceptación
- [ ] El botón minimiza/expande el historial.
- [ ] Filtrar por Desde/Hasta muestra solo consultas del rango.
- [ ] "Limpiar" restaura todas las consultas.
- [ ] Sin resultados, se ve un mensaje claro (no la lista vacía pelada).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Paciente con varias consultas → colapsar/expandir.
2. Filtrar un rango que incluya 1 consulta → solo esa.
3. Rango sin consultas → mensaje.
4. Limpiar → todas.
