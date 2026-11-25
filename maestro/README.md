# E2E Android con Maestro

Estos flujos iniciales comprueban el inicio de sesión de un cajero y la lectura
del catálogo guardado en SQLite después de matar y relanzar la app sin red. No
registran ventas ni otras operaciones financieras.

## Requisitos y seguridad

- Android SDK, `adb`, un emulador Android aislado y Maestro CLI. La instalación
  de Maestro debe seguir su [guía oficial](https://maestro.mobile.dev/getting-started/installing-maestro).
- Un APK independiente (con el bundle JS incluido), no un dev client dependiente
  de Metro: el flujo offline vuelve a abrir la app con el modo avión activo.
- El backend de producción `https://dashboard.xn--lasmuecasderamon-bub.com`
  accesible desde el emulador y una cuenta de prueba autorizada con rol cajero,
  onboarding completado y una categoría de venta disponible.
- El perfil EAS `preview_apk` apunta a producción. Los flujos solo comprueban
  login y lectura del catálogo; no registres ventas ni otras operaciones reales.
- Ambos flujos ejecutan `clearState: true`, lo que borra los datos locales de la
  app en el dispositivo. Ejecuta solo en un emulador desechable; no en el teléfono
  personal ni en una instalación con datos que deban conservarse.

## Preparar el emulador

1. Verifica que `https://dashboard.xn--lasmuecasderamon-bub.com` sea accesible
   desde el emulador y usa únicamente una cuenta de prueba autorizada.
2. Construye el APK autónomo con el perfil `preview_apk`, configurado para
   producción:

   ```powershell
   npx eas-cli build --profile preview_apk --platform android
   ```

3. Instala el APK descargado en el emulador y confirma que puede iniciar sesión
   mientras tiene conexión. No hace falta mantener Metro abierto.

## Ejecutar

En PowerShell, define credenciales de una cuenta de prueba (no las guardes en el
repositorio) y, si hace falta, el nombre de una categoría disponible:

```powershell
$env:MAESTRO_USERNAME = 'nick-de-prueba'
$env:MAESTRO_PASSWORD = 'clave-de-prueba'
$env:MAESTRO_CATEGORY = 'Bebidas'
corepack pnpm run test:e2e:android
```

El flujo `login-cajero.yaml` valida el acceso. `catalogo-offline.yaml` carga el
catálogo conectado, activa modo avión, mata el proceso y lo relanza para validar
que el catálogo reaparece desde el espejo offline y que se conserva la sesión.
Al terminar, el flujo desactiva modo avión; si una ejecución se interrumpe,
restáuralo manualmente en el emulador antes de continuar.

## Estado de cobertura

Los flujos están preparados, pero no se ejecutaron en este entorno: Maestro no
está disponible, `adb` no tiene un emulador conectado y no hay credenciales de
prueba configuradas. `NotificationContext.test.tsx`
comprueba que un mensaje SSE recibido llega al manejador y al bus realtime, pero
todavía no se valida la conexión SSE contra un backend desde Android. La suite no
se agrega a CI porque requiere un APK Android, credenciales autorizadas y emulador.