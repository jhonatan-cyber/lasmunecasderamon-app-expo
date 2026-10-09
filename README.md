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

- Para ver cambios en vivo usando la API remota, instala una vez el APK del
  perfil `development` (`pnpm android:dev`). Luego ejecuta `pnpm start:remote`,
  conecta el telefono a la misma red que la computadora y abre el proyecto
  desde el QR de Expo. Fast Refresh actualiza pantallas, estilos y logica al guardar.
- `pnpm start:remote --tunnel` permite conectar Metro desde otra red.
  El comando usa la URL remota definida en `eas.json` sin modificar `.env`.
- El tunel de Metro no expone la API local. Para probar cambios del backend
  local, usa `pnpm start` y levanta el dashboard en una direccion accesible
  desde el telefono.
- Si cambia una dependencia nativa, genera e instala otro APK de desarrollo.
  Los APK de `preview_apk` y `production` no se conectan a Metro para Fast Refresh.
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
- `app.json` concentra iconos, deep links, permisos y configuracion de Expo.

## Flujo recomendado de verificacion

1. Confirmar bootstrap de auth y splash screen.
2. Revisar navegacion principal por rol.
3. Validar exportacion PDF y componentes premium.
4. Probar `web` para detectar regresiones de layout o assets.
