# S12 — Reporte del paciente imprimible y editable

**Fase:** 2 · **Prioridad:** baja · **Rama:** `feat/javier/reporte-paciente`

## Objetivo
Generar un **reporte imprimible** del paciente que reúna sus datos clínicos
(datos generales, vacunas, exámenes, recetas, ecografías e historial), con secciones
que se pueden **activar/desactivar y editar** antes de imprimir.

## Cambios

### `app/patients/[id]/reporte/page.tsx` (nuevo)
- Ruta del reporte. Carga en paralelo: `patient+tutor`, `records`, `vaccinations`,
  `laboratory_exams`, `prescriptions`, `ecografias`.
- **Modo edición (default):**
  - Toggle de secciones (checkbox): Datos del paciente, Historial de consultas,
    Vacunas, Exámenes de laboratorio, Recetas, Ecografías.
  - Campos editables: un `Textarea` editable sobre los textos visibles (nombre del
    reporte, encabezado de la clínica, notas generales). El contenido del reporte se
    compone en estado local (no se guarda en BD; es un "borrador de impresión").
- **Botón Imprimir:** `window.print()`.

### `app/globals.css`
- Bloque `@media print`:
  - Ocultar `AppShell`, botones, toggles, inputs.
  - Mostrar solo `.reporte-print`.
  - `@page { margin: 1.5cm }`, tipografía serif/sans limpia, A4-friendly.
  - Asegurar que las tablas de analitos no se corten (colores, `break-inside: avoid`).

### Componente `components/reporte/ReportePaciente.tsx` (nuevo)
- Render del contenido compuesto (estado de secciones + textos editados).
- Encabezado con logo KATDOC, datos de la clínica (constante `lib/constants.ts`:
  nombre, teléfono, dirección), título "Informe clínico", fecha de emisión.
- Secciones renderizadas con los datos reales (reutiliza formatos de `lib/utils.ts`).

### Acceso
- Botón "🖨 Reporte" en la cabecera de `app/patients/[id]/page.tsx`.

## Criterios de aceptación
- [ ] El reporte reúne datos de todas las entidades del paciente.
- [ ] Se pueden quitar/poner secciones y editar textos antes de imprimir.
- [ ] `window.print()` produce una vista limpia sin UI de la app.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Abrir `/patients/<id>/reporte` → desactivar "Recetas" y editar la nota general.
2. Imprimir → el diálogo de impresión muestra solo el reporte.
3. Verificar que las tablas de analitos se renderizan completas.
