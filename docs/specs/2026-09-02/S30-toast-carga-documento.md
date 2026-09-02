# S30 — Toast al cargar/subir un documento o imagen

**Prioridad:** media · **Rama:** directo a `main`

## Objetivo
Que el usuario **sepa cuándo un archivo/documento se cargó** (o falló) con un
Toast claro, en todos los puntos donde se sube un adjunto. Hoy varias subidas
son mudas: si el helper de storage devuelve `null` (fallo), no hay mensaje, y
ni siquiera el éxito de una subida intermedia se comunica.

## Contexto / causa raíz
Los helpers de storage en `lib/supabase.ts` (`uploadPetPhoto`, `uploadMedicalDocument`,
`uploadLabExamFile`, `uploadEcografiaImage`) hacen `console.error(...)` y
devuelven `null` ante error → el llamador no distingue "no subió" de "sí subió"
y no avisa al usuario. Además la UI tostaba solo al guardar el registro, no al
subir cada archivo.

Flujos afectados:
- `components/PatientForm.tsx` — foto de perfil (edición sube al instante;
  creación sube al guardar). Ya muestra un ✓ visual, pero sin toast y sin
  mensaje de error real si la subida falla.
- `components/MedicalRecordForm.tsx:173-182` — sube PDF tras insertar/actualizar;
  si falla (null) guarda igual sin avisar.
- `components/LabExamsSection.tsx:180-190` — sube el archivo del examen tras
  guardar; si falla, silencio.
- `components/EcografiasSection.tsx:154-162` — sube N imágenes tras guardar; si
  fallan, silencio (solo "Ecografía registrada").

## Enfoque
Hacer explícita la subida y tostear éxito/error por operación.

### `lib/supabase.ts`
- Cambiar los 4 helpers para que **tiren `Error`** con mensaje claro cuando
  falle la subida (`throw new Error('No se pudo subir el archivo a Storage')`
  incluyendo `error.message` si existe), en lugar de `return null`.
- Alternativa menos invasiva (si no se quiere romper firmas): agregar un
  parámetro opcional `onError?: (msg: string) => void` a cada helper. Decidir
  UNA (recomendado: throw + try/catch en los callers, ya son pocos y
  centraliza).

### Callers
- `PatientForm.handlePhotoChange`/`handleSave`: envolver subida en try/catch →
  toast `'Foto subida correctamente'` (success) / `'Error subiendo la foto: ...'`
  (error). Conservar el ✓ visual y el spinner existentes.
- `MedicalRecordForm.handleSave`: tras `uploadMedicalDocument`, si tira error →
  `toast('Historia guardada, pero el PDF no se pudo subir: ...', 'error')`; si
  sube → `toast('Documento adjuntado', 'success')` (además del toast de
  "Historia guardada").
- `LabExamsSection.handleSave`: tras subir el archivo →
  `toast('Documento cargado correctamente', 'success')`; error →
  `toast('El examen se guardó pero el archivo no se pudo cargar', 'error')`.
- `EcografiasSection.handleSave`: tras el loop de imágenes →
  `toast('N imágenes cargadas', 'success')` con el conteo real; si alguna falla,
  `toast('Alguna imagen no se pudo cargar: ...', 'error')` indicando cuántas.

### `hooks/usePatients.ts` (opcional)
- `updatePatient`/`createPatientWithTutor` no cambian; solo se espera toast
  arriba en el formulario.

## Criterios de aceptación
- [ ] Subir foto de perfil → toast de éxito (edición: inmediato; creación: al guardar).
- [ ] Adjuntar PDF a una historia → toast "Documento adjuntado".
- [ ] Cargar archivo de examen → toast "Documento cargado".
- [ ] Subir imágenes de ecografía → toast con el conteo.
- [ ] Simular fallo de red/storage (p. ej. subiendo archivo gigante o bucket
      borrado) → toast de error claro en cada flujo.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Recorrer los 4 flujos subiendo archivos válidos → toasts de éxito.
2. Romper el bucket (o usar un archivo que exceda límites) → toast de error.
3. Confirmar que el registro se guarda igual si falla SOLO el adjunto (no se
   pierde la consulta/examen/ecografía).
