# Instalador automático HABRO ADB

## Estado de entrega

La selección automática, el módulo, la verificación, la recuperación y el
endpoint privado están integrados. **La ejecución de producción sigue
deshabilitada**: no se ha recibido `dex_shell_helper.dex`. No se ha fijado
un hash ficticio ni inventado la preparación del entorno. Las pruebas usan
bytes sintéticos; no prueban una instalación física ni el contrato real
de `MonjiShellInstaller`.

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

Cuando se reciba el binario:

1. Guardarlo únicamente en la carpeta privada e identificar su procedencia.
2. Calcular tamaño y SHA-256 con `wc -c` y `sha256sum`, y fijarlos en la
   política revisada de `adb/desay-helper.mjs`.
3. Confirmar los argumentos reales de MonjiShellInstaller y la preparación
   requerida. Implementar `prepare({run, temporary, apkPath, dexPath,
   signal})` con ese contrato. Las órdenes se ejecutan por el mismo shell
   existente. No introducir algoritmos de códigos OTA/VIN en esta política
   ni en JavaScript público; si la preparación los necesita, conservarlos
   en el servicio autenticado.
4. Para un harness local, importar una política privada revisada e inyectar
   `policy` y `helperProvider` en `installWithDesay`. El proveedor solo
   entrega un Blob; el módulo vuelve a verificar su hash contra la política.
   Nunca aceptar como ancla de confianza un hash obtenido junto a la descarga.
5. Validar físicamente en los S700 SOP3 y S800 SOP7 antes de habilitar la
   política de producción. La llamada app_process actual es un adaptador
   pendiente de confirmar con el DEX real.

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
simulado y ejecutan los handlers reales de UI sobre un DOM mínimo.
