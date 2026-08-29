# S3 — Historial reproductivo sin "Castrado/a"

**Fase:** 0 · **Prioridad:** media · **Rama:** `feat/javier/reproductivo-sin-castrado`

## Objetivo
Eliminar la opción `Castrado/a` del select de Historial Reproductivo y normalizar
los registros existentes que la usan.

## Contexto
`MedicalRecordForm.tsx:194` usa `options={['Entero/a', 'Esterilizado/a', 'Castrado/a', 'Desconocido']}`.
Los datos seed (`seed_data.sql`) contienen `'Castrado/a'` en Rocky
(`HC-2026-0009`, `HC-2026-0010`).

## Cambios

### `components/MedicalRecordForm.tsx`
- Nueva lista: `['Entero/a', 'Esterilizado/a', 'Desconocido']`.
- Si al editar el valor legacy es `'Castrado/a'`, mapearlo a `'Esterilizado/a'`
  antes de renderizar/guardar (transformar el valor al inicializar el form).

### Migración de datos (parte de S19, ejecutar junto con esta spec)
```sql
UPDATE medical_records
SET historial_reproductivo = 'Esterilizado/a'
WHERE historial_reproductivo = 'Castrado/a';
```

## Criterios de aceptación
- [ ] El select de Historial Reproductivo no muestra `Castrado/a`.
- [ ] Editar una historia con `Castrado/a` legacy muestra `Esterilizado/a` y guarda
      ese valor.
- [ ] La migración SQL se ejecutó y no quedan filas con `Castrado/a` (verificar con
      `SELECT count(*) FROM medical_records WHERE historial_reproductivo = 'Castrado/a';`).
- [ ] `npm run build` y `npm run lint` pasan.

## Verificación
1. Crear consulta nueva → select reproductivo: verificar opciones.
2. Editar `HC-2026-0009` → confirmar que muestra `Esterilizado/a`.
3. Correr el `UPDATE` en Supabase y verificar count = 0.
