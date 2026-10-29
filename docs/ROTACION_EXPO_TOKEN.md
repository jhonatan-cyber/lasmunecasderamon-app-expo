# Rotar EXPO_TOKEN y republicar la OTA

El workflow `App CI/CD` publica la OTA de producción autenticándose con el secreto `EXPO_TOKEN`. Si el token se revoca o deja de ser válido, `eas whoami` falla con **«The bearer token is invalid»** y la actualización no se publica. Esta guía reemplaza el token sin tocar código y sin exponer su valor.

## Ruta rápida

1. Confirmar el fallo en el workflow.
2. Crear un token nuevo en Expo.
3. Reemplazar el secreto `EXPO_TOKEN` en GitHub.
4. Validar el token y relanzar `deploy.yml`.
5. Confirmar que la OTA aparece en producción y revocar el token viejo.

## 1. Confirmar el fallo

```bash
gh run list --workflow=deploy.yml --branch master --limit 3
gh run view <RUN_ID> --log-failed
```

Busca el paso **Verify Expo token** (o **Publish production OTA** en runs anteriores a este preflight):

```text
eas whoami
The bearer token is invalid.
Error: GraphQL request failed.
```

Ese mensaje significa que GitHub está entregando un token que Expo ya no acepta; no es un fallo del código ni de las dependencias.

## 2. Crear el token en Expo

El proyecto pertenece a la cuenta `nuwe` (`owner` en `app.json`) y al proyecto EAS `ef39814f-d1f7-444c-bc30-598055b8595e`.

1. Inicia sesión en [expo.dev](https://expo.dev) con una cuenta que pueda publicar en `@nuwe/lasmunecasderamon-app`.
2. Abre [Access tokens](https://expo.dev/settings/access-tokens).
3. Crea un token con un nombre identificable, por ejemplo `github-actions-lasmunecasderamon-2026-10`.
4. Cópialo en ese momento: Expo no vuelve a mostrarlo.

Para CI se recomienda un **robot user** de la organización con permiso para publicar updates, en vez de un token personal. Si ya existe uno, crea el token desde esa cuenta. Si no tienes acceso a `nuwe`, pide a su owner que cree el token o te invite; no se puede rotar desde el repositorio.

## 3. Reemplazar el secreto en GitHub

El secreto es de repositorio y se llama exactamente `EXPO_TOKEN`. Lo usan `deploy.yml` y `build-android.yml`. Necesitas permisos de administración del repositorio para actualizarlo.

Con GitHub CLI:

```bash
gh secret set EXPO_TOKEN
```

Pega el token en el prompt interactivo y pulsa Enter. No uses `--body` ni lo escribas en el historial de la terminal. Verifica que quedó actualizado:

```bash
gh secret list | grep EXPO_TOKEN
```

También puedes hacerlo desde **Settings → Secrets and variables → Actions → EXPO_TOKEN → Update**.

## 4. Validar y relanzar

Valida el token localmente sin dejarlo en el historial:

```bash
read -rsp "EXPO_TOKEN: " EXPO_TOKEN && export EXPO_TOKEN
pnpm dlx eas-cli@24.12.1 whoami
pnpm dlx eas-cli@24.12.1 update:list --branch production --limit 3
unset EXPO_TOKEN
```

`whoami` debe devolver la cuenta dueña del token y `update:list` debe listar las updates de producción. Si `whoami` falla, el token es inválido o no tiene acceso al proyecto.

Relanza el workflow desde `master`:

```bash
gh workflow run deploy.yml --ref master
gh run list --workflow=deploy.yml --limit 1
gh run watch <RUN_ID>
```

El disparo manual ejecuta primero `quality.yml` y, si pasa, publica la OTA. También se publica automáticamente cuando `App Quality` termina en verde sobre `master`.

## 5. Confirmar la OTA y revocar el token viejo

1. Espera a que `App CI/CD` termine en verde.
2. Confirma la update:

   ```bash
   read -rsp "EXPO_TOKEN: " EXPO_TOKEN && export EXPO_TOKEN
   pnpm dlx eas-cli@24.12.1 update:list --branch production --limit 1
   unset EXPO_TOKEN
   ```

   Debe aparecer la update nueva con el mensaje del commit.
3. Revisa el proyecto en [Expo](https://expo.dev/accounts/nuwe/projects/lasmunecasderamon-app).
4. En un dispositivo con el binario de producción, cierra y abre la app dos veces para aplicar la update.
5. Recién entonces revoca el token viejo en [Access tokens](https://expo.dev/settings/access-tokens). Si el token viejo se usa en otro sitio, actualízalo allí antes de revocarlo.

## Detalles

| Tema | Decisión |
| --- | --- |
| Cuenta y proyecto | `nuwe` / `ef39814f-d1f7-444c-bc30-598055b8595e` |
| Secreto | `EXPO_TOKEN`, nivel repositorio |
| Consumidores | `.github/workflows/deploy.yml` y `.github/workflows/build-android.yml` |
| Preflight | `Verify Expo token` en `deploy.yml` y `build-android.yml` falla antes de instalar dependencias si el secreto falta o no autentica |
| Disparador | `workflow_run` de `App Quality` en `master`, o `workflow_dispatch` |
| Canal OTA | `production`; `runtimeVersion` por fingerprint: solo llega a binarios compatibles |
| Guarda de deploy | El SHA debe seguir siendo el head de `master`; si `master` avanzó, hay que relanzar |
| Sentry | Usa `SENTRY_AUTH_TOKEN`, un secreto distinto; no se rota aquí |
| Vigencia | Sin caducidad automática documentada; deja de servir si se revoca o la cuenta pierde acceso al proyecto |

## Problemas frecuentes

| Síntoma | Causa probable | Acción |
| --- | --- | --- |
| `The bearer token is invalid` | Token revocado, inválido o secreto con valor viejo | Crear token nuevo y actualizar `EXPO_TOKEN` |
| `EXPO_TOKEN no configurado` | El secreto no existe en el repositorio | Cargar `EXPO_TOKEN` y relanzar el workflow |
| `whoami` funciona pero falla la update | La cuenta no tiene acceso al proyecto `nuwe` | Usar el owner o un robot user con permiso de publicación |
| `EAS project not configured` | Falta `extra.eas.projectId` en `app.json` | Restaurar el project ID; hoy está presente |
| Falla «Confirm this is still the production branch head» | `master` avanzó durante el run | Relanzar el workflow sobre el head actual |
| `App CI/CD` no se dispara | `App Quality` falló o el workflow no está en `master` | Corregir `App Quality` o usar `workflow_dispatch` |
| El secreto se actualizó pero sigue fallando | Se reejecutó un job viejo con el valor anterior | Relanzar el workflow completo |

## Checklist

- [ ] Token creado desde una cuenta con acceso a `@nuwe/lasmunecasderamon-app`.
- [ ] `EXPO_TOKEN` actualizado en los secretos del repositorio.
- [ ] `eas whoami` funciona con el token nuevo.
- [ ] `App CI/CD` termina en verde y publica la OTA.
- [ ] `eas update:list --branch production` muestra la update nueva.
- [ ] El token viejo quedó revocado.

## Referencias

- [Expo: acceso programático y tokens](https://docs.expo.dev/accounts/programmatic-access/)
- [expo-github-action: configuración del token](https://github.com/expo/expo-github-action#configuration-options)
- [Workflow de deploy](../.github/workflows/deploy.yml)
