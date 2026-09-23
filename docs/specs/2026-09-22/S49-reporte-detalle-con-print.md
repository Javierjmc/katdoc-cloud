# S49 — Reporte imprimible: detalle clínico de cada consulta

**Prioridad:** media · **Rama:** `feat/<dev>/s49-reporte-detalle` · **Toca:** reporte, estilos de impresión

## Objetivo
Que el reporte imprimible incluya el **detalle clínico de cada consulta** (no solo
el listado con motivo/hallazgos).

## Contexto
- `app/patients/[id]/reporte/page.tsx:139-156` — la sección "Historial de
  consultas" solo muestra `numero_historia`, `fecha`, `motivo_consulta` y
  `descripcion_hallazgos`. No incluye constantes vitales, sistemas ni anamnesis.
- `app/globals.css:53-81` — `@media print` posiciona `.reporte-print` en
  `position:absolute`, lo que en contenido largo puede recortar/solapar y
  descuadrar la paginación.

## Cambios

### `app/patients/[id]/reporte/page.tsx`
- En cada consulta del historial, agregar:
  - **Constantes vitales:** peso, frec. respiratoria/cardíaca, temperatura, pulso,
    TLC, ganglios, mucosas, actitud (reusar el patrón de `records/[id]/page.tsx`).
  - **Órganos y sistemas:** lista de `SISTEMAS_CONFIG` con estado `N/AN/NE` y
    `sistemas_notas` por sistema.
  - **Anamnesis:** desparasitación, vacunas, enfermedades, tratamientos, evolución,
    alimentación, reproductivo.
- Ocultar filas vacías (igual que `VitalRow`/`AnamRow` del detalle).

### `app/globals.css` (`@media print`)
- Cambiar `.reporte-print` de `position:absolute` a flujo normal (`position:static`)
  para permitir multipágina correcta; mantener `visibility` y `.no-print`.
- Asegurar `break-inside: avoid` en los bloques de cada consulta
  (`.consulta-print { break-inside: avoid; }`) para que no se corten.
- Verificar que `.print-area` (recipes) siga funcionando.

## Criterios de aceptación
- [ ] Al imprimir, cada consulta muestra constantes, sistemas y anamnesis.
- [ ] El reporte largo pagina sin recortar ni solapar texto.
- [ ] Los toggles de secciones siguen funcionando.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Reporte de un paciente con varias consultas → "Imprimir" → vista previa con detalle.
2. Reporte largo (3+ consultas) → paginación correcta.
3. Desactivar una sección → no aparece (ni en pantalla ni impresa).
