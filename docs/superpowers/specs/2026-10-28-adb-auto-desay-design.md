# Instalación automática HABRO ADB

Estado: diseño aprobado. Binario privado recibido y verificado; integración
completada con dependencia local y suministro autenticado posterior.

## Objetivo y alcance

Ampliar HABRO en `feature/adb-auto-desay-v2`, conservando WebUSB,
Ya-WebADB, RSA, consola, aplicaciones, pantalla, archivos e instaladores
actuales. No hacer merge a main ni publicar el DEX.

## Enfoque

Usar `adb/desay-installer.mjs` con el adaptador `installerTransport` de
`adb/app.js` y la verificación existente de `adb/sessionwriter.mjs`.
La alternativa de incorporar otro transporte duplica infraestructura ya
operativa y queda descartada por el requisito del usuario. Modificar el
SessionWriter para ejecutar ambos helpers mezclaría contratos diferentes;
se propone mantener módulos separados.

## Detección y selección

Recoger modelo, fabricante, dispositivo, display ID, fingerprint, versión
Android, SDK, usuario activo e identidad shell. Reconocer DesaySV en modelo,
fabricante o fingerprint, o el prefijo G7PH_CHERY en display ID, sin filtrar
por SOP. La selección automática será APK Desay → nuevo módulo; APK no
Desay → estándar; XAPK → SessionWriter actual. Si falla la detección,
mostrar un error recuperable sin adivinar la plataforma.

## Contrato de instalación

Antes de modificar el dispositivo, validar metadatos APK, usuario 0,
uid=2000(shell), plataforma y ausencia de downgrade. Validar el DEX contra
un SHA-256 fijado a partir del adjunto de confianza. Crear con mkdir una
carpeta única bajo /data/local/tmp, transferir ambos archivos mediante Sync
y verificar tamaños y SHA-256 remotos. Revalidar versión antes de ejecutar.

La revisión del DEX confirma MonjiShellInstaller con ruta APK y flags
internos por defecto. Se prepara un runtime/caché propio en la carpeta del
intento y se aplica ANDROID_ROOT/ANDROID_DATA/CLASSPATH en el mismo shell.
Antes de invocar el DEX se establece `persist.sys.sv.isl` en `true` y se
verifica inmediatamente su lectura exacta, según la validación física del
usuario en S700 SOP3. Si falla, se aborta antes de la invocación. Se repite
en cada intento porque el usuario observa la propiedad vacía tras reiniciar.
No se cambian otras propiedades del fabricante.
Exigir terminación verificable del comando y verificar packageName,
versionCode y pm path con `verifyInstallation`. Un texto Success no basta.
Limpiar solo la carpeta creada por el intento cuando su estado esté
resuelto. Conservar temporales y seguimiento si se pierde la conexión
durante la ejecución; comprobar el mismo dispositivo antes de reintentar.

## Distribución privada

El DEX será dependencia local ignorada por Git y por la publicación de
assets. Separar proveedor de bytes y política de confianza para permitir
posteriormente un endpoint autenticado con R2 privado. No aceptar como
ancla de confianza un hash entregado junto al mismo binario descargado.
No introducir algoritmos OTA/VIN en JavaScript público.

## Experiencia

Mostrar Automático · Recomendado por defecto. Agrupar métodos manuales
como opciones avanzadas. Usar mensajes neutros durante el flujo automático
y reservar nombres técnicos para diagnóstico avanzado. Borrar resultados
y diagnóstico al cambiar de método; conservar aparte el bloqueo de un
intento incierto para evitar una segunda instalación concurrente. El éxito
final será Aplicación instalada y verificada.

## Validación

Añadir los diez casos solicitados: SOP3, SOP7, G7PH sin SOP, Android no
Desay, XAPK, usuario incorrecto, identidad incorrecta, hash incorrecto,
transferencia incompleta y versión final incorrecta. Cubrir también
desconexión, downgrade, limpieza limitada y cambio de método. Ejecutar
`node --test tests/*.test.mjs` y revisar diff y exclusión del DEX antes
de dejar los cambios en la rama indicada.

## Pendiente

El DEX recibido coincide con 8568 bytes, formato 038 y SHA-256
2adefeff7f1cce400996a82d651a3075fe414c4c4dc2db03609f2a87b4619b15.
Se conserva solo como dependencia local ignorada. El binding R2
DESAY_HELPERS apunta en wrangler.jsonc a habro-desay-helpers; no se ha creado
el bucket ni subido el objeto desde esta sesión. No hay un vehículo para validar esta
integración; las pruebas usan el binario real con transporte simulado.
