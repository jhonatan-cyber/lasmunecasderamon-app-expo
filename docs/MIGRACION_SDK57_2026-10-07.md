# Migración a Expo SDK 57

7 de octubre de 2026.

## Cambios

- Expo 57.0.27 y React Native 0.86.3; React y React DOM permanecen en 19.2.3.
- Módulos Expo y herramientas alineados mediante `expo install --fix`; Reanimated 4.5.1, Worklets 0.10.1 y Gesture Handler 2.32.0.
- Alineadas las dependencias auxiliares DOM WebView y Metro Config, y react-test-renderer con la versión de React.
- Eliminados postinstall y parches sobre archivos internos de Expo CLI/Metro. Restaurados los archivos oficiales instalados. `verify:metro` ahora verifica una exportación real.
- Conservada la caché Metro propia del proyecto en Windows y la resolución existente de tslib.
- Android regenerado con SDK 57; conservados local.properties y el certificado de desarrollo. Se dejó a la plantilla determinar Kotlin y KSP sin excepciones manuales.
- Runtime OTA cambiado de appVersion a fingerprint para separar binarios con dependencias nativas diferentes.
- README actualizado con la compatibilidad exacta de Expo Go.

## Respaldo local

- Configuración y fuentes Android: `build/sdk57-backup-20261007`.
- Carpeta Android anterior completa, incluidos sus archivos locales: `build/sdk57-original-android`.
- Los respaldos están ignorados por Git. No contienen cambios en el dashboard ni en sus datos.

## Comprobaciones completadas

- Alineación de dependencias: aprobada.
- Expo Doctor: 21/21 comprobaciones aprobadas.
- TypeScript: aprobado.
- ESLint: 0 errores; 33 advertencias en código existente.
- Unitarias: 448 aprobadas en 41 archivos.
- Exportación web: 153 rutas generadas.
- E2E Chromium: 23 pruebas aprobadas con respuestas API de pruebas; incluye login, navegación por rol, ventas, servicios y barman. No representa prueba física del teléfono ni entrega push real.
- Android prebuild: aprobado.
- Compilación Android ARM64 debug: aprobada (`BUILD SUCCESSFUL`, 25 min 2 s). APK generado en `android/app/build/outputs/apk/debug/app-debug.apk` (aproximadamente 103 MB).
- Metro restaurado en `192.168.0.7:8081`, modo Expo Go LAN con dos workers. `/status` responde `packager-status:running`; el manifiesto Android responde HTTP 200 y declara SDK 57.0.0 y el host correcto.
- Dashboard en `192.168.0.7:3000`: API de salud aprobada al terminar la migración.

Comando de comprobación nativa: `gradlew.bat :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --max-workers=2 --no-daemon`. JDK local 17 y Android SDK 36. El alcance de este APK de prueba es Android ARM64; no reemplaza la validación de otras arquitecturas ni de iOS. No se instaló en un dispositivo: la consulta de ADB no encontró teléfonos conectados.

## Pruebas en teléfono

Expo Go debe ser compatible con SDK 57. Expo Go para SDK 58 no abre el proyecto 57. Los development builds anteriores de SDK 56 también deben reemplazarse por un binario compilado con SDK 57.

La API local se mantiene en `http://192.168.0.7:3000`. Verificar en dispositivo cámara/QR, biometría, persistencia offline y reconexión SSE. El registro de push está deshabilitado por el código cuando corre en Expo Go; para comprobar push se necesita un development build.

No se publicó ninguna actualización OTA ni se distribuyó una versión de producción.

## Referencias

- [SDK 57](https://expo.dev/changelog/sdk-57).
- [Runtime versions](https://docs.expo.dev/eas-update/runtime-versions/).
- [Expo Go para SDK 57 en Android](https://expo.dev/go?sdkVersion=57&platform=android&device=true).
