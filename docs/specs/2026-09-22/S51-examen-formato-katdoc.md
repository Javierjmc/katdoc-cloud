# S51 — Exámenes: extracción enriquecida + PDF "Formato KATDOC"

**Prioridad:** alta · **Rama:** `feat/<dev>/s51-examen-formato-katdoc` · **Toca:** IA, exámenes, PDF

## Objetivo
1. Mejorar la **extracción de datos** de exámenes (PDF o foto): que además de los
   analitos capture **descripciones/observaciones, fórmula leucocitaria,
   interpretación y datos del encabezado**.
2. Poder **transformar** cualquier examen cargado a un PDF con el **formato KATDOC**
   (referencia: `docs/Pomerania Chocolate macho.pdf`) mediante un botón.

## Contexto / causa raíz
- `lib/gemini.ts:37-59` (prompt) y `:204-225` (`sanitize`) solo devuelven
  `nombre_examen`, `laboratorio_origen`, `fecha_examen` y `analitos`. Se pierden:
  descripción, médico solicitante, RIF, fórmula leucocitaria, interpretación y
  observaciones del documento (el PDF de referencia SÍ los trae).
- El `flag` comparativo falla en layouts desordenados (ej. VCM 70.8 con rango
  39-55 debería ser ALTO).
- `types/index.ts` — `LaboratoryExam` no tiene campos para descripción/
  interpretación/observaciones; `LabAnalyte` no distingue grupos/secciones.
- No existe generador de PDF de examen.

## Cambios

### Migración BD (idempotente)
`migrations/2026XXXX_katdoc_s51_examen_campos.sql`:
```sql
ALTER TABLE laboratory_exams
  ADD COLUMN IF NOT EXISTS descripcion    TEXT,
  ADD COLUMN IF NOT EXISTS interpretacion TEXT,
  ADD COLUMN IF NOT EXISTS observaciones  TEXT;
```

### `types/index.ts`
- `LabAnalyte`: agregar `grupo?: string` (ej. "Hematología", "Fórmula leucocitaria").
- `LaboratoryExam`: agregar `descripcion?`, `interpretacion?`, `observaciones?`.

### `lib/gemini.ts`
- Prompt: pedir el JSON ampliado:
  - `descripcion` (ej. "KATDOC CONSULTORIO VETERINARIO"),
  - `medico_solicitante`, `rif`,
  - `analitos[]` con `grupo` (sección) además de nombre/valor/unidad/rango/flag,
  - `interpretacion` (ej. "Normocitos normocrómicos / Leucocitosis"),
  - `observaciones` (ej. "Descarte de hemoparásitos: ...").
- `flag`: instruir a comparar numéricamente contra el rango (parsear números);
  si el valor está por encima del máximo → ALTO, por debajo del mínimo → BAJO.
- `sanitize`: normalizar y no descartar los campos nuevos.
- `ParsedExam`: ampliar con los campos nuevos.

### `app/api/exams/parse/route.ts`
- Mantener y agregar `image/bmp` a `allowed` (S45).
- Devolver el objeto ampliado (sin cambios estructurales).

### `components/LabExamsSection.tsx`
- Mostrar/editar `descripcion`, `interpretacion`, `observaciones`; agrupar la tabla
  de analitos por `grupo`.
- Nuevo botón **"🖨 Formato KATDOC"** (en cada examen y/o en el editor) que llama a
  `lib/examPdf.ts` y descarga/abre el PDF.
- El editor mapea los campos nuevos en `fromExam`/`createEmpty`/`handleSave`.

### `lib/examPdf.ts` (nuevo)
- Genera el reporte completo con pdf-lib y `embedJpg` del logo
  (`public/logo-katdoc.jpg`):
  - Encabezado: logo; fecha del análisis (arriba-der, formato `D DE MES AAAA`);
    `ANÁLISIS`; `DESCRIPCIÓN`; `MÉDICO SOLICITANTE`; `RIF`.
  - Datos del paciente: nombre (`PACIENTE`), edad, raza, especie (de la ficha).
  - Secciones por `grupo`, tabla `RESULTADO / V/N / referencia`.
  - `FÓRMULA LEUCOCITARIA` si hay analitos de ese grupo.
  - `INTERPRETACIÓN` y `OBSERVACIONES`.
- `buildExamPdf(exam, opts: { paciente, especie, raza, edad }) => Blob`.

### `app/patients/[id]/page.tsx`
- Pasar a `LabExamsSection` los datos del paciente (nombre, especie, raza,
  `fecha_nacimiento`) para el encabezado del PDF.

## Criterios de aceptación
- [ ] Extraer con IA sobre el PDF/foto de referencia captura analitos + fórmula +
      interpretación + observaciones + descripción; `VCM` sale **ALTO**.
- [ ] Los campos se muestran/editan y se guardan.
- [ ] El botón "Formato KATDOC" genera un PDF con el formato de referencia (logo,
      datos del paciente, tabla por secciones, fórmula, interpretación, observaciones).
- [ ] Funciona tanto si el insumo fue foto como PDF.
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Subir `docs/Pomerania Chocolate macho.pdf` → "Extraer con IA" → revisar campos.
2. "Formato KATDOC" → comparar con el PDF de referencia.
3. Repetir con una **foto** del mismo examen.
4. Examen sin fórmula/observaciones → el PDF no muestra secciones vacías.
