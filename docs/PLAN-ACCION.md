# FONENDO — Plan de acción técnico

> Documento operativo. Última actualización: **2026-10-29**.
> Este archivo manda sobre cualquier otra nota técnica del repo.
> Complementa a `docs/PLAN-LANZAMIENTO.md` (estrategia comercial), que fue revisado
> el 2026-10-29 con los cambios de la sección 1.
> Si hay contradicción entre los dos, manda este.

---

## 1. Decisiones cerradas (2026-10-29)

| # | Decisión | Valor |
|---|---|---|
| 1 | Nombre comercial del SaaS | **Fonendo** |
| 2 | Relación con KATDOC | KATDOC queda como marca de la clínica de la cuñada, **cliente #1 gratis**. Fonendo es el producto |
| 3 | Código | **Repo nuevo separado**, copia con historial. El actual se congela |
| 4 | Base de datos | **Proyecto Supabase nuevo**. El actual no se toca nunca |
| 5 | Deploy | **Proyecto Vercel nuevo**. El actual sigue sirviendo a la clínica #1 |
| 6 | Entrada de clientes | **Invitación manual**. Sin autorregistro hasta pasar $1.000 MRR |
| 7 | Lanzamiento comercial | **1 de febrero de 2027** |
| 8 | Gate de aislamiento | **15 de diciembre de 2026** (no se mueve) |
| 9 | Dominio | Se compra en enero. Se trabaja con `*.vercel.app` |
| 10 | Multi-tenant | Real, desde el día uno. Nunca multi-instancia |

### Por qué repo nuevo y no una rama

Con una rama se sigue trabajando dentro del mismo repo y el riesgo de un push al
remoto equivocado existe. Con un repo aparte el riesgo es cero por construcción.
El costo es que un fix clínico pueda haber que aplicarlo dos veces (estimado: 0 a 2
casos en todo el proyecto). Se acepta.

### Lo que cambia respecto de `PLAN-LANZAMIENTO.md`

- §6 criterio de aceptación: ya no dice "cualquiera puede registrarse", dice "yo creo
  la clínica, invito a los usuarios, y la clínica A no ve ni un registro de la B".
- §7 calendario: 13 semanas, lanzamiento 1 de febrero.
- §9 protocolo: la clínica #1 **no se migra en el lugar**. Se copia a un proyecto nuevo.
- Alcance de enero recortado: sin export CSV, sin caso de estudio en video, sin
  autorregistro.
- Presupuesto real: ~165-180 h contra 140 h del plan original.

---

## 2. Regla de oro

Hasta el día del corte, **no se toca**:

1. El Supabase actual de la clínica #1: ni una migración, ni una política, ni un UPDATE.
2. El repo actual (`Javierjmc/katdoc-cloud`) y su deploy: cero commits, cero pushes.
3. Su URL, su PIN y sus accesos: igual que hoy.

Si una tarea requiere romper una de las tres, se replantea la tarea.

---

## 3. Arquitectura antes / después

| Capa | Hoy (KATDOC) | Después (Fonendo) |
|---|---|---|
| Código | `Documents\web\katdoc` → `Javierjmc/katdoc-cloud` | `Documents\web\fonendo-saas` → repo privado nuevo |
| Base de datos | Supabase `sjuditnsedkahilgcovi` | Proyecto Supabase nuevo |
| Deploy | Proyecto Vercel actual | Proyecto Vercel nuevo (Hobby → Pro) |
| Auth | PIN global `APP_PIN` | Supabase Auth, email + contraseña, roles |
| Storage | Buckets públicos | Bucket privado + bucket `branding` público |
| Marca | KATDOC hardcodeado | White label por clínica. "Fonendo" solo en el shell |

El proyecto viejo queda **intacto y accesible 90 días** después del corte. Ese es el
rollback real.

---

## 4. Estado verificado (2026-10-29)

### Base de producción

| Tabla | Filas |
|---|---|
| tutors | 82 |
| patients | 84 |
| medical_records | 99 |
| vaccinations | 46 |
| laboratory_exams | 27 |
| prescriptions | 37 |
| ecografias | 6 |
| appointments | 9 |
| reminders | 29 |
| notification_log | 454 |
| notification_config | 6 |

~50 consultas/mes, dos meses consecutivos. Hay un usuario real usándolo a diario.

### Entorno

- Node 24.11.0, npm 11.6.1
- `gh` autenticado como **Javierjmc** (scopes: repo, workflow, gist, read:org)
- `vercel` CLI 50.29.0 autenticada como **ia-2568**
- Supabase CLI: no instalada. Usar `npx supabase`
- Remoto actual: `https://github.com/Javierjmc/katdoc-cloud.git`
- 26 commits, 4,1 MB de código, 1,8 MB de `.git`
- Historial **sin secretos**: `.env.local` nunca se commiteó; solo hay placeholders
  truncados en `.env.local.example` y `README.md`

### Exposición actual (verificada con la anon key pública, solo lectura)

- `GET /rest/v1/dashboard_search` devuelve nombres de pacientes y cédulas de tutores
  sin login.
- `POST /storage/v1/object/list/pet-photos` lista los objetos sin login.

Esto confirma el bloqueador 3 del plan comercial con evidencia, no con teoría.

---

## 5. Riesgos técnicos encontrados en el código

Hay que resolverlos todos antes del gate. No están en el plan comercial original.

| # | Hallazgo | Dónde | Qué hay que hacer |
|---|---|---|---|
| 1 | Las URLs de archivos se guardan **completas y públicas** en la base (`photo_url`, `document_url`, `adjuntos[].url`, imágenes de ecografía) | `lib/supabase.ts` (21 `getPublicUrl`), `types/index.ts` | Guardar **rutas**, no URLs. Resolver con URL firmada al renderizar. Migrar el dato existente |
| 2 | `tutors_cedula_unique UNIQUE (cedula)` es global | `supabase_schema.sql` | Pasar a `UNIQUE (clinic_id, cedula)`. Afecta también `findTutorByCedula` |
| 3 | `generate_numero_historia()` cuenta todas las consultas del sistema | `supabase_schema.sql` | Secuencia por clínica: `HC-<clinic>-YYYY-NNNN` o contador por `clinic_id` |
| 4 | `notification_config.tipo UNIQUE` es global | `migrations/20260809_katdoc_v2.sql` | Pasar a `UNIQUE (clinic_id, tipo)` y sembrar 6 filas por clínica |
| 5 | La vista `dashboard_search` no tiene `security_invoker` | `supabase_schema.sql` | `ALTER VIEW ... SET (security_invoker = true)` + filtrar por `clinic_id` |
| 6 | El cron y las notificaciones usan el cliente **anon** del lado servidor | `lib/notifications/scan.ts` importa `lib/supabase.ts` | Cliente `service_role` server-only, nunca importado desde el cliente. El cron itera por clínica |
| 7 | Las API routes se autentican con `NEXT_PUBLIC_APP_PIN`, que está en el bundle | `lib/api-auth.ts`, `app/api/exams/parse`, `app/api/notifications/email`, `app/api/reminders/*` | Validar la sesión de Supabase. Rate limit en la ruta de IA (hoy cualquiera puede quemar la cuota de Gemini) |
| 8 | `next.config.js` solo permite `/storage/v1/object/public/**` | `next.config.js` | Agregar `/object/sign/**` o usar `unoptimized` para imágenes de storage |
| 9 | Los PDFs leen `/logo-katdoc.jpg` y `/sello-firma.jpg` de `/public`; hay `@katdoc.mv` hardcodeado | `lib/examPdf.ts`, `lib/recipePdf.ts` | Pasar los bytes del branding de la clínica. Verificar **paridad byte a byte** con los PDFs de hoy |
| 10 | Marca hardcodeada | `components/AppShell.tsx`, `app/layout.tsx`, `public/manifest.json` | Nombre de la clínica desde `clinics`; "Fonendo" solo en shell y emails |
| 11 | No hay ningún framework de test ni `supabase/config.toml` | `package.json` | Suite de aislamiento propia (`scripts/isolation-test.mjs`) |
| 12 | Next 14.2.5, vulnerable a CVE-2025-29927 (bypass de middleware) | `package.json` | Subir a 14.2.25+ antes del gate. No depender solo del middleware: RLS manda |
| 13 | No hay service role key en el entorno | `.env.local` | Agregar `SUPABASE_SERVICE_ROLE_KEY` solo para uso server-side |
| 14 | La cuota de IA (60/250 lecturas) no existe en el código | — | Tabla de uso por clínica + chequeo en la ruta de parseo |

---

## 6. Fase 0 — 25 minutos, dueño del producto

- [ ] Crear el proyecto Supabase nuevo: nombre `fonendo-dev`, región `us-east-1`,
      plan **Free**, contraseña fuerte de base. Guardar URL y contraseña.
- [ ] Traer la cadena de conexión del proyecto viejo (Settings → Database →
      Connection string → URI). Resetear la contraseña es seguro: la app no usa
      conexión directa, usa la API REST con la anon key.
- [ ] Verificar en qué plan está el proyecto viejo (Settings → Billing).
- [ ] Reservar handles gratis: Instagram `@fonendo.ve`, TikTok, número de WhatsApp
      Business aparte del personal.
- [ ] Sumar a las 5 llamadas del §12 del plan comercial la pregunta:
      *"de estas tres marcas, ¿cuál recordás mañana?"* — Fonendo, Ojo Clínico, Ficha.

---

## 7. Fase 1 — primera sesión de build (~3 h)

No se escribe producto todavía. Solo el entorno seguro.

| # | Paso | Salida verificable |
|---|---|---|
| 1 | `pg_dump` del proyecto actual (solo esquema `public`) | Archivo local fechado. Producción intacta |
| 2 | `gh repo create fonendo-saas --private` + clon con historial | Repo nuevo con los 26 commits |
| 3 | Snapshot inicial + `.env.local.example` + README | Punto de partida reproducible |
| 4 | Proyecto Vercel nuevo apuntando al repo nuevo (Hobby) | `fonendo-saas.vercel.app` responde |
| 5 | Restaurar esquema y datos en el Supabase nuevo | 84/99/46/27/37 filas |
| 6 | Copiar objetos de Storage (copia, no traslado) | Originales siguen accesibles |
| 7 | Migración `clinics` + `clinic_id` + constraints del §5 (2, 3, 4, 5) | Esquema listo para multi-tenant |
| 8 | `scripts/isolation-test.mjs` | **Corre y falla.** Estado correcto hoy |

**Definición de terminado:** entorno nuevo con los datos adentro, repo nuevo, y una
prueba automática que demuestra que hoy no hay aislamiento. Producción sin tocar.

### Comandos de referencia

```powershell
# Backup del proyecto actual (usar pooler en modo sesión, puerto 5432)
pg_dump "postgresql://postgres.<ref>:<pass>@aws-0-us-east-1.pooler.supabase.com:5432/postgres" `
  -n public -Fc -f "backups/katdoc-$((Get-Date).ToString('yyyyMMdd')).dump"

# Restaurar en el proyecto nuevo
pg_restore -d "postgresql://postgres.<ref-nuevo>:<pass>@aws-0-us-east-1.pooler.supabase.com:5432/postgres" `
  --no-owner --no-privileges "backups/katdoc-YYYYMMDD.dump"
```

Notas:
- Solo `-n public`. Nada de `auth` ni `storage`: esas las maneja Supabase.
- Los buckets se crean por API/CLI, no por dump.
- El pooler en modo transacción (puerto 6543) **no** sirve para `pg_dump`.
- La cadena de conexión va en `.env.local`, que está en `.gitignore`. Nunca al chat
  ni al repo.

---

## 8. Fases del producto

| Fase | Semanas | Entregable | Criterio de aceptación |
|---|---|---|---|
| **A. Esquema multi-clínica** | 2-15 nov | `clinic_id` en las tablas, historia por clínica, cédula única por clínica | Dos clínicas cargan sin colisionar |
| **B. Auth y roles** | 16-29 nov | Login email+password, owner/vet/asistente, cliente auth-aware | La clínica #1 entra sin PIN y ve solo lo suyo |
| **C. RLS y storage privado** | 30 nov - 13 dic | Políticas en las 12 tablas, buckets privados, URLs firmadas, rutas migradas | **Test de aislamiento en verde** |
| **D. Branding y alta** | 14 dic - 3 ene | **GATE 15 dic** + logo/RIF/firma por clínica con PDFs idénticos + alta manual + cuota IA | Sus reportes salen iguales a hoy |
| **E. Landing y piloto** | 4-24 ene | Una página + precios + legales, ensayo del corte, migración real | Clínica #1 opera sin perder un dato |
| **F. Lanzamiento** | 25 ene - 1 feb | 2 pilotos, cobranza, material de venta | Primer pago |

### Criterio del gate (15 de diciembre)

Dos clínicas de prueba creadas y un test automatizado que demuestre que un usuario de
la clínica A **no puede leer ni un solo registro** de la clínica B.

Si no pasa: no se lanza en febrero. Se lanza cuando pase.

---

## 9. Spec del test de aislamiento

Archivo: `scripts/isolation-test.mjs`. Debe fallar hoy y pasar después de la fase C.

Crea dos clínicas (A y B) con un usuario cada una y datos mínimos, y verifica:

1. Con el JWT de A: `select *` en las 12 tablas devuelve solo filas de A.
2. Con el JWT de A: leer por id un registro de B devuelve 0 filas (no error, 0 filas).
3. Con el JWT de A: `insert` con `clinic_id` de B es rechazado.
4. Con el JWT de A: `update`/`delete` sobre un id de B afecta 0 filas.
5. Con la **anon key sin sesión**: las 12 tablas devuelven 0 filas.
6. Con la anon key: `dashboard_search` devuelve 0 filas.
7. Con la anon key: listar `storage.objects` de clínica B devuelve vacío o error.
8. Una URL firmada emitida para A no sirve para leer un objeto de B.
9. `notification_config` de A no se mezcla con la de B.
10. El número de historia generado en A no depende de los registros de B.

Mientras haya un solo `true` en los puntos 1 a 10 con datos cruzados, el gate está rojo.

---

## 10. Costos y cuándo pagar

| Servicio | Ahora | Trigger para pagar | Costo |
|---|---|---|---|
| Vercel | Hobby ($0) | **Antes de vender**: Hobby prohíbe uso comercial | Pro $20/mes |
| Supabase (nuevo) | Free ($0) | **Antes de copiar los datos reales de la clínica #1**: Free no tiene backups | Pro $25/mes |
| Supabase (actual) | ? | Verificar plan. Si está en Free, hoy no hay backups | Pro $25/mes |
| Gemini | Free | Antes del lanzamiento (tier free entrena con los datos) | ~$0,005 por lectura |
| Dominio | No comprado | Enero, para los pilotos | ~$12/año |

Rampa real: noviembre-diciembre $0 → enero $70/mes (dos Supabase + Vercel) → al retirar
el proyecto viejo, $45/mes.

### Acción inmediata, cueste $0

Si el proyecto actual está en Free, la clínica #1 tiene **cero backups** hoy. Un
`pg_dump` semanal a una carpeta local y a un disco externo resuelve el riesgo sin
pagar nada. Es lo primero que se hace en la fase 1.

---

## 11. Protocolo de migración de la clínica #1

Se ejecuta en enero, después del gate. En este orden:

1. Copia delta: filas y objetos creados desde la copia de la fase 1.
2. **Congelar escrituras**: cambiar el `APP_PIN` del deployment viejo por uno aleatorio.
   No requiere tocar el esquema y la app vieja sigue leyendo.
3. Última copia delta y verificación de conteos.
4. Verificar paridad: 84 pacientes / 99 consultas / 46 vacunas / 27 exámenes / 37
   recetas. Abrir 5 adjuntos de cada tipo.
5. **Verificar paridad de PDFs**: reporte, receta y examen deben salir idénticos a hoy
   (logo, firma, membrete, QR, colores). Es el flujo real de la veterinaria.
6. Crear sus usuarios en el proyecto nuevo y entregar credenciales en persona.
7. Cambiar la URL. Reinstalar el acceso directo en el celular.
8. Dejar el proyecto y el deploy viejos **intactos y accesibles 90 días**.
9. Si algo falla: se vuelve a la URL vieja y no se perdió nada.

Datos para el caso de estudio (pedírselos a ella):
- Cuánto tardaba antes vs. ahora por consulta.
- Cuánto tardaba antes vs. ahora por examen de laboratorio.
- Cuántos recordatorios trajeron pacientes de vuelta.
- Si recuperó historias que tenía perdidas.

---

## 12. Fuera de alcance hasta pasar $1.000 MRR

- Autorregistro self-serve (se reemplaza por "solicitar acceso" + alta manual).
- Export CSV.
- Caso de estudio en video (se reemplaza por capturas + 2 frases suyas).
- WhatsApp Business API automática (sigue siendo `wa.me` manual).
- Inventario, caja, facturación SENIAT.
- App nativa, portal del tutor, agenda pública, multi-sucursal, offline.
- Pasarela de pago. Cobro manual hasta el cliente ~20.

---

## 13. Decisiones abiertas

| # | Decisión | Estado |
|---|---|---|
| 1 | Dominio definitivo (`fonendo.app` / `fonendo.vet`) | Verificado libre el 2026-10-29. Comprar en enero |
| 2 | `fonendo.com` está registrado, sin sitio activo | Revisar antes de invertir en marca |
| 3 | Plan en que está el Supabase actual | Pendiente de verificar |
| 4 | Nombre de sociedad / persona natural para facturar | Pendiente, no bloquea |
| 5 | Validación del nombre con los 5 veterinarios | Pendiente, esta semana |

---

## 14. Cómo retomar

Al abrir una sesión nueva:

1. Leer este archivo.
2. Revisar la sección 15 (bitácora) para saber dónde quedó.
3. Verificar el estado real:

```powershell
# ¿El repo viejo sigue intacto?
git -C "C:\Users\Martinez Pulvett\Documents\web\katdoc" log --oneline -3
git -C "C:\Users\Martinez Pulvett\Documents\web\katdoc" status --short

# ¿Existe el repo nuevo?
Test-Path "C:\Users\Martinez Pulvett\Documents\web\fonendo-saas"

# ¿El test de aislamiento está en verde o rojo?
# (correrlo desde el repo nuevo cuando exista)
```

4. Continuar por el primer paso sin marcar de la fase en curso.

Reglas de trabajo:

- Nunca commitear ni deployar sin pedido explícito.
- Nunca pegar la cadena de conexión ni la service role key en el chat o en un archivo
  versionado.
- Trabajar siempre en `fonendo-saas`. El repo `katdoc-cloud` es archivo histórico.
- Antes de cada migración: backup.

---

## 15. Bitácora

- **2026-10-28** — Plan comercial cerrado (`docs/PLAN-LANZAMIENTO.md`).
- **2026-10-29** — Revisión completa del repo y de la base de producción. Verificada
  la exposición de `dashboard_search` y `pet-photos` con la anon key. Detectados 14
  riesgos técnicos no contemplados (sección 5). Decisiones cerradas: nombre Fonendo,
  repo nuevo, Supabase nuevo, Vercel nuevo, invitación manual, lanzamiento 1 de
  febrero, gate 15 de diciembre. Presupuesto reestimado en ~165-180 h.
