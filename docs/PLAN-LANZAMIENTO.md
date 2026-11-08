# KATDOC — Plan de lanzamiento comercial (2027)

> Documento de trabajo. Última actualización: **2026-10-29**.
> Este archivo manda sobre cualquier otra nota del repo respecto a estrategia comercial.
> Para retomar el desarrollo técnico, ver también `docs/CONTINUAR.md`.

> **REVISIÓN 2026-10-29 — leer antes de usar este documento.**
> El plan operativo vigente es **`docs/PLAN-ACCION.md`**.
> Cambios respecto de esta versión:
> - Nombre del producto: **Fonendo** (KATDOC queda como marca de la clínica #1).
> - El repo, el Supabase y el Vercel del SaaS son **nuevos**. La clínica #1 **no se
>   migra**: sigue en KatDoc, con su stack, indefinidamente. Fonendo nace de una copia
>   del código en el tag `katdoc-fork-2026-11` (ver `PLAN-ACCION.md` §1 y §14).
> - Entrada de clientes: **invitación manual**, sin autorregistro.
> - Lanzamiento: **1 de febrero de 2027**. Gate de aislamiento: **15 de diciembre**.
> - Criterio de aceptación del §6: ya no es "cualquiera se registra", es "yo creo la
>   clínica e invito a los usuarios, y la clínica A no ve ni un registro de la B".
> - Presupuesto real: **~165-180 h** contra las 140 h del §6.
> - Recortado de enero: export CSV, caso de estudio en video, autorregistro.
> El resto de este documento (mercado, precios, proyección, riesgos) sigue vigente.

---

## 1. Resumen ejecutivo

KATDOC deja de ser una app para una clínica y pasa a ser un SaaS multi-clínica con
lanzamiento comercial el **15 de enero de 2027**.

| Decisión | Valor |
|---|---|
| Objetivo de ingresos | **$700/mes mínimo**, meta $1.000/mes (recurrente) |
| Horizonte | 1 año ideal, 2 años aceptable |
| Dedicación | **15 h/semana** (~60 h/mes) |
| Modelo | Suscripción mensual + fee de implementación |
| Precio básico | **$25/mes** (3 usuarios, 60 lecturas IA/mes) |
| Precio avanzado | **$35/mes** (6 usuarios, 250 lecturas IA/mes) |
| Anual | −20% ($240 / $336) |
| Implementación | **$79 una vez** por clínica |
| Cobro | Manual (WhatsApp + Binance/USDT + Pago Móvil) hasta el cliente ~20 |
| Estrategia técnica | Multi-tenant real **antes** de vender (no multi-instancia) |
| Lanzamiento | 15 de enero de 2027 |
| Gate de seguridad | **15 de diciembre de 2026** (si no pasa, se mueve a febrero) |

**Tesis:** no competimos por features ni por precio contra Wirevet / VetCloud / Vetesoft.
Competimos por **encaje clínico**: la historia que se llena desde el celular en 60
segundos, el reporte que sale en el formato que la clínica ya usa, y la IA que lee el
examen de laboratorio. Cliente ideal: consultorio de 1 a 3 veterinarios.

---

## 2. Estado actual del producto (medido en producción)

Consultado contra el Supabase de producción el 2026-10-28:

| Tabla | Registros |
|---|---|
| `tutors` | 81 |
| `patients` | 83 |
| `medical_records` | 98 (59 en sep, 39 en oct) |
| `vaccinations` | 46 |
| `laboratory_exams` | 27 |
| `prescriptions` | 36 |
| `ecografias` | 6 |
| `appointments` | 9 |
| `reminders` | 29 |
| `notification_log` | 432 |

Lectura: **~50 consultas/mes, ~2 por día, dos meses consecutivos**. Hay un usuario real
usándolo a diario. Eso es el activo, no el código.

### Lo que ya funciona y es diferencial

- Examen clínico estructurado: 12 sistemas con N/AN/NE + nota de descargo por sistema.
- Constantes vitales, mucosas, ganglios, pulso, tiempo de llenado capilar.
- Vacunas y desparasitaciones con próxima dosis y recordatorio.
- Exámenes de laboratorio con analitos, rangos y flags (alto/bajo).
- **Extracción de analitos desde PDF/foto con IA (Gemini)** — el diferencial principal.
- Recetas con dosis por peso + PDF.
- Ecografías con imágenes y adjuntos.
- Reporte clínico imprimible.
- Agenda con estados + motor de recordatorios (cron diario).
- Modo oscuro, mobile-first, PWA.

---

## 3. Bloqueadores técnicos (por qué no se puede vender hoy)

1. **No hay multi-tenant.** No existe tabla `clinics` ni `clinic_id`. La segunda clínica
   vería los 83 pacientes de la primera.
2. **No hay usuarios.** Acceso por PIN global (`APP_PIN`), igual para todos. Sin roles,
   sin auditoría.
3. **Buckets públicos** (`pet-photos`, `medical-documents`, `lab-exams`, `ecografias`) y
   anon key sin RLS. Cualquier URL de adjunto abre sin login. Riesgo reputacional grave
   en un mercado donde todos los veterinarios se conocen.
4. **Marca hardcodeada.** "KATDOC" en `AppShell`, reportes, recetas, emails y
   `lib/notifications/messages.ts`. Sin nombre/logo/RIF por clínica.
5. **IA en tier gratuito de Gemini.** El tier gratuito usa los datos para mejorar
   productos de Google. Con historias clínicas reales es un pasivo. **Pasar a tier pago
   antes del lanzamiento** (costo real ≈ $0,005 por lectura).

---

## 4. Mercado y competencia

Contexto (Ecoanalítica / Ecosistema, oct-2025): mercado de mascotas VE ~$200-300M hoy,
crece 15-20% anual, apunta a $2.000M. **No se abren muchas clínicas nuevas: las
existentes contratan más veterinarios.** El TAM crece por digitalización, no por
locales nuevos.

| Producto | Precio/mes | Foco | Nota |
|---|---|---|---|
| VetCloud (VE) | $14,99 / $24,99 | todo-en-uno, agenda, facturación | 50% off 1er año |
| Vetesoft | $25 / $50 | nube + IA ("MIAUV") | multi-país |
| DoctorVet | $10 | IA, consultorio chico | |
| Mi Vete App | $19 / $39 / $79 | WhatsApp Business incluido | |
| VetAdministrator | desde $29 | | |
| Wirevet | $59 | clínica completa + WhatsApp + telemedicina + SENIAT | landing dedicada a VE, trial 15 días |
| SmartZooft / Squenda | licencia vitalicia (~$600+) | LAN, caja e inventario | |
| Okvet | gratis (freemium) | historia clínica | techo de precio bajo |

**Conclusión:** categoría saturada, guerra de precios activa, competidores ya localizados
en español para Venezuela. No se gana por features ni por precio.

### Posicionamiento elegido

> "La historia clínica que se llena desde el celular en 60 segundos y sale impresa en el
> formato que ya usas. Con IA que te lee el examen de laboratorio."

- **No somos un ERP.** Sin caja, sin inventario, sin facturación SENIAT (por ahora).
- **Cliente ideal:** consultorio de 1-3 veterinarios, sin hospitalización 24h, hoy en
  papel o Excel. Factura $3.000-8.000/mes: $25 es 0,3% de sus ingresos.
- **Anti-cliente:** hospital 24h, petshop con grooming, clínica de 10+ usuarios.

### Sobre la IA como diferencial

"IA" ya no diferencia a nadie (Vetesoft, Wirevet, QVET y Wakyma la venden). Lo que
diferencia es el **resultado demostrable en 20 segundos**:

> "Subís la foto del examen y la ficha se llena sola con los 30 analitos, rangos y
> valores altos marcados."

Argumento adicional (verificar que sea cierto al lanzar):

> "La IA corre en tier pago: las historias de tus pacientes no se usan para entrenar
> modelos."

---

## 5. Precios (definitivo)

| Plan | Precio | Usuarios | Lecturas IA/mes | Incluye |
|---|---|---|---|---|
| **Consultorio** | $25/mes | 3 | 60 | pacientes ilimitados, consultas, recetas, reportes, agenda, recordatorios manuales |
| **Clínica** | $35/mes | 6 | 250 | todo lo anterior + export completo + soporte prioritario |
| **Anual** | −20% | — | — | $240 / $336 |
| **Implementación** | $79 una vez | — | — | migración de historias desde Excel/papel + 1 h de capacitación |

Reglas:

- **Nunca limitar pacientes ni historias.** Es la causa #1 de churn.
- El tope de IA es **empaquetado**, no control de costo (250 lecturas ≈ $1,25 reales).
- **Precio fundador:** 50% off por 12 meses a los primeros 10 clientes. No "de por vida".
- El fee de $79 es la caja del primer año (≈ $1.900 con 24 altas) y paga el tiempo de
  migración.

---

## 6. Alcance técnico de enero

**Criterio de aceptación (definición de "producto completo"):**

> Una veterinaria que no te conoce puede registrarse, crear su clínica, cargar un
> paciente, hacer una consulta, imprimir el reporte con su propio membrete, invitar a su
> asistente, y **no puede ver ni un dato de otra clínica**.

Si eso funciona, el producto está listo. Todo lo demás es post-lanzamiento.

### Presupuesto de horas

Disponible: ~11 semanas × 15 h, menos Navidad y Año Nuevo ≈ **140 h**.

| # | Bloque | h |
|---|---|---|
| 1 | Multi-tenant: tabla `clinics`, `clinic_id` en 13 tablas, backfill | 18 |
| 2 | Supabase Auth: login, registro, roles (owner/vet/asistente), refactor de cliente y hooks | 30 |
| 3 | RLS en todas las tablas + buckets privados + URLs firmadas + **suite de tests de aislamiento** | 30 |
| 4 | Branding por clínica (nombre, RIF, dirección, teléfono) en reportes, recetas y emails | 9 |
| 5 | Alta manual de clínicas (script de aprovisionamiento + capacitación 1 h) | 4 |
| 6 | Estado de suscripción: campo manual de vencimiento + bloqueo por flag | 4 |
| 7 | Landing + página de precios + términos/privacidad + caso de estudio | 16 |
| 8 | Export simple (CSV de pacientes y consultas) | 4 |
| 9 | Monitoreo de errores + métrica de uso semanal por clínica | 5 |
| 10 | Migración de la clínica #1 + verificación de paridad | 8 |
| 11 | Buffer, seguridad, bugs | 12 |
| | **Total** | **140** |

**Colchón: 0 h.** Si hay atraso, recortar en este orden:

1. Export CSV (−4 h), pero entonces no prometer "tus datos son tuyos".
2. Branding a solo nombre + RIF, sin logo (−5 h).
3. Landing de una sola página, sin caso de estudio en video (−6 h).

### El bloque peligroso

Los bloques 2 + 3 (60 h) son el 43% del proyecto y el que más se subestima. No es la
migración de datos: es que hoy **cada hook consulta con un cliente anon singleton sin
sesión**. Cambiar eso toca 20-30 archivos. Si algo se desborda, es esto.

Mitigación: **escribir el test de aislamiento primero** (que falle), y ensayar todo
contra un clon del proyecto de producción, nunca contra producción.

---

## 7. Calendario y gates

| Semana | Fechas | Foco |
|---|---|---|
| 1 | 2-8 nov | Modelo `clinics` + `clinic_id` + scripts de migración |
| 2 | 9-15 nov | Backfill en clon de prod + verificación de paridad |
| 3 | 16-22 nov | Supabase Auth: login, registro, sesión |
| 4 | 23-29 nov | Roles + refactor de cliente y hooks (20-30 archivos) |
| 5 | 30 nov - 6 dic | RLS en todas las tablas |
| 6 | 7-13 dic | Buckets privados + URLs firmadas + suite de tests de aislamiento |
| 7 | 14-20 dic | **GATE 15 dic** + branding por clínica |
| 8 | 21-27 dic | Alta manual + estado de suscripción (media semana por Navidad) |
| 9 | 28 dic - 3 ene | Landing + precios + términos (media semana por Año Nuevo) |
| 10 | 4-10 ene | Caso de estudio + export + monitoreo + Gemini tier pago |
| 11 | 11-17 ene | Migración clínica #1 + pruebas end-to-end + **lanzamiento 15 ene** |

### Gate del 15 de diciembre

Dos clínicas de prueba creadas, y un test automatizado que demuestre que un usuario de
la clínica A **no puede leer ni un solo registro** de la clínica B (tablas + storage).

- **Pasa** → se sigue al lanzamiento de enero.
- **No pasa** → el lanzamiento se mueve al **15 de febrero**. Lanzar con aislamiento a
  medias es el único error irreversible de todo el plan.

---

## 8. Proyección de ingresos

Supuestos: ARPU $29 (mix 60% básico / 40% avanzado), churn 4% mensual, inicio enero 2027.

### Escenario objetivo: 4 altas/mes

| Mes | Clientes | MRR | Fees (≈$79 c/u) |
|---|---|---|---|
| Ene | 2 | $58 | $158 |
| Feb | 6 | $171 | $316 |
| Mar | 10 | $281 | $316 |
| Abr | 13 | $386 | $316 |
| May | 17 | $486 | $316 |
| Jun | 20 | $583 | $316 |
| Jul | 23 | $675 | $316 |
| Ago | 26 | $764 | $316 |
| Sep | 29 | $850 | $316 |
| Oct | 32 | $932 | $316 |
| Nov | 35 | **$1.011** | $316 |
| Dic | 38 | $1.087 | $316 |

**$700 en el mes 7 (julio). $1.000 en el mes 11 (noviembre).**
Caja total año 1: ~$7.300 de suscripciones + ~$3.800 de implementación ≈ **$11.100**.

### Escenario conservador: 3 altas/mes

$700 en el **mes 10** (octubre), $1.000 en el **mes 16**.

### La palanca real

| Altas/mes | Llega a $700 | Llega a $1.000 |
|---|---|---|
| 2 | mes 16 | mes 28 |
| 3 | mes 10 | mes 16 |
| **4** | **mes 7-8** | **mes 11** |

La diferencia entre el mes 8 y el mes 16 **no es el precio: es una demo más por
semana**. 4 altas/mes ≈ 12-14 demos/mes ≈ 3 h/semana de ventas.

### Economía unitaria

- Costo fijo: Supabase Pro $25 + Vercel Pro $20 + dominio/email $5 + Gemini $5-15 +
  Resend $0-20 ≈ **$55-85/mes**.
- Costo variable por cliente: ~$0,40 (IA + storage) + ~2,5% de comisión de cobro.
- **Margen bruto a $25: ~95%. Break-even: 3 clientes.**
- Ingreso por hora a 40 clientes: ~$20/h. A 25 clientes: ~$13/h.

El negocio cubre costos desde el tercer cliente. La pregunta real es si compensa las
60 h/mes, y eso lo decide el volumen.

---

## 9. La clínica #1 (cuñada)

Decisión: **no se migra.** La clínica #1 se queda en KatDoc, con su Supabase y su
Vercel, gratis de por vida como clínica fundadora. No se mantienen dos apps para
vender: KatDoc es la línea de esa clínica y Fonendo es el SaaS, con codebases
separados y reglas de convivencia en `PLAN-ACCION.md` §2.

El protocolo de migración queda documentado en `PLAN-ACCION.md` §11 como **opcional**,
solo si algún día mantener dos líneas cuesta más que migrar (disparador: 60 días sin
pedidos nuevos).

Protocolo de migración:

1. **Backup completo** del proyecto Supabase antes de tocar nada.
2. Ensayar la migración **dos veces** sobre un clon de producción.
3. **Conservar los UUID** de pacientes, consultas, exámenes y ecografías: así los
   adjuntos de Storage se mueven 1:1 sin romper rutas.
4. Crear su registro en `clinics`, asignar `clinic_id` y hacer backfill en las 13 tablas.
5. Mover objetos de Storage a rutas con prefijo de clínica (copiar + borrar).
6. Verificar paridad: 83 pacientes / 98 consultas / 46 vacunas / 27 exámenes / 36
   recetas, y abrir al menos 5 adjuntos de cada tipo.
7. Cambiar la URL.
8. **Dejar el deployment viejo congelado y accesible 30 días** como red de seguridad.

Además: pedirle permiso explícito para usarla como **caso de estudio y referencia
comercial**. Un veterinario real en Caracas que atiende llamadas de prospectos vale más
que toda la landing.

Datos para el caso de estudio (pedírselos a ella):
- Cuánto tardaba antes vs. ahora por consulta.
- Cuánto tardaba antes vs. ahora por examen de laboratorio.
- Cuántos recordatorios trajeron pacientes de vuelta.
- Si recuperó historias que tenía perdidas.

---

## 10. Fuera de alcance (no construir hasta pasar $1.000 MRR)

- WhatsApp Business API automática (se mantiene `wa.me` manual).
- Inventario, caja, facturación SENIAT.
- App nativa (la PWA alcanza).
- Portal del tutor / agenda pública online.
- Multi-sucursal.
- Modo offline.
- Dictado por voz (ver §13).
- Panel de suscripciones con bloqueo automático y pasarela de pago.

---

## 11. Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El refactor de Auth + RLS se come 90 h en vez de 60 | Mata el lanzamiento de enero | Test de aislamiento primero; trabajar siempre sobre clon; gate del 15 dic |
| Churn silencioso (pagan 3 meses y vuelven al papel) | El negocio no crece | Panel de "clínicas sin consultas en 14 días" + llamada inmediata |
| Dejar de vender una semana para programar | Se corta el pipeline | Bloque fijo de ventas martes y jueves, 1 h, que no se mueve |
| Churn involuntario (se olvidan de pagar) | Fuga de ingresos en cobro manual | Empujar plan anual; día fijo de cobranza (primer lunes); regla 5 días aviso / 15 días suspensión |
| Filtración de datos por buckets públicos | Marca muerta en un mercado chico | Resuelto en el bloque 3 antes de vender |
| IA en tier gratuito entrenando con datos médicos | Pasivo legal/reputacional | Pasar a tier pago antes del lanzamiento |
| Dependencia de una sola persona | Si te enfermas, se cae | Backups automáticos + runbook mínimo |

---

## 12. Próximos 7 días (checklist)

- [ ] Backup completo del Supabase de producción.
- [ ] Clonar el proyecto Supabase para ensayar migraciones.
- [ ] Escribir el **test de aislamiento** (debe fallar hoy).
- [ ] Crear la tabla `clinics` y el campo `clinic_id` en el esquema (sin aplicar a prod).
- [ ] Activar facturación en Google AI y pasar Gemini a tier pago.
- [ ] Llamar a 5 veterinarios del entorno de la clínica #1. Tres preguntas:
      qué usan hoy, si pagarían $25/mes, y si necesitan caja/inventario para cambiar.
- [ ] Pedirle a la cuñada los 4 datos del caso de estudio (§9).
- [ ] Congelar el backlog: nada nuevo hasta el 15 de diciembre.

Si 6 de 10 veterinarios dicen "sí, $25 y no necesito caja", el alcance está bien. Si 6
de 10 dicen "sin inventario no cambio", hay que revisar el producto antes de enero.

---

## 13. Roadmap post-lanzamiento (no antes)

Ordenado por impacto sobre retención y ARPU:

1. **Dictado por voz dentro de la consulta** → historia estructurada. Es el foso real:
   el cuello de botella del veterinario es escribir. Ningún competidor local lo tiene
   bien resuelto.
2. **Resumen automático para el tutor** (texto listo para WhatsApp).
3. **Interpretación asistida de analitos fuera de rango.**
4. **Búsqueda semántica en historias** ("perros con otitis recurrente").
5. Inventario y caja (solo si los clientes lo piden de forma sostenida).
6. Plan de tercer nivel ($49-59) para anclar el de $35.

---

## 14. Decisiones pendientes

| # | Decisión | Estado |
|---|---|---|
| 1 | ¿Básico de 2 o 3 usuarios? | **Cerrada: 3 usuarios** |
| 2 | ¿IA en todos los planes? | **Cerrada: sí, con tope por volumen** |
| 3 | ¿Cobro manual o pasarela? | **Cerrada: manual hasta el cliente ~20** |
| 4 | ¿Multi-tenant primero o multi-instancia? | **Cerrada: multi-tenant primero** |
| 5 | ¿Precio fundador de por vida o 12 meses? | **Cerrada: 12 meses al 50%** |
| 6 | Nombre comercial definitivo (¿KATDOC o rebrand?) | Pendiente |
| 7 | Dominio para el SaaS (katdoc.app / katdoc.io / otro) | Pendiente |
| 8 | ¿Sociedad o persona natural para facturar? | Pendiente (solo relevante si se sale de VE) |

---

## 15. Bitácora

> Anotar acá cada avance, decisión nueva o desvío. Formato: fecha — qué pasó.

- **2026-10-28** — Plan cerrado. Decisiones de precio, alcance y calendario tomadas.
  Gate de aislamiento fijado para el 15 de diciembre. Lanzamiento objetivo 15 de enero
  de 2027.
