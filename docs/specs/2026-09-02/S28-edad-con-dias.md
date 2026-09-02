# S28 — Edad con meses y días

**Prioridad:** media · **Rama:** directo a `main`

## Objetivo
Que la edad calculada incluya **días** además de meses/años. Ejemplos:
- cachorro de 4 meses y 12 días → "4 meses y 12 días";
- neonato de 25 días → "25 días";
- adulto de 2 años y 3 meses → "2 años y 3 meses" (y si sobra menos de un mes,
  mostrar los días si es relevante, p. ej. "2 años, 3 meses y 5 días").

Hoy `calcularEdad` (`lib/utils.ts:10-22`) solo computa meses totales y nunca
días.

## Contexto (cómo se calcula hoy)
```ts
const born = new Date(fechaNacimiento);
const now  = new Date();
const months = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth());
if (months < 1) return 'Recién nacido';
...
```
Errores actuales además de la falta de días:
- "Recién nacido" se muestra hasta el mes 1 incluso si tiene 0 días.
- No considera si el día del mes ya pasó en el mes actual (ej. nacido el 20 y
  hoy es el 10 del mes siguiente: cuenta 1 mes de más).
- Compara fechas con hora actual → puede desfasar el día exacto de cumpleaños.

## Enfoque

### `lib/utils.ts` — reescribir `calcularEdad`
Algoritmo propuesto (fechas **locales**, sin horas):
1. Parsear `fechaNacimiento` como fecha local a **mediodía**
   (`new Date(f + 'T12:00:00')`) para no heredar problemas de zona horaria
   (consistente con S33).
2. Tomar `hoy` local a mediodía.
3. Calcular diferencia día a día: `diffDays` (floor de la diferencia en días
   usando medianoche local) y descomponer en años/meses/días con un helper
   que recorre fechas (restar días del mes con cuidado al fin de mes, para no
   generar "2 meses y 30 días").
   - Implementación simple: construir fechas ancla (`born + n años`,
     `born + n meses`) y quedarse con el mayor `n` que no supere hoy.
4. Formateo:
   - `diffDays < 0` → "Edad inválida" (fecha futura; devolver "—").
   - `< 30 días` → "N día(s)" (evitar "Recién nacido" genérico; mantener
     "Recién nacido" solo si < 7 días, decisión de wording en verificación).
   - `< 12 meses` → "X meses y Y días" (si Y=0 → "X meses").
   - resto → "A años [y M meses] [y D días]"; si M=0 y D=0 → "A años"; si D>0
     se incluye.
5. Dejar la firma igual (`fechaNacimiento?: string | null` → `string`) para no
   tocar llamadores: `app/patients/page.tsx:142`, `app/patients/[id]/page.tsx:96`,
   `app/patients/[id]/reporte/page.tsx:129`.

Guard para años bisiestos/fin de mes: al restar meses usar
`clampDia(fecha, año, mes)` (si el día 31 no existe en el mes destino, usar el
último día) para no sumar meses de más.

## Criterios de aceptación
- [ ] Cachorro nacido hace 4 meses y 12 días → "4 meses y 12 días".
- [ ] Cachorro de 25 días → "25 días".
- [ ] Adulto: "2 años y 3 meses" (y con días sobrantes si aplica).
- [ ] Cumpleaños hoy → la cuenta de años/meses es correcta (no suma 1 de más
      por la hora).
- [ ] Fecha futura → no rompe (muestra "—"/"Edad inválida").
- [ ] Vistas de listas, perfil y reporte siguen compilando (misma firma).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Probar con nacimientos conocidos: hace 4m12d, hace 25d, hace 2a3m, hace 1a
   exacto, hace 1 mes exacto, fecha futura.
2. Revisar el caso de nacido el 31/01 y hoy 28/02 (fin de mes).
3. Recorrer pacientes (grid/lista), ficha y reporte → la edad se ve en el
   formato nuevo sin excepciones.
