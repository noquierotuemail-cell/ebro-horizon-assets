# Acceso ADB con Telegram — configuración pendiente

## Funcionamiento
El usuario introduce VIN (17 caracteres) y @usuario de Telegram en `/adb/solicitar`.
HABRO genera un enlace privado al bot con un desafío aleatorio de 5 minutos.
El usuario pulsa **Iniciar** en Telegram. El webhook verifica su identidad mediante el ID numérico de Telegram y consulta la pertenencia al canal con `getChatMember`.
Si pertenece, el VIN queda vinculado al ID de Telegram. La web comprueba el desafío con un secreto independiente que no se envía a Telegram, canjea un token de un solo uso y abre una sesión ADB de 30 minutos.

## Variables y secretos de Cloudflare Worker
Crear en `ebro-remoteapp-landing`:
- `HABRO_TELEGRAM_BOT_TOKEN` (secreto): token del bot obtenido de BotFather.
- `HABRO_TELEGRAM_BOT_USERNAME` (variable): `habroremote_bot` (bot de verificación de accesos).
- `HABRO_TELEGRAM_GROUP_ID` (variable): ID del canal público @HABRO_Remote (puede configurarse como @HABRO_Remote; no es necesario conocer el ID numérico).
- `HABRO_TELEGRAM_WEBHOOK_SECRET` (secreto): cadena aleatoria para validar la cabecera de Telegram.
- `HABRO_ADB_OWNER_TOKEN` (secreto): clave independiente del propietario del panel.
- `HABRO_ADB_COLLABORATOR_TOKEN` (secreto): clave distinta para el colaborador.

No compartir los secretos en el chat ni subirlos a GitHub.

## Telegram
1. Canal de suscripción: https://t.me/HABRO_Remote. Añadir un bot nuevo y exclusivo para ADB como **administrador** del canal para consultar suscriptores con `getChatMember`. Usar @habroremote_bot; no reutilizar @HORIZON_upbot.
2. Registrar el webhook del bot mediante Bot API `setWebhook`, URL `https://habroremote.com/adb/telegram/webhook`, con `secret_token` igual a `HABRO_TELEGRAM_WEBHOOK_SECRET`.
3. Si el bot ya tiene un webhook activo, cambiarlo interrumpirá sus eventos anteriores. **No reutilizar un bot de producción sin revisar sus flujos actuales**.
4. Comprobar `getWebhookInfo` y una solicitud de prueba.
5. Confirmar que el Worker está desplegado y las variables disponibles antes de habilitar el enlace de acceso por VIN.

## Panel
`https://habroremote.com/admin/adb-vin` permite ver VIN, etiquetas, tokens emitidos e historial, bloquear y reactivar. Cada administrador usa una clave distinta.
El primer usuario de Telegram que verifica un VIN lo vincula a su cuenta. Los siguientes intentos desde otra cuenta quedan bloqueados. **Esta vinculación no acredita propiedad legal del coche**. Un administrador debe poder resolver disputas o bloquear el VIN.

## Seguridad y pruebas
- Nunca aceptar el @usuario escrito como identidad; la identidad real procede del webhook Telegram.
- Token de un solo uso; sesión de 30 minutos; sin token completo en el historial.
- Bloqueo del VIN revoca sesiones y tokens anteriores.
- Desafíos de 5 minutos, secreto de navegador independiente y límites de solicitud por IP.
- Probar usuario fuera del canal, usuario sin username, cambio de username, VIN ya vinculado, webhook repetido, caducidad, revocación, reingreso al canal, múltiples dispositivos.
- Los miembros que abandonen el canal conservarían una sesión ya emitida hasta su caducidad (máximo 30 minutos), salvo revocación administrativa.

## Separación de bots
@HORIZON_upbot se reserva para las notificaciones privadas del propietario. El bot de acceso ADB es @habroremote_bot y tendrá sus propias credenciales y webhook.

## Estado
**No desplegar sin configurar canal y bot, y superar pruebas de seguridad.** El PR está en borrador.
