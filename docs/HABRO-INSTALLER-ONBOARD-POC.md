# HABRO Installer — PoC residente sin ADB

Estado: propuesta técnica. No es un APK compilado ni una capacidad confirmada en el vehículo.

## Hallazgos verificados en este repositorio
- `adb/desay-installer.mjs` exige usuario Android 0, identidad `uid=2000(shell)`, transporte ADB y transferencia a `/data/local/tmp`.
- Prepara `persist.sys.sv.isl=true` y lo verifica; después invoca `/system/bin/app_process` con `CLASSPATH=<DEX>` y clase `MonjiShellInstaller`.
- El helper usa `PackageInstaller`; la instalación se valida mediante paquete y versionCode, no solo por la respuesta del proceso.
- `docs/desay-installer.md` identifica DEX de 8568 bytes, SHA-256 `2adefeff7f1cce400996a82d651a3075fe414c4c4dc2db03609f2a87b4619b15`. La documentación indica que el binario no se subió a Git/R2 en aquella entrega. No se ha comprobado su presencia actual en R2.
- No hay evidencia de que una APK ordinaria pueda adquirir uid shell, activar permisos privilegiados ni llamar al servicio de ingeniería con ADB cerrado.

## Objetivo
APK nativa para Android 11 en unidad multimedia EBRO S800/S900, interfaz horizontal, uso íntegramente dentro del coche, funcionamiento después de reinicio y sin ADB, ordenador ni móvil.

## Primera entrega: diagnóstico sin modificaciones privilegiadas
1. Pantalla de diagnóstico: versión Android, SDK, fabricante/modelo, paquete de HABRO Installer, UID de proceso, installer package name, permisos concedidos, estado de instalación de paquetes permitidos y disponibilidad de `PackageInstaller`.
2. Catálogo local limitado a APK aprobadas y firmadas; seleccionar fichero APK desde el almacenamiento local mediante Storage Access Framework.
3. Analizar metadatos de APK: packageName, versionCode, firma y comparación con instalación actual; bloquear downgrade y conflictos de firma.
4. Instalar/actualizar usando `PackageInstaller.Session` y la confirmación de usuario cuando Android la requiera. No intentar suprimir confirmaciones.
5. Registrar estado real de éxito/fallo y verificar packageName/versionCode tras completar. Mantener registro local mínimo y opción de exportación.
6. Repetir diagnóstico tras reiniciar vehículo y con ADB cerrado.

## Matriz de permisos y límites
| Operación | API prevista | Condición |
| --- | --- | --- |
| Instalar APK seleccionada | PackageInstaller | Autorización del usuario / sistema |
| Actualizar APK propia | PackageInstaller | Firma compatible y política del sistema |
| Consultar paquetes | PackageManager | Visibilidad de paquetes declarada |
| Solicitar permiso runtime propio | requestPermissions | Consentimiento y disponibilidad |
| Cambiar permisos de otra app | Ninguna API pública general | No disponible para APK ordinaria |
| Instalación silenciosa | Mecanismo de sistema/administración autorizado | No asumir |
| Modificar componentes del vehículo | Fuera de alcance | Requiere autorización fabricante |

## Criterios de decisión
- **Go**: APK se instala, sobrevive reinicio, gestiona instalación de una app de prueba con autorización, y verifica el resultado con ADB cerrado.
- **Go condicionado**: actualización silenciosa solo si un servicio documentado/autorizado del fabricante proporciona privilegios reales y control de acceso.
- **No-go**: cualquier propuesta que dependa de asumir privilegios shell por cargar un DEX, de desactivar protecciones del vehículo o de modificar apps críticas sin autorización.

## Seguridad
Lista explícita de paquetes y certificados autorizados; sin ejecución arbitraria de comandos; no descargar APK no verificadas; comprobación de firma y versión; confirmación del usuario; trazabilidad local; impedir operaciones mientras se conduce; excluir ECU, ADAS y sistemas críticos del vehículo.

## Prueba física pendiente
Disponer de un vehículo de prueba con Android 11, instalar una APK diagnóstico mediante método actual una única vez, desactivar ADB, reiniciar y documentar resultados de PackageInstaller y permisos. Sin esa prueba no se puede afirmar que exista instalación silenciosa.
