# Las Munecas de Ramon App

Aplicacion `Expo Router` para operacion interna, con soporte `android`, `ios` y `web`.

## Inicio rapido

```bash
corepack pnpm install
corepack pnpm start
```

Comandos utiles:

```bash
corepack pnpm android
corepack pnpm ios
corepack pnpm web
corepack pnpm lint
corepack pnpm typecheck
```

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
