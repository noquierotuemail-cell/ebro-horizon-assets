# Acceso ADB automático por VIN — despliegue controlado

Estado: PR en borrador. No fusionar hasta completar pruebas de seguridad.

## Secretos del Worker `ebro-remoteapp-landing`
En Cloudflare > Workers & Pages > ebro-remoteapp-landing > Configuración > Variables y secretos, crear dos secretos **distintos**:
- `HABRO_ADB_OWNER_TOKEN`: clave larga y aleatoria, solo para propietario.
- `HABRO_ADB_COLLABORATOR_TOKEN`: clave larga y aleatoria, solo para colaborador.

No reutilizar `HABRO_ANALYTICS_ADMIN_TOKEN`. No introducir secretos en GitHub ni enviarlos por chat.

## Rutas
- `/admin/adb-vin`: gestión privada (exige clave en cada operación).
- `/adb/solicitar`: acceso automático con VIN registrado y clave privada de alta.
- `/adb/access`: acceso existente con token manual, permanece disponible.

## Alta de vehículo
1. Acceder al panel como propietario.
2. Registrar VIN completo (17 caracteres) y etiqueta opcional.
3. Copiar la clave privada de alta de 64 caracteres, que solo se muestra una vez.
4. Entregar esa clave al propietario mediante un canal seguro separado del VIN.
5. El propietario introduce VIN + clave privada en `/adb/solicitar`.
6. El Worker emite un token de un solo uso válido 30 minutos y lo canjea automáticamente por una sesión ADB de 30 minutos.
7. El panel registra emisiones, canjes y denegaciones sin guardar el token completo.

## Revocación
Bloquear VIN invalida sesiones activas y los tokens no utilizados. Volver a habilitarlo no reactiva sesiones anteriores. Rotar la clave privada invalida sesiones y tokens previos.

## Pruebas previas a producción
- VIN inexistente y clave incorrecta: denegados.
- Clave correcta: token y sesión con caducidad de 30 min.
- Segundo canje del mismo token: denegado.
- Deshabilitar VIN: revoca sesión y tokens sin canjear.
- Reactivar VIN: no revive sesiones previas.
- Rotar clave: invalida credenciales anteriores.
- Seis intentos incorrectos por IP/VIN en 15 min: bloqueo temporal.
- Verificar acceso independiente de propietario y colaborador.
- Verificar que las páginas privadas no quedan indexadas ni cacheadas.
- Validar que el panel no expone claves ni tokens completos en el historial.

## Limitaciones conocidas
La clave privada de alta demuestra posesión de una credencial emitida por HABRO, no identidad legal. El alta y entrega inicial deben comprobarse fuera de banda. La interfaz de administración es funcional, pero requiere pruebas de usabilidad y seguridad antes del despliegue.
