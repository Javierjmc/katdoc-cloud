# S50 — Recipe en formato oficial KATDOC

**Prioridad:** alta · **Rama:** `feat/<dev>/s50-recipe-formato-oficial` · **Toca:** PDF de recipes, peso, assets

## Objetivo
Que el PDF de una recipe use el **formato oficial KATDOC** (referencia:
`docs/formato katdoc.jpeg`), **una hoja A4 con dos recuadros** (Rp. e Ind.), sin
solapado, e incluyendo el **peso**.

## Contexto / causa raíz
- `lib/recipePdf.ts` genera un layout de texto simple: sin logo, sin caja de datos
  paciente, sin `Rp.`/`Ind.`, sin pie con QR. El pie fuerza `y = MARGIN + 8`
  (`:130`) y puede **solaparse** con el contenido.
- Peso: `PrescriptionsSection.tsx:76-77` usa la última consulta; si no hay ninguna
  con peso, queda `null`. El paciente no tiene peso propio. Decisión: **última
  consulta + campo editable en la recipe**.
- Assets: `docs/logo.jpeg` y `docs/qr.jpg` (limpios, fondo blanco). Se copian a
  `public/`.

## Cambios

### Assets
- Copiar `docs/logo.jpeg` → `public/logo-katdoc.jpg` y `docs/qr.jpg` →
  `public/qr-katdoc.jpg` (pdf-lib los embebe con `embedJpg`).

### Migración BD (idempotente)
`migrations/2026XXXX_katdoc_s50_recipe_peso.sql`:
```sql
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS peso NUMERIC(6,2);
```

### `types/index.ts`
- `Prescription.peso?: number | null`.

### `components/PrescriptionsSection.tsx`
- Props nuevas: `tutorNombre?`, `raza?`, `edad?` (o `fechaNacimiento?`).
- Editor: campo **"Peso (kg)"** precargado con la última consulta (editable);
  guardar en `prescriptions.peso`.
- `buildRecipePdf` recibe `{ paciente, propietario, raza, edad, peso, fecha }` y
  el peso usa `recipe.peso ?? pesoUltimaConsulta`.
- El `print-area` (impresión HTML) también debe mostrar raza/edad/peso y usar
  fecha formateada con S46.

### `lib/recipePdf.ts` (reescritura)
- A4 vertical, **dos formularios** en la misma hoja (mitad izquierda `Rp.`, mitad
  derecha `Ind.`), cada uno con borde redondeado teal:
  - Encabezado: logo KATDOC (arriba-izq) + `FECHA: ___/___/___` (arriba-der).
  - Caja de datos: `NOMBRE DEL PACIENTE`, `RAZA`, `EDAD`, `PESO`, `PROPIETARIO`.
  - Izquierda: `Rp.` con los medicamentos (nombre + dosis/frecuencia/duración/vía).
  - Derecha: `Ind.` con indicaciones y notas.
  - Pie: QR, `Altavista Sur, Carrera Gurí`, `Teléfono: 0424-922.95.39`, `@katdoc.mv`.
- Reservar el alto del pie antes de dibujar contenido (`ensureSpace`) y **no**
  reasignar `y` al pie (evita el solapado).

## Criterios de aceptación
- [ ] El PDF se ve como el formato oficial (logo, caja, Rp./Ind., pie con QR).
- [ ] Una hoja con las dos recipes (Rp. e Ind.).
- [ ] El peso sale de la recipe o, si no, de la última consulta; editable.
- [ ] Sin solapado de texto con muchas líneas/medicamentos.
- [ ] Descarga y envío por email siguen funcionando.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Recipe con 3 medicamentos → descargar PDF → comparar con `formato katdoc.jpeg`.
2. Recipe sin peso de consulta → escribir peso en el editor → PDF lo muestra.
3. Muchas líneas → el pie no se solapa.
4. Camino de email (`Resend`) adjunta el PDF nuevo sin error.
