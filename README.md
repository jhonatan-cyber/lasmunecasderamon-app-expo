# Las Munecas de Ramon App

Aplicacion `Expo Router` para operacion interna, con soporte `android`, `ios` y `web`.

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

- `corepack pnpm start` arranca Metro en modo `dev-client`.
- `corepack pnpm start:tunnel` ayuda si el telefono no ve la red local.
- Instala un build de desarrollo en tu dispositivo con `corepack pnpm android:dev`.
- Si quieres una prueba mas cercana a preproduccion, instala `corepack pnpm android:preview`.
- Si quieres seguir usando Expo Go, usa `corepack pnpm start:go`, pero esta app puede requerir una version de Expo Go mas nueva que la instalada en tu telefono.

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
