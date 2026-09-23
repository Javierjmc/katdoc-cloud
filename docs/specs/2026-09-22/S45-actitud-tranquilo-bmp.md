# S45 — Ajustes rápidos: actitud "Tranquilo" + soporte BMP

**Prioridad:** baja · **Rama:** `feat/<dev>/s45-actitud-bmp` · **Toca:** opciones clínicas, imágenes

## Objetivo
1. Agregar **"Tranquilo"** a la lista de Actitud / Temperamento del examen clínico.
2. Permitir imágenes en **formato BMP** al subir archivos de **ecografías / rayos X**
   y exámenes de laboratorio.

## Contexto
- `types/index.ts:285-293` — `ACTITUD_OPTIONS` no incluye "Tranquilo".
  `buildSelectOptions` (`MedicalRecordForm.tsx:593`) ya conserva valores legacy
  fuera de lista, así que ampliar el array es seguro.
- `lib/constants.ts:19` — `ALLOWED_IMAGE_TYPES = ['image/jpeg','image/png','image/webp']`.
- `components/EcografiasSection.tsx:92` valida contra `ALLOWED_IMAGE_TYPES` y
  `:291` tiene `accept="image/jpeg,image/png,image/webp"`.
- `components/LabExamsSection.tsx:144` valida contra `ALLOWED_IMAGE_TYPES` y
  `:336` usa `accept=".pdf,image/*"` (ya acepta BMP en el picker, falta validar).

## Cambios

### `types/index.ts`
- `ACTITUD_OPTIONS`: agregar `'Tranquilo'` (junto a `'Alerta'`/`'Letárgico'`).

### `lib/constants.ts`
- `ALLOWED_IMAGE_TYPES`: agregar `'image/bmp'`.
- Exponer también la extensión/accept string si se quiere centralizar
  (opcional): `IMAGE_ACCEPT_ATTR`.

### `components/EcografiasSection.tsx`
- Input de imágenes: `accept` desde `ALLOWED_IMAGE_TYPES` (incluye `.bmp`).
- Mensaje de error del toast: "Solo imágenes (JPG/PNG/WebP/BMP)".

### `components/LabExamsSection.tsx`
- `handleFile`: ya usa `ALLOWED_IMAGE_TYPES` (hereda BMP). Actualizar el toast.
- `/api/exams/parse` (`app/api/exams/parse/route.ts:28-33`): agregar `'image/bmp'`
  a `allowed` para que la extracción por IA funcione con BMP.

## Criterios de aceptación
- [ ] El select de Actitud muestra "Tranquilo"; se guarda y se relee bien.
- [ ] Un registro legacy con otra actitud no pierde su valor.
- [ ] Subir un `.bmp` en ecografía/rayos X funciona, se previsualiza y se abre.
- [ ] Un `.bmp` de examen se acepta (y la IA lo procesa si se usa).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Nueva consulta → elegir "Tranquilo" → guardar → reabrir.
2. Ecografía → subir BMP → guardar → ampliar imagen.
3. Examen → subir BMP → "Extraer con IA" responde.
