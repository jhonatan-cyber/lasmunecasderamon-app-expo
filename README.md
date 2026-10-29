# Las Munecas de Ramon App

Aplicacion `Expo Router` para operacion interna, con soporte `android`, `ios` y `web`.

El proyecto usa **Expo SDK 57** y React Native 0.86.3. Para abrirlo en Expo Go,
instala la [version compatible con SDK 57](https://expo.dev/go?sdkVersion=57&platform=android&device=true).
Expo Go para SDK 58 no puede abrir este proyecto.

Para desarrollo en dispositivo fisico o emulador, usa `expo-dev-client` en vez de Expo Go.

## Inicio rapido

```bash
corepack pnpm install
corepack pnpm start
```

Comandos utiles:

```bash
corepack pnpm start:go
corepack pnpm start:tunnel
corepack pnpm android:dev
corepack pnpm android:preview
corepack pnpm android
corepack pnpm ios
corepack pnpm web
corepack pnpm lint
corepack pnpm typecheck
```

## Desarrollo movil

- No hace falta poner la IP de la PC en ningun archivo. En desarrollo la app
  toma el host del dev server de Metro (`api/base-url.ts`) y solo usa el puerto
  de `EXPO_PUBLIC_API_BASE_URL` (`http://localhost:3000` por defecto). Si la PC
  cambia de WiFi o de IP, el QR de Metro y la API se actualizan solos.
- Instala una vez el APK del perfil `development` (`pnpm android:dev`). Luego
  ejecuta `pnpm start` (o `pnpm start:remote`), conecta el telefono a la misma
  red que la computadora y abre el proyecto desde el QR de Expo. Fast Refresh
  actualiza pantallas, estilos y logica al guardar.
- `pnpm start:remote --tunnel` permite conectar Metro desde otra red. El tunel
  solo expone Metro, no la API local.
- Para probar cambios del backend local, levanta el dashboard en la PC y usa
  `pnpm start`; la app lo encuentra en la IP actual de esa PC.
- Si cambia una dependencia nativa, genera e instala otro APK de desarrollo.
  Los APK de `preview_apk` y `production` no se conectan a Metro: `production`
  apunta al dominio fijo y `preview_apk` conserva una IP de LAN, asi que ese
  perfil si necesita recompilarse al cambiar de red. Para pruebas locales usa
  el dev client.
- El enrolamiento facial detecta el giro de la cabeza con ML Kit
  (`@infinitered/react-native-mlkit-face-detection`), un modulo nativo: entra en
  el APK al recompilar. En un build viejo el enrolamiento sigue funcionando con
  captura temporizada, sin deteccion.
- `expo-image` esta fijado en `~57.0.5` a proposito: `@infinitered/react-native-mlkit-core`
  lo declara como peer `*`, y sin el pin pnpm instala la 58.x. Esa version omite
  `version` en `android.publication` de su `expo-module.config.json`, y el
  autolinking de SDK 57 falla al evaluar `settings.gradle` con
  `Field 'version' is required ... Publication`. Si el build de Android muere en
  `Run gradlew` con `EAS_BUILD_UNKNOWN_GRADLE_ERROR`, revisa
  `corepack pnpm why expo-image`: debe mostrar 57.0.5. No quites el pin ni subas
  `expo-image` sin migrar antes a SDK 58.
- `corepack pnpm start` arranca Metro en modo `dev-client`.
- `corepack pnpm start:tunnel` ayuda si el telefono no ve la red local.
- Instala un build de desarrollo en tu dispositivo con `corepack pnpm android:dev`.
- Si quieres una prueba mas cercana a preproduccion, instala `corepack pnpm android:preview`.
- Si quieres seguir usando Expo Go, usa `corepack pnpm start:go` con Expo Go para SDK 57.
- Las actualizaciones OTA usan `runtimeVersion.policy: fingerprint`: un cambio de SDK
  requiere un nuevo APK de desarrollo o distribucion antes de publicar actualizaciones
  compatibles con ese runtime.

## Calidad

- `lint`: revisa hooks, imports, codigo muerto y errores de integracion.
- `typecheck`: valida tipos antes de publicar builds o updates OTA.
- Antes de publicar una update, correr ambos comandos y probar el login mas una ruta principal por rol.

## Build y release

- `eas.json` define los perfiles de compilacion.
- `.github/workflows/deploy.yml` publica updates OTA desde `master`.
- Si `App CI/CD` falla con `The bearer token is invalid`, sigue la guia de
  [rotacion de EXPO_TOKEN](docs/ROTACION_EXPO_TOKEN.md).
- `app.json` concentra iconos, deep links, permisos y configuracion de Expo.

## Flujo recomendado de verificacion

1. Confirmar bootstrap de auth y splash screen.
2. Revisar navegacion principal por rol.
3. Validar exportacion PDF y componentes premium.
4. Probar `web` para detectar regresiones de layout o assets.
