# S35 — Ecografías / Rayos X: campos mínimos, adjuntos PDF y vista ampliada

**Prioridad:** alta · **Rama:** directo a `main` · **Usa:** S26 (ImageLightbox)

## Objetivo
1. **Renombrar** la sección "Ecografías" → **"Ecografías / Rayos X"** en toda
   la UI.
2. Reducir el editor a **dos campos: Fecha y Hallazgos** (decisión confirmada);
   quitar de la UI Órgano/Tipo, Conclusiones y Mediciones (la data vieja se
   conserva en BD).
3. Permitir **subir PDFs** además de imágenes.
4. **Ampliar la imagen** con un modal/lightbox (buena UX; hoy abre pestaña nueva).

## Contexto
`components/EcografiasSection.tsx` hoy: editor con `fecha`, `organo`,
`hallazgos`, `conclusiones`, `mediciones`, e `imagenes` (solo
`accept="image/*"` y validadas contra `ALLOWED_IMAGE_TYPES`, `:98-109`).
`imagenes` es `JSONB` con URLs string (`ecografias.imagenes`). Las imágenes en
el listado abren con `<a target="_blank">` (`:215`).

## Cambios

### Migración SQL (nueva)
```sql
ALTER TABLE ecografias
  ADD COLUMN IF NOT EXISTS archivos JSONB NOT NULL DEFAULT '[]'::jsonb;
-- [{ "url": "...", "nombre": "informe.pdf", "tipo": "application/pdf" }]
```
`imagenes` sigue guardando URLs de imágenes (string[]) como hoy.

### `types/index.ts`
- `Ecografia.archivos?: { url: string; nombre?: string; tipo?: string }[]`.

### `lib/supabase.ts`
- `uploadEcografiaArchivo(file, ecografiaId, index)` → bucket `ecografias`
  (sube PDF/imagen indistintamente; el S30 ya cubre toasts de error/success).

### `components/EcografiasSection.tsx`
- Header: "🫀 Ecografías" → "🖼️ Ecografías / Rayos X"; subtítulos/empty
  states con el nuevo nombre ("Rayos X" opcional).
- Editor **reducido**: Fecha (default hoy, requerida en guardado) + Hallazgos
  (textarea). Eliminar los bloques de Órgano/Tipo, Conclusiones y Mediciones
  del editor; al **editar** un registro viejo no se muestran (se conservan en
  BD, no se borran del payload al editar otros campos — solo no se tocan).
  (En el detalle expandido se puede seguir mostrando `organo`/`conclusiones`
  legacy si existen, como read-only.)
- **Adjuntos mixtos**:
  - Botón "+ Subir archivos" con `accept="image/*,application/pdf,image/jpeg,png,webp"`.
  - Las imágenes se suben con `uploadEcografiaImage` y se agregan a `imagenes`;
    los PDF a `archivos` (con `uploadEcografiaArchivo`).
  - Validaciones: imagen ≤5 MB (tipos de `ALLOWED_IMAGE_TYPES`), PDF ≤10 MB
    (como en lab-exams). Mantener límites de `lib/constants.ts`.
- **Visualización**:
  - Imágenes → cuadrícula; cada una abre el **ImageLightbox** (S26) en lugar
    de pestaña nueva.
  - PDFs → lista de archivos con ícono 📄, nombre y enlace "Ver PDF"
    (`target="_blank"` está bien para PDF).
- Payload de guardado: incluir `imagenes` y `archivos`.

### Reporte (`app/patients/[id]/reporte/page.tsx`)
- Label de sección "Ecografías" → "Ecografías / Rayos X" (`SECTION_LABELS:28`).
- Mostrar en el detalle los `archivos` (URLs/nombres) junto a hallazgos.

## Criterios de aceptación
- [ ] La sección se llama "Ecografías / Rayos X" en la ficha y el reporte.
- [ ] El editor solo pide Fecha y Hallazgos (+ adjuntos); no hay campos
      Órgano/Conclusiones/Mediciones al crear/editar.
- [ ] Se pueden subir y guardar PDFs en una ecografía y abrirlos después.
- [ ] Tocar una imagen la amplía en modal (lightbox) y se puede cerrar.
- [ ] Registros viejos con conclusiones/mediciones no se rompen y se siguen
      editando sin perder el resto de datos.
- [ ] `npm run build`, `npm run lint` y migración pasan.

## Verificación
1. Crear "Ecografía / Rayos X" subiendo 1 imagen + 1 PDF → se ven ambos.
2. Tocar la imagen → lightbox; cerrar. Abrir el PDF → se ve en otra pestaña.
3. Editar una ecografía vieja (con mediciones) → solo Fecha/Hallazgos en el
   editor; guardar sin tocarlas → la data vieja persiste.
4. Imprimir/reporte → sección renombrada.
