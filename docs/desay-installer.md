# Instalador automático HABRO ADB

## Estado de entrega

La selección automática, el módulo, la verificación, la recuperación y el
endpoint privado están integrados. La política provisional se ha sustituido
por el tamaño y hash del adjunto verificado: **8568 bytes, Dalvik DEX 038,
SHA-256 `2adefeff7f1cce400996a82d651a3075fe414c4c4dc2db03609f2a87b4619b15`**.
También se comprobaron el checksum Adler-32 y la firma SHA-1 internos del DEX.

El binario permanece exclusivamente como dependencia local ignorada. No se
ha subido a Git, R2 ni a un despliegue. El cliente publicado puede obtenerlo
posteriormente por el endpoint autenticado; sin suministro privado devuelve
un error y no ejecuta ningún auxiliar. Las pruebas locales ya usan los bytes
reales, además de fixtures sintéticos. No equivalen a una nueva instalación
física en el S700/S800.

## Flujo y límites

`install-method.mjs` recoge las siete propiedades solicitadas, usuario e
identidad. APK compatible por DesaySV en fabricante/modelo/fingerprint o
prefijo G7PH_CHERY usa `desay-installer.mjs`, sin restricciones por SOP.
El resto de APK usa el instalador estándar. XAPK conserva SessionWriter,
incluidas sus restricciones y verificaciones existentes.

El módulo consume `installerTransport` (shell, Sync, tamaño) y reutiliza
la confirmación de fin de comando y la verificación de paquete de
SessionWriter. Antes de ejecutar comprueba usuario 0, shell 2000, versión,
hash local del DEX, tamaños y SHA-256 de ambos archivos transferidos.
Después comprueba paquete/versionCode/pm path. No toma Success como prueba.

La revisión privada del bytecode confirma la clase `MonjiShellInstaller` y
el argumento posicional de ruta APK. Se conservan los flags internos por
defecto del helper, sin añadir `--flags` ni habilitar downgrade. El helper
crea una sesión PackageInstaller y espera hasta 120 segundos por su resultado;
HABRO conserva su límite externo de 300 segundos y verifica el paquete después.

La preparación comprueba `/system`, `/data`, el ejecutable
`/system/bin/app_process` y la lectura de ambos archivos. Crea
`<temporal>/runtime/dalvik-cache` con permisos 0700 y ejecuta con
`ANDROID_ROOT=/system`, `ANDROID_DATA=<temporal>/runtime`, `CLASSPATH=<dex>`
y umask 077. Las variables se aplican en el mismo shell de invocación.
Se heredan BOOTCLASSPATH y las rutas de librerías de Android. No se cambian
propiedades del fabricante, ajustes persistentes, usuarios ni permisos del
sistema. El DEX revisado no contiene una preparación de propiedades Desay
ni algoritmos OTA/VIN; no se ha inferido ninguna mutación adicional.

El intento guarda su PID y terminación en su carpeta única. Si se pierde
la conexión, se conserva el seguimiento mínimo en localStorage, asociado
al serial del coche, sin APK, DEX ni credenciales. Se bloquean ambas
entradas de instalación de HABRO. La comprobación posterior exige que el
proceso haya terminado antes de verificar el paquete y limpiar. Si terminó
y la versión no coincide, informa del fallo y permite un nuevo intento.
Si el PID sigue presente o faltan pruebas de terminación, conserva el
bloqueo y los archivos. No se limpia a ciegas. La consola sigue disponible
para diagnóstico avanzado. Este seguimiento no coordina otros equipos ni
herramientas ADB externas.

## Dependencia local de desarrollo

Ubicación reservada: `adb/.private/dex_shell_helper.dex`. La carpeta y el
nombre del DEX están ignorados por Git, Cloudflare Assets y Koyeb. No
copiar el helper a `adb/vendor` ni usar `git add -f`. El Worker tampoco
sirve rutas `.private` ni rutas estáticas del helper.

Para reproducir en otro checkout, guardar el DEX privado en esa ubicación
y verificarlo con `wc -c` y `sha256sum` contra los valores anteriores. No
obtener el hash de confianza de la misma descarga que entrega el binario.

`tools/desay-helper-local.mjs` exporta `loadLocalDesayHelper({path, signal})`
para un harness de desarrollo Node. Se puede inyectar como `helperProvider`
en `installWithDesay`, sin sustituir la política de producción. Comprueba
el tamaño/hash antes de entregar el Blob y el instalador vuelve a validarlo.
Este adaptador no se importa en el navegador ni en el Worker y está excluido
de los assets/despliegues. No existe fallback del endpoint hacia este archivo.

Las pruebas opcionales del DEX local también aceptan
`HABRO_DESAY_HELPER_PATH=/ruta/privada/dex_shell_helper.dex`. Si no existe la
dependencia en un checkout público se omiten expresamente esos cinco casos;
los tests de seguridad con bytes sintéticos siguen ejecutándose. Si se
especifica una ruta y falta el archivo o no coincide el hash, la prueba falla.
La validación física de esta integración con el entorno preparado sigue
correspondiendo a los vehículos; no hay hardware conectado a esta sesión.

## Suministro posterior por R2 privado

El endpoint reservado es `GET /adb/api/desay-helper`. Pasa por la misma
validación de sesión HABRO ADB que los otros endpoints. El Worker lee una
clave fija `dex_shell_helper.dex` de un binding opcional `DESAY_HELPERS`.
Sin binding, objeto válido o acceso al bucket devuelve 503. Otros métodos
devuelven 405 y una sesión ausente devuelve 401. Nunca recurre a ASSETS.

Configurar posteriormente `DESAY_HELPERS` como binding R2 a un bucket
privado, sin dominio público ni r2.dev, y subir el objeto fuera de Git.
No se crea un bucket ni se despliega nada con este cambio. La respuesta es
`private, no-store`; el cliente usa credenciales de la sesión, mismo origen,
sin redirecciones y vuelve a verificar el hash fijado. Límite: 16 MiB.

## Validación reproducible

Comando existente: `node --test tests/*.test.mjs`.
En este entorno Node 24, ejecutar además
`node --test --test-isolation=none tests/*.test.mjs` para ver y ejecutar
cada caso individual. Los tests adicionales usan un transporte Android
simulado y ejecutan los handlers reales de UI sobre un DOM mínimo. Con la
dependencia privada presente: **100 pruebas, 100 aprobadas, sin omitidas**.
En una copia pública sin el DEX: **95 aprobadas y 5 omitidas expresamente**.
Una prueba adicional ejecuta el shell real con un sustituto local de
app_process para comprobar variables, argumentos y archivos PID/estado.
