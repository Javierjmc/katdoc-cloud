# KATDOC — Documento de continuidad (2026-08-29)

> Para retomar el desarrollo al día siguiente. Leer esto primero.

## Estado del proyecto

App de veterinaria **KATDOC** (vetcare-pro), Next.js 14.2.5 + Supabase + Tailwind.
Proyecto personal de Javier — NO es GTC. Sin protocolo de ramas/PRs externo; commits directos a `main`.

- Repo: `C:\Users\Martinez Pulvett\Documents\web\katdoc`
- Local: dev server en `http://localhost:3000` (PIN `1234`)
- Supabase prod: proyecto `sjuditnsedkahilgcovi` (credenciales en `.env.local`)
- **Working tree limpio** (todo commiteado)

### Commits (7 desde el MVP base)
| Commit | Contenido |
|---|---|
| `5fbf6a3` | MVP v2 completo (S1–S19): vacunas, exámenes, recetas, ecografías, reporte, notificaciones |
| `c4a8c85` | S22–24: citas, calendario `/agenda`, seguimiento "sin respuesta" |
| `ad7b274` | S25: validación zod (paciente, citas, vacunas) |
| `38198f4` | S26: auth mínima en API routes + keys de prod en vercel.json |
| `88c6f3b` | S27: pulido visual (tokens surface, ConfirmDialog, gitattributes) |
| `11a8c1e` | fix migración: `DROP VIEW dashboard_search` antes de recrear (42P16) |

## Lo que ya funciona (verificado)

- `tsc --noEmit`, `npm run lint`, `npm run build` → todos verdes
- Migración **aplicada en prod** (verificado vía REST): 8 tablas (`vaccinations`, `laboratory_exams`, `prescriptions`, `ecografias`, `notification_config`, `reminders`, `notification_log`, `appointments`) + `patients.active` + vista `dashboard_search.active` + 6 presets de config (`vacuna`, `desparasitacion`, `examen`, `control`, `cita`, `seguimiento`)
- CRUD de citas end-to-end probado (INSERT→UPDATE→DELETE)
- `/api/reminders/scan` responde 200 con header `x-app-pin`, 401 sin él
- 6 rutas responden 200 local

## Features (mapeo pedido → estado)

| Pedido | Estado |
|---|---|
| Vacunas/desparasitaciones + notificaciones | ✅ Motor recordatorios (scan + cron) + centro notificaciones. WhatsApp manual (wa.me), email Resend |
| Calendario + citas | ✅ `/agenda` mensual + módulo citas en perfil |
| Seguimiento "no respondió" | ✅ Pestaña Seguimiento en `/notifications` |
| Formularios fáciles | ✅ Selects con default, autofocus, progreso, enter-guardar, zod |
| Exámenes externos PDF/imagen + exportar | ✅ Subida + analitos + IA (Gemini). "PDF" = impresión navegador |
| Ecografías | ✅ |
| Recetas editables antes de enviar | ✅ |
| Estilo moderno | ✅ Pulido sobre tokens brand/surface |

## Pendientes manuales (de Javier)

1. **Keys en `.env.local`** (están como comentarios): `GEMINI_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM`. Sin ellas: IA de exámenes y email caen a fallback (mailto).
2. **Deploy Vercel** (nunca deployado):
   - Conectar repo → crear proyecto
   - Secrets en Vercel: `@supabase_url`, `@supabase_anon_key`, `@app_pin`, `@gemini_api_key`, `@resend_api_key`, `@resend_from`, `@cron_secret`
   - `vercel.json` ya tiene cron (13:00 UTC) + env refs
   - Nota: si la región `gru1` falla en Hobby, cambiar a `iad1`
   - `CRON_SECRET`: generar con `openssl rand -hex 16`; el cron la manda como `Authorization: Bearer`
   - Resend: para envíos reales a clientes hay que verificar dominio (free tier 100/día; `onboarding@resend.dev` solo envía al owner)

## Cómo retomar

```powershell
# 1. Arrancar dev
npm run dev

# 2. Si el .next quedó corrupto (mezclar build + dev lo rompe):
Stop-Process -Name node -ErrorAction SilentlyContinue
Remove-Item .next -Recurse -Force
npm run dev

# 3. Verificación rápida de BD (Powershell, solo lectura)
# (script: leer .env.local, GET $url/rest/v1/<tabla>?select=id&limit=1 con header apikey)

# 4. Antes de commitear: build
$env:NODE_OPTIONS="--max-old-space-size=3072"; npm run build
```

## Riesgos conocidos / deudas técnicas

- **API routes** protegidas con PIN (`lib/api-auth.ts`) — no hay RLS en tablas (la anon key tiene acceso completo). Para datos reales considerar RLS + Supabase Auth como evolución.
- **PDF**: solo impresión por navegador, no archivo server-side.
- **WhatsApp**: manual (wa.me). Automatizar requiere Meta/Twilio (decisión de costo pendiente).
- `supabase_schema.sql` sigue con la definición vieja de la vista (sin `active`) — es el schema base histórico; la migración manda.
- `config/page.tsx` usa textos con `{dias_antes}` literales en la descripción (cosmético).

## Posibles próximos pasos

1. Deploy Vercel + probar cron/IA/email en prod
2. Paginación/"cargar más" en listados (S17 quedó sugerido)
3. Guardado del estado de "sin respuesta" más fino (p.ej. histórico de intentos)
4. RLS + Auth real si va a manejar datos sensibles
5. Dashboard con próximos eventos (resumen de la semana en `/dashboard`)

## Notas de sesión

- El dev server en background usa los logs `%TEMP%\katdoc-dev.out.log` / `.err.log`
- `npm run build` y un `next dev` activo comparten `.next` → siempre reiniciar dev tras un build
