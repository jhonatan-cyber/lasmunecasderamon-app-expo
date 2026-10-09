# Viabilidad de migración a Expo SDK 58

Fecha: 7 de octubre de 2026. Revisión estática del proyecto, configuración nativa, comprobación de alineación de SDK 56 y consulta de fuentes oficiales. No se instalaron nuevas dependencias ni se modificaron las versiones.

## Dictamen

La migración es viable, con riesgo medio-alto hasta validar compilación nativa y dispositivo. No es posible garantizar ausencia de regresiones con un análisis estático. Recomiendo preparar una copia aislada, pasando por 57 y después 58, y conservar la app actual para las pruebas operativas.

El registro npm consultado devuelve `latest: 57.0.27` y `next: 58.0.6`. El paquete `expo@58.0.6`, publicado el 6 de octubre, todavía recomienda `react-native: 0.88.0-rc.3`. La existencia de una versión numérica 58.0.6 no demuestra que haya terminado el ciclo de preproducción. La documentación de lanzamiento disponible sigue presentando SDK 58 como beta.

## Diferencias comprobadas en el manifiesto de SDK 58

| Dependencia | Proyecto actual | Recomendación de expo@58.0.6 |
| --- | --- | --- |
| React / React DOM | 19.2.3 | 19.3.0 |
| React Native | 0.85.3 | 0.88.0-rc.3 |
| Expo Router | ~56.2.14 | ~58.0.16 |
| Gesture Handler | ~2.31.2 | ~3.2.1 |
| Reanimated | 4.3.1 | 4.7.0 |
| Worklets | 0.8.3 | 0.13.0 |
| Sentry React Native | ^7.11.0 | ~8.28.0 |

También deben alinearse los módulos Expo, Metro Runtime, Screens, Safe Area, SVG y las herramientas de pruebas. No basta con cambiar el número de `expo`.

## Riesgos específicos encontrados

- **Metro: alto.** `scripts/patch-expo-web.js` modifica archivos internos de Expo CLI, Metro y Metro Resolver. Se ejecuta tanto en postinstall como al cargar Metro. `metro.config.js` desactiva package exports y fuerza tslib. En SDK 58 hay que evaluar cada parche contra los nuevos archivos; no reutilizarlos a ciegas ni asumir que un reemplazo que no coincide implica compatibilidad.
- **Navegación: medio-alto.** `PremiumTabBar.tsx` usa directamente state, descriptors, emit y navigate. SDK 58 cambia el núcleo de Router. Los layouts declaran pestañas explícitamente, lo que favorece la migración; la barra personalizada requiere prueba por rol, regreso, enlaces directos y parámetros.
- **Tipos: medio.** `useLogin.ts` y `LoginForm.tsx` tipan referencias con TextInput. Deben verificarse frente a la API TypeScript estricta de React Native. No se encontraron en las carpetas de código examinadas imports de react-native/Libraries, InteractionManager, beforeRemove ni inicialización de rutas con initialRouteName.
- **Android: medio-alto.** Kotlin 2.1.20 y una excepción KSP están fijados en app.json; Kotlin también está fijado en gradle.properties. La carpeta android existe localmente y está ignorada por Git. Debe preservarse antes de regenerarla y compararse con la plantilla nueva. Validar APK debug y release; el template 58 cambia la optimización R8 de release. La autorización HTTP por IP está actualmente en los manifiestos debug y debugOptimized.
- **OTA: alto si se publica sin separar runtimes.** runtimeVersion usa appVersion y la versión es 1.0.0. La migración necesita nuevo runtime, nuevo binario y canal de pruebas. Usar fingerprint o incrementar deliberadamente la versión evita mezclar actualizaciones con APK de SDK 56.
- **Persistencia y reportes: medio.** El espejo offline usa SQLite síncrono; no usa libSQL, cuya retirada está anunciada. CSV y liquidaciones usan expo-file-system/legacy y StorageAccessFramework: probar guardado, permisos, PDF y compartir. No se encontraron llamadas a File.write en el código examinado.
- **Notificaciones, biometría y cámara: medio.** Deben comprobarse en un development build real. El código desactiva registro push en Expo Go: que arranque en Expo Go no prueba la entrega push. El handler de notificaciones ya establece explícitamente banner/lista/sonido.
- **Infraestructura: favorable.** Node local 24.20.0 y Node EAS 22.19.0 satisfacen los engines de expo@58.0.6. El contrato HTTP/SSE con el dashboard no exige una migración del backend por cambiar SDK; se debe revalidar.

## Línea base y validación necesaria

La revisión previa aprobó 448 pruebas unitarias de Expo, tipos y exportación de 153 rutas. Es evidencia de SDK 56, no de SDK 58. La consulta actual `expo install --check` encuentra 17 dependencias que requieren alineación incluso dentro de SDK 56; no se aplicaron cambios.

1. Preservar estado actual y archivos nativos locales; trabajar sobre una copia aislada con posibilidad de retorno.
2. Alinear primero 56, migrar a 57 y validar; después instalar explícitamente la versión 58 elegida y su matriz de dependencias. Evitar `expo@latest` para alcanzar 58 mientras latest siga en 57.
3. Revisar Metro, Router, referencias TypeScript y configuración Android; separar runtime y canal OTA antes de cualquier distribución.
4. Ejecutar doctor, tipos, lint, pruebas unitarias/integración, exportación web y compilación APK debug/release.
5. Probar en el teléfono login, renovación de sesión, roles, pestañas, SSE, cámara/QR, biometría, modo offline/reconexión, reportes y notificaciones. Operaciones financieras en datos de pruebas.
6. Promover solo después de esa validación. Para producción, preferir el cierre del ciclo beta/RC y comprobar las versiones nuevamente.

No se ejecutó una instalación, compilación ni prueba de dispositivo bajo SDK 58 durante este análisis.

## Fuentes

- [Registro del paquete Expo](https://registry.npmjs.org/expo): dist-tags y manifest de 58.0.6; bundledNativeModules.json se leyó de su tarball oficial sin instalarlo.
- [SDK 58 beta y cambios incompatibles](https://expo.dev/changelog/sdk-58-beta).
- [Migración de Expo Router 57 a 58](https://docs.expo.dev/router/migrate/sdk-57-to-58/).
- [Guía de actualización incremental](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).
- [Compatibilidad de runtimes OTA](https://docs.expo.dev/eas-update/runtime-versions/).
