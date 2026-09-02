# S26 — Ampliar foto del paciente (lightbox)

**Prioridad:** media · **Rama:** directo a `main` · **Reutilizado por:** S35 (ecografías)

## Objetivo
Poder **ampliar la foto de un paciente con un toque** para identificarlo
rápidamente. Hoy las fotos en listas y perfil no son clickeables (la tarjeta
completa navega al perfil, pero la foto en sí no se agranda).

## Contexto
- Foto de perfil grande: `app/patients/[id]/page.tsx:80-86` (dentro de un
  `<div>`, no clickeable).
- Grid/list de pacientes: `app/patients/page.tsx` (toda la tarjeta es un
  `<Link>`; la foto es decorativa).
- Fotos en ecografías abren en pestaña nueva con `<a target="_blank">`
  (`components/EcografiasSection.tsx:215`) — misma necesidad de lightbox.

## Enfoque
Crear un componente **lightbox/modal** compartido y usarlo en los puntos donde
se quiere ampliar una imagen. Sin librerías nuevas (el patrón de overlay ya
existe en los modales del proyecto: `fixed inset-0 z-50 ... bg-black/50`).

## Cambios

### `components/ui/ImageLightbox.tsx` (nuevo)
- Props: `{ src?: string | null; alt?: string; onClose: () => void;
  downloadUrl?: string }`.
- Render: overlay `fixed inset-0 z-[60] bg-black/80` con `backdrop-blur-sm`;
  imagen centrada con `object-contain` y máximo alto/ancho de viewport
  (`max-h-[90vh] max-w-[90vw]`), manteniendo proporción (`<Image>` o `<img>`
  si la URL es externa de storage pública; usar `<img>` estándar para no
  depender de dominios remotos en `next.config.js`).
- Cierra con: click en el backdrop, botón ✕, tecla `Esc`.
- Opcional `downloadUrl` (botón ⬇ en el caso de ecografías/rayos X).
- Prevenir scroll del body mientras esté abierto.

### `app/patients/[id]/page.tsx`
- La foto del header (bloque `h-48`) se vuelve un `<button>` que abre el
  lightbox con `patient.photo_url`.

### `app/patients/page.tsx`
- En grid y en lista, la zona de la foto (`div` con `Image`) se convierte en un
  botón con `e.preventDefault()`/`stopPropagation()` sobre el `<Link>` padre
  para que el toque en la foto **no navegue** sino que abra el lightbox. Sin
  foto → no hacer nada (o nada clickeable).

### `components/ui/index.ts`
- Exportar `ImageLightbox`.

## Criterios de aceptación
- [ ] Tocar la foto en el perfil → se agranda en modal.
- [ ] Tocar la foto en las tarjetas/listado de pacientes → se agranda (y no
      navega al perfil).
- [ ] Cerrar con backdrop, ✕ y Esc; el fondo no scrollea mientras está abierto.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Perfil con foto → click → lightbox; cerrar.
2. `/patients` grid y lista → click en la foto → lightbox sin navegación.
3. Paciente sin foto → la zona de foto no rompe la navegación al perfil.
4. Repetir en mobile.
