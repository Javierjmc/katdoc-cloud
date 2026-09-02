# S27 — Seleccionar foto del paciente desde la galería

**Prioridad:** alta · **Rama:** directo a `main`

## Objetivo
Al agregar/editar un paciente poder elegir la foto **desde la galería del
dispositivo**, además de tomar una en vivo con la cámara. Hoy el input fuerza
la cámara en mobile y no permite abrir la galería.

## Causa raíz (verificada)
`components/PatientForm.tsx:170`:
```tsx
<input id="photo-input" type="file" accept="image/*" capture="environment" ... />
```
El atributo `capture="environment"` le dice al navegador mobile que abra
directo la cámara trasera, **sin** ofrecer la galería.

## Enfoque
Dar dos acciones explícitas debajo de la foto:
- 📷 **Tomar foto** → input con `capture="environment"`.
- 🖼️ **Elegir de galería** → input con `accept="image/*"` **sin** `capture`
  (en Android/iOS abre selector con galería y cámara).

Ambos alimentan el mismo `handlePhotoChange` existente (preview inmediato +
subida si es edición). En desktop los dos inputs equivalen a "subir archivo"
(natural).

## Cambios

### `components/PatientForm.tsx`
- Reemplazar el único `<label>`/`<input capture>` por un pequeño menú de dos
  botones:
  ```tsx
  <div className="flex gap-2 ...">
    <label>📷 Tomar foto<input type="file" accept="image/*" capture="environment" hidden /></label>
    <label>🖼️ Galería<input type="file" accept="image/*" hidden /></label>
  </div>
  ```
  con `onChange={handlePhotoChange}` en ambos y `key` distinta si hace falta
  resetear el value tras elegir.
- Mantener las validaciones de tipo/tamaño que ya existían en
  `lib/constants.ts` (`ALLOWED_IMAGE_TYPES`, `MAX_PHOTO_SIZE`) — hoy la UI solo
  valida indirectamente por `accept`; conviene validar en `handlePhotoChange`
  (tipo incluido en `ALLOWED_IMAGE_TYPES` y tamaño ≤ `MAX_PHOTO_SIZE`), con
  toast de error.

### `lib/constants.ts`
- Sin cambios (ya define tipos/tamaños permitidos).

## Criterios de aceptación
- [ ] En mobile aparece "Tomar foto" y "Elegir de galería"; la galería abre el
      selector de fotos y al elegir una se muestra el preview.
- [ ] La foto elegida de galería se sube y persiste igual que la de cámara
      (nuevo paciente: al guardar; edición: inmediato).
- [ ] Archivo no imagen o >5 MB → error claro y no rompe el flujo.
- [ ] En desktop, "Elegir de galería" abre el explorador de archivos normal.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. `/patients/new` en Android → elegir foto de galería → preview → guardar → la
   foto se ve en el perfil.
2. Mismo flujo con "Tomar foto" (cámara) para confirmar que sigue andando.
3. Edición de un paciente con foto → "Cambiar foto" desde galería → se
   actualiza al instante.
4. Intentar un archivo no imagen → error.
