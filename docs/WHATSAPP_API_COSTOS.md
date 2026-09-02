# WhatsApp Business API — Evaluación de costos (S39/S34)

> Objetivo: enviar recordatorios y Recipes **automáticamente** por WhatsApp
> desde KATDOC (hoy el envío es manual con `wa.me`, que es gratis pero no
> permite adjuntar archivos ni automatizar).

## Estado actual (sin costo)
- Recordatorios y Recipes se envían con un **enlace `wa.me`** prellenado:
  el staff lo abre en WhatsApp y confirma. Gratis, pero:
  - no adjunta PDF (la Recipe se manda como texto);
  - no hay envío programado ni plantillas;
  - hay que tocar "enviar" a mano.

## Opciones para automatizar WhatsApp

### A. Meta WhatsApp Cloud API (directo)
- Post: `POST https://graph.facebook.com/v21.0/<PHONE_ID>/messages`.
- Requiere: cuenta de negocio en Meta, número de teléfono verificado,
  token de acceso permanente y **plantillas de mensaje aprobadas**
  (los recordatorios deben ser plantilla: asunto + fecha + paciente).
- Precio (2024-2026, referencial): Meta cobra **por conversación iniciada**
  (ventana de 24 h por usuario). Utility/plantillas de servicio tienen tarifa
  más baja que marketing. En Venezuela el costo por conversación ronda
  USD 0.02–0.06 según categoría (verificar en la tabla de precios vigente:
  https://developers.facebook.com/docs/whatsapp/pricing).
- Ventaja: canal oficial, foto de perfil de la clínica, plantillas con datos.
- Desventaja: setup manual, revisión de plantillas (puede tardar), costo por
  conversación aunque el cliente no responda.

### B. Agregadores (Twilio, 360dialog, Vonage)
- Twilio WhatsApp API: precio por **mensaje** (aprox. USD 0.005–0.007/msg
  según país del destinatario) + la tarifa de conversación de Meta que el
  proveedor traslada. Incluye plantillas y SDK sencillo.
- 360dialog: plataforma "BSP" que simplifica Meta, planes desde ~USD 49/mes
  (referencial) + tarifas por conversación.
- Ventaja: integración más simple (SDK/SDK HTTP), soporte, sin tocar Graph.
- Desventaja: costo mensual fijo o markup sobre Meta.

### C. Recomendación para KATDOC
1. **Seguir con `wa.me` (manual) + email automático (Resend)** hoy:
   cero costo recurrente y cubre el 90% de los casos (el staff ya toca WhatsApp
   al confirmar la cita).
2. Si el volumen crece y querés envíos programados con PDF adjunto, migrar a
   **Meta Cloud API directa** (sin costo mensual fijo, pago por conversación),
   con plantillas tipo:
   - `recordatorio_vacuna`: "Hola {{1}}, {{2}} tiene {{3}} el {{4}}…"
   - `recipe_enviada`: con indicación de descargar el PDF (WhatsApp Business
     permite adjuntar documentos en plantillas multimedia).
3. Umbral sugerido: automatizar cuando el staff deje de querer tocar el botón
   manual (más de ~30 recordatorios/día) o cuando haga falta el PDF por
   WhatsApp.

## Qué implicaría en el código (cuando se decida)
- `lib/notifications/provider.ts`: implementar `sendWhatsApp` real (POST a
  Graph con `messaging_product=whatsapp`, token y `template` con componentes
  de parámetros), leyendo `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` de env.
- `notification_config.whatsapp_auto` ya existe (S39): habilitar el envío
  automático por tipo desde `/config`.
- `lib/notifications/dispatch.ts`: añadir `dispatchWhatsApp()` análogo a
  `dispatchEmails()`; las plantillas se envían por su `name` + `language`.
- Logging: `notification_log.canal='whatsapp'` ya está contemplado.
- **No tocar**: el flujo manual `wa.me` se mantiene como respaldo.

## Env vars futuras (Vercel)
`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` (y `WHATSAPP_TEMPLATE_*` por tipo).
