# FONENDO — Plan de acción técnico

> Documento operativo. Última actualización: **2026-11-08**.
> Este archivo manda sobre cualquier otra nota técnica del repo.
> Complementa a `docs/PLAN-LANZAMIENTO.md` (estrategia comercial), que fue revisado
> el 2026-10-29 con los cambios de la sección 1.
> Si hay contradicción entre los dos, manda este.
>
> **REVISIÓN 2026-11-08 — la clínica #1 NO se migra.** KatDoc queda como producto
> vivo, con su repo, su Supabase y su Vercel. Fonendo nace de una copia en el tag
> `katdoc-fork-2026-11` y crece aparte. Esto reemplaza la regla de oro anterior
> ("cero commits en el repo actual") y saca el protocolo de migración del §11 del
> camino crítico.

---

## 1. Decisiones cerradas (2026-10-29, revisadas 2026-11-08)

| # | Decisión | Valor |
|---|---|---|
| 1 | Nombre comercial del SaaS | **Fonendo** |
| 2 | Relación con KATDOC | KatDoc es el **producto propio de la clínica #1**, vivo y gratis. Fonendo es el SaaS que se vende y se construye aparte |
| 3 | Código | **Repo nuevo separado**, copia con historial desde el tag `katdoc-fork-2026-11`. El repo actual **sigue vivo** como línea de mantenimiento |
| 4 | Base de datos | **Proyecto Supabase nuevo** para Fonendo. El de KatDoc no se toca nunca |
| 5 | Deploy | **Proyecto Vercel nuevo** para Fonendo. El actual sigue sirviendo a la clínica #1, indefinidamente |
| 6 | Entrada de clientes | **Invitación manual**. Sin autorregistro hasta pasar $1.000 MRR |
| 7 | Lanzamiento comercial | **1 de febrero de 2027** |
| 8 | Gate de aislamiento | **15 de diciembre de 2026** (no se mueve) |
| 9 | Dominio | Se compra en enero. Se trabaja con `*.vercel.app` |
| 10 | Multi-tenant | Real, desde el día uno. Nunca multi-instancia |
| 11 | Migración de la clínica #1 | **No se migra.** Opcional, solo después de $1.000 MRR (§11) |

### Por qué repo nuevo y no una rama

Con una rama se sigue trabajando dentro del mismo repo y el riesgo de un push al
remoto equivocado existe. Con un repo aparte el riesgo es cero por construcción.

Al no migrar la clínica #1, el costo es mantenimiento doble mientras KatDoc siga
recibiendo cambios. Se acota con dos reglas:

1. Los cambios de producto se hacen en KatDoc y se portan a Fonendo por
   `git cherry-pick` (remoto `katdoc`, que apunta a la carpeta local).
2. Después del **15 de diciembre**, KatDoc solo recibe fixes críticos, aplicados a mano
   en cada línea. Nada de features nuevas en la línea vieja.

### Lo que cambia respecto de `PLAN-LANZAMIENTO.md`

- §6 criterio de aceptación: ya no dice "cualquiera puede registrarse", dice "yo creo
  la clínica, invito a los usuarios, y la clínica A no ve ni un registro de la B".
- §7 calendario: 13 semanas, lanzamiento 1 de febrero.
- §9 protocolo: **la clínica #1 no se migra**. Sigue en KatDoc. La migración queda como
  opción post-$1.000 MRR, no como paso del lanzamiento.
- Alcance de enero recortado: sin export CSV, sin caso de estudio en video, sin
  autorregistro.
- Presupuesto real: ~165-180 h contra 140 h del plan original.

---

## 2. Regla de oro

Las dos líneas están separadas por construcción. Reglas que no se rompen:

1. **Nada de Fonendo toca el stack de KatDoc.** Ni una migración, ni un UPDATE, ni una
   lectura sobre el Supabase `sjuditnsedkahilgcovi`, ni un deploy sobre su proyecto.
2. **El código viaja en una sola dirección:** KatDoc → Fonendo por cherry-pick. Nunca al
   revés. Fonendo puede romperse sin consecuencias para la clínica.
3. **Cada carpeta tiene su propio `.env.local`.** El de KatDoc nunca se copia a Fonendo.
4. **KatDoc puede recibir cambios**, pero por PR y con build verde. Es producción con
   datos reales de pacientes.
5. Después del **15 de diciembre**, KatDoc entra en mantenimiento: solo fixes críticos.

---

## 3. Arquitectura antes / después

| Capa | KatDoc (vive) | Fonendo (nuevo) |
|---|---|---|
| Código | `Documents\web\katdoc` → `Javierjmc/katdoc-cloud` | `Documents\web\fonendo-saas` → repo privado nuevo |
| Base de datos | Supabase `sjuditnsedkahilgcovi` | Proyecto Supabase nuevo |
| Deploy | Proyecto Vercel actual | Proyecto Vercel nuevo (Hobby → Pro) |
| Auth | PIN global `APP_PIN` | Supabase Auth, email + contraseña, roles |
| Storage | Buckets públicos | Bucket privado + bucket `branding` público |
| Marca | KATDOC en `lib/brand.ts` | White label por clínica. "Fonendo" solo en el shell |

No hay "corte" ni rollback: KatDoc sigue operando con su stack. Fonendo arranca en
paralelo con un Supabase nuevo y no puede afectarlo.

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
| 9 | Los PDFs usaban rutas fijas y `@katdoc.mv` hardcodeado | `lib/examPdf.ts`, `lib/recipePdf.ts` | **Resuelto en KatDoc (2026-11-08):** `lib/brand.ts` centraliza rutas y contacto; sello con fondo blanco. En Fonendo falta que el branding venga de la tabla `clinics` y que el sello se suba por clínica |
| 10 | Marca hardcodeada | `components/AppShell.tsx`, `app/layout.tsx`, `public/manifest.json` | **Resuelto en KatDoc (2026-11-08):** `lib/brand.ts` + `components/BrandMark.tsx`. En Fonendo, `BRAND` se reemplaza por la config de la clínica |
| 11 | No hay ningún framework de test ni `supabase/config.toml` | `package.json` | Suite de aislamiento propia (`scripts/isolation-test.mjs`) |
| 12 | Next 14.2.5, vulnerable a CVE-2025-29927 (bypass de middleware) | `package.json` | Subir a 14.2.25+ antes del gate. No depender solo del middleware: RLS manda |
| 13 | No hay service role key en el entorno | `.env.local` | Agregar `SUPABASE_SERVICE_ROLE_KEY` solo para uso server-side |
| 14 | La cuota de IA (60/250 lecturas) no existe en el código | — | Tabla de uso por clínica + chequeo en la ruta de parseo |
| 15 | Doble línea de código (KatDoc + Fonendo) | — | Ventana de cherry-pick abierta hasta el 15 dic. Después, fixes a mano en cada línea |

Los riesgos 9 y 10 ya están resueltos en KatDoc con `lib/brand.ts` y `components/BrandMark.tsx`.
Ese refactor es el punto de enchufe del white-label en Fonendo: `BRAND` pasa a leerse de
la tabla `clinics` y el sello se sube por clínica.

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
| 2 | `gh repo create fonendo-saas --private` + push | Repo nuevo con la historia hasta `katdoc-fork-2026-11` |
| 3 | Snapshot inicial + `.env.local.example` + README | Punto de partida reproducible |
| 4 | Proyecto Vercel nuevo apuntando al repo nuevo (Hobby) | `fonendo-saas.vercel.app` responde |
| 5 | Restaurar esquema y datos en el Supabase nuevo | 84/99/46/27/37 filas |
| 6 | Copiar objetos de Storage (copia, no traslado) | Originales siguen accesibles |
| 7 | Migración `clinics` + `clinic_id` + constraints del §5 (2, 3, 4, 5) | Esquema listo para multi-tenant |
| 8 | `scripts/isolation-test.mjs` | **Corre y falla.** Estado correcto hoy |

**Definición de terminado:** entorno nuevo con los datos adentro, repo nuevo, y una
prueba automática que demuestra que hoy no hay aislamiento. Producción sin tocar.

**Sobre los datos copiados:** como la clínica #1 no se migra, esa copia es solo para
desarrollo y pruebas. Anonimizar nombres y cédulas, o tratar `fonendo-dev` como
producción desde el día uno.

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
| **B. Auth y roles** | 16-29 nov | Login email+password, owner/vet/asistente, cliente auth-aware | Un usuario de prueba entra sin PIN y ve solo lo suyo |
| **C. RLS y storage privado** | 30 nov - 13 dic | Políticas en las 12 tablas, buckets privados, URLs firmadas, rutas migradas | **Test de aislamiento en verde** |
| **D. Branding y alta** | 14 dic - 3 ene | **GATE 15 dic** + logo/RIF/firma por clínica con PDFs propios + alta manual + cuota IA | Los reportes salen con el branding de cada clínica |
| **E. Landing y piloto** | 4-24 ene | Una página + precios + legales, ensayo con datos de prueba | Un veterinario externo carga su primera consulta sin ayuda |
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
| Vercel (Fonendo) | Hobby ($0) | **Antes de vender**: Hobby prohíbe uso comercial | Pro $20/mes |
| Supabase (Fonendo) | Free ($0) | **Antes de vender**: Free no tiene backups | Pro $25/mes |
| Supabase (KatDoc) | ? | **Verificar ya**: si está en Free, la clínica #1 no tiene backups | Pro $25/mes |
| Gemini | Free | Antes del lanzamiento (tier free entrena con los datos) | ~$0,005 por lectura |
| Dominio | No comprado | Enero, para los pilotos | ~$12/año |

Rampa real: noviembre-diciembre $0 → enero $70/mes (dos Supabase + Vercel). Como KatDoc
no se retira, los dos Supabase y los dos Vercel son **permanentes** mientras la clínica
#1 siga en la línea vieja.

### Acción inmediata, cueste $0

Si el proyecto actual está en Free, la clínica #1 tiene **cero backups** hoy. Un
`pg_dump` semanal a una carpeta local y a un disco externo resuelve el riesgo sin
pagar nada. Es lo primero que se hace en la fase 1.

---

## 11. Migración de la clínica #1 — opcional, fuera del lanzamiento

KatDoc sigue operando con su stack. Esta migración **no es parte del lanzamiento** y se
evalúa solo después de pasar $1.000 MRR.

Disparador: **60 días sin pedidos nuevos** de la clínica #1. Si en ese plazo no pidió
nada, migrar es más barato que seguir manteniendo dos líneas. Si sigue pidiendo cosas,
la doble línea se justifica sola.

Si algún día se decide migrar, el protocolo es:

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

### Estado al 2026-11-08

| | |
|---|---|
| KatDoc producción | Branding nuevo live (PR #1 mergeado) |
| Tag `katdoc-fork-2026-11` | En el último commit de `main`, no en `6782f87` |
| `fonendo-saas` local | Clon exacto de `main` (sincronizado tras el último commit de docs). `origin` → repo nuevo (**no existe todavía**). Remoto `katdoc` a la carpeta local. Sin `.env.local` |
| Fonendo remoto | **No creado** |
| Supabase Fonendo | **No creado** |
| Vercel Fonendo | **No creado** |
| Siguiente paso | Crear el repo privado y pushear (§7, paso 2) |

### Primer comando de mañana

```powershell
cd "C:\Users\Martinez Pulvett\Documents\web\fonendo-saas"
Test-Path .env.local          # tiene que dar False
gh repo create fonendo-saas --private --source=. --push
git push origin --tags
git remote -v                 # origin = repo nuevo, katdoc = ..\katdoc
```

Después, sí: fase 0 y fase 1 (§6 y §7).

### Verificación rápida del estado

```powershell
# KatDoc: main == origin/main, árbol limpio
git -C "C:\Users\Martinez Pulvett\Documents\web\katdoc" status -sb
git -C "C:\Users\Martinez Pulvett\Documents\web\katdoc" log --oneline -3

# Fonendo: mismo commit y mismo tag que KatDoc
git -C "C:\Users\Martinez Pulvett\Documents\web\fonendo-saas" log --oneline -1
git -C "C:\Users\Martinez Pulvett\Documents\web\fonendo-saas" rev-parse --short "katdoc-fork-2026-11^{}"

# Producción de KatDoc
# https://katdoc-cloud.vercel.app/login debe mostrar el logo real
```

### Reglas de trabajo

- Nunca commitear ni deployar sin pedido explícito.
- Nunca pegar la cadena de conexión ni la service role key en el chat o en un archivo
  versionado.
- El trabajo nuevo va en `fonendo-saas`. `katdoc-cloud` es la línea de la clínica #1 y
  solo recibe fixes o mejoras de producto que también se porten.
- Antes de cualquier migración o copia de datos: backup.
- La ventana de cherry-pick se cierra el **15 de diciembre**.

---

## 15. Bitácora

- **2026-10-28** — Plan comercial cerrado (`docs/PLAN-LANZAMIENTO.md`).
- **2026-10-29** — Revisión completa del repo y de la base de producción. Verificada
  la exposición de `dashboard_search` y `pet-photos` con la anon key. Detectados 14
  riesgos técnicos no contemplados (sección 5). Decisiones cerradas: nombre Fonendo,
  repo nuevo, Supabase nuevo, Vercel nuevo, invitación manual, lanzamiento 1 de
  febrero, gate 15 de diciembre. Presupuesto reestimado en ~165-180 h.
- **2026-11-08** — Rebranding de KatDoc: logo real en sidebar/login/reportes, sello sin
  fondo gris en los PDFs, título de pestaña e íconos PWA. Se centraliza la marca en
  `lib/brand.ts` + `components/BrandMark.tsx` y se agrega `scripts/procesar-marca.py`
  (pipeline reproducible desde `assets/brand/`). PR #1 mergeado y desplegado.
- **2026-11-08** — **Cambio de estrategia:** la clínica #1 no se migra. KatDoc queda
  vivo como producto propio, con su Supabase y su Vercel. Fonendo nace de una copia en
  el tag `katdoc-fork-2026-11` y crece aparte. Se elimina la migración del camino
  crítico y se reemplaza la regla de oro (§2). Presupuesto y calendario del SaaS no
  cambian.
