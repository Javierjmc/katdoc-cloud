# S42 — Fix: la foto del paciente no se guarda / se ve desactualizada

**Prioridad:** alta · **Rama:** `fix/<dev>/s42-foto-paciente-cache` · **Toca:** storage, formulario de paciente, perfil

## Objetivo
Que al **cambiar la foto** de un paciente el cambio se vea de forma **consistente
y permanente**: en el formulario, en el perfil, al ampliarla (lightbox) y en
cualquier navegador/dispositivo. Hoy el cambio "a veces aparece y a veces no".

## Causa raíz (verificada)
1. **URL pública fija → caché.** `lib/supabase.ts:24-45` (`uploadPetPhoto`) sube
   siempre a la **misma ruta** `${patientId}/profile.${ext}` con `upsert: true`.
   `getPublicUrl` devuelve **la misma URL** para todas las versiones. Entonces:
   - el CDN de Supabase, la caché del browser y el optimizador de `next/image`
     siguen sirviendo la imagen vieja;
   - al abrir en incógnito/otro navegador puede llegar la nueva o la cacheada,
     según el momento → el "comportamiento extraño".
2. **Preview con memoria sin liberar.** `components/PatientForm.tsx:135` crea
   `URL.createObjectURL(file)` y nunca llama `revokeObjectURL` (fuga menor).
3. **Doble vía de subida.** En edición se sube al instante
   (`PatientForm.tsx:141-154`) y además `handleSave` puede reintentar
   (`:179-184`). Genera estados intermedios difíciles de razonar.

## Enfoque
Versionar el archivo/URL en cada subida (rompe la caché de raíz) y dejar un solo
flujo de subida coherente.

## Cambios

### `lib/supabase.ts` — `uploadPetPhoto`
- Usar **versión** en la ruta: `${patientId}/profile-${version}.${ext}`
  (o, si se prefiere conservar el nombre fijo, devolver la URL con
  `?v=${version}`). `version` = `Date.now()` (o un hash corto).
- Best-effort de limpieza: listar `${patientId}/` y borrar los archivos
  anteriores (`profile-*`) para no acumular huérfanos. Si falla el borrado, no
  romper la subida.
- Mantener la firma `(file, patientId) => Promise<string | null>` (o pasar a
  `throw` como en S30; elegir UNA y documentarlo).

### `components/PatientForm.tsx`
- Unificar subida en `handleSave` para crear **y** editar (una sola fuente de
  verdad: preview local hasta Guardar → subir → `updatePatient({ photo_url })`).
  Alternativa: conservar la subida inmediata en edición, pero **siempre** con la
  URL versionada y sin re-subir en `handleSave` (`photoUploaded` correcto).
- `revokeObjectURL` del preview anterior antes de crear uno nuevo y al
  desmontar.
- Tras guardar, refrescar el paciente (`onSuccess` ya navega al perfil, que
  refetchea con `usePatient`) para que `patient.photo_url` sea el nuevo.

### `app/patients/[id]/page.tsx`
- Sin cambios de estructura; consume la `photo_url` versionada. Verificar que el
  `<Image>` (`:91`) y el `ImageLightbox` (`:232-236`) reciben la URL nueva.

### `next.config.js`
- Confirmar que `remotePatterns` (`:4-11`) sigue permitiendo las URLs de storage
  con query string (`/storage/v1/object/public/**`). No debería requerir cambios.

## Criterios de aceptación
- [ ] Cambiar la foto de un paciente → al guardar se ve la nueva en el formulario.
- [ ] Ir al perfil → se ve la nueva; ampliarla → la nueva.
- [ ] Recargar (F5) → sigue la nueva (no vuelve la vieja).
- [ ] Abrir en incógnito/otro navegador → se ve la nueva.
- [ ] Cambiar la foto 2ª vez → se ve la 2ª, sin quedar la 1ª cacheada.
- [ ] No quedan archivos huérfanos acumulados (o degradación aceptable y documentada).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Paciente con foto A → subir foto B en `/patients/<id>/edit` → guardar.
2. Revisar perfil, abrir lightbox, recargar, abrir en incógnito.
3. Repetir con foto C para confirmar que no hay caching en dos saltos.
4. Revisar en Supabase Storage que la carpeta del paciente no crece sin control.

## Fuera de alcance
- Rediseño de la cámara/galería (S27) o de los límites de tamaño (ya existen en
  `lib/constants.ts`).
