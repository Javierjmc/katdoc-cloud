# S17 — Mejoras de UX en la carga de datos

**Fase:** 4 · **Prioridad:** baja · **Rama:** `feat/javier/ux-carga-datos`

## Objetivo
Hacer que el flujo de carga de datos (formularios y fichas) sea lo más ágil y
amigable posible para el usuario que los captura: menos taps, menos fricción,
feedback claro y persistencia de contexto.

## Cambios

### `components/MedicalRecordForm.tsx`
- **Autofocus** en `motivo_consulta` al abrir el formulario.
- **Enter para guardar**: `onKeyDown` en los inputs (`Enter` → `handleSave`) salvo
  en textareas/selects.
- **Indicador de progreso**: barra de progreso de secciones completadas
  (secciones con al menos un campo con valor) en la parte superior del form.
- **Botón "Siguiente sección"**: en móvil, cada sección tiene un botón para
  colapsar la actual y abrir la siguiente (menos scroll).
- **Feedback**: reemplazar los textos de estado en el footer por `useToast()`
  (éxito "Historia guardada", error con mensaje).
- **Navegación por teclado**: `tabIndex` correcto y `label` con `htmlFor` reales.

### `components/PatientForm.tsx`
- Autofocus en `tutor.nombre`.
- Enter para avanzar de campo (o guardar en el último).
- Mismo uso de `useToast` para éxito/error (hoy usa mensajes inline).

### Páginas de listado
- **Persistir filtros** con `useLocalStorage`: búsqueda, especie y vista en
  `app/patients/page.tsx` y `app/dashboard/page.tsx`.
- **Esqueletos** consistentes ya existentes; reutilizar en todos los loading.
- **Paginación o "cargar más"** si la lista supera ~100 (decisión de volumen).

### Generales
- Asegurar **áreas táctiles ≥ 44px** en botones de acciones primarias.
- Estados vacíos accionables en todas las secciones nuevas (vacunas, exámenes,
  recetas, ecografías): botón de alta directo.
- Toast al guardar en todos los formularios de alta/edición (recetas, exámenes,
  ecografías, config, etc.).

## Criterios de aceptación
- [ ] Todos los formularios tienen autofocus en el primer campo y enter-guardar.
- [ ] El form de historia muestra progreso por secciones.
- [ ] Filtros de búsqueda persisten al navegar.
- [ ] Feedback de guardado via Toast en todos los flujos.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Crear una consulta nueva sin tocar el mouse (teclado) → se completa y guarda.
2. Cambiar filtros en `/patients`, navegar y volver → filtros intactos.
3. Guardar una receta → toast de éxito.
