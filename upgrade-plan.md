# Plan de actualización de dependencias - lasmunecasderamon-app

## Objetivo
Actualizar de forma segura las dependencias de `lasmunecasderamon-app`, centrando el esfuerzo en la migración de Expo SDK y React Native, y minimizando el riesgo de roturas en producción.

## Alcance
- Migrar Expo SDK de `54.0.33` a `56.x`.
- Actualizar React Native de `0.81.5` a `0.85.x` (compatible con Expo 56).
- Actualizar paquetes del ecosistema Expo y librerías React/React Native relacionadas.
- Revisar herramientas de desarrollo: TypeScript, Vitest, Playwright, ESLint.
- Probar la aplicación en Android, iOS y Web.

## Estado de avance
- [x] Fase 1: Preparación iniciada
- [x] Verificación baseline: `pnpm install --frozen-lockfile` completada
- [x] Fase 2: Actualizar Expo y dependencias clave (expo 56 + React 19.2.7 + RN 0.85.3)
- [x] Fase 3: Actualizar librerías de React Native y utilidades
- [x] Fase 4: Actualizar herramientas de desarrollo (parcial)
- [x] Fase 5: Ejecutar instalación y ajustes
- [x] Fase 6: Pruebas y validación completada
- [x] Fase 7: Corrección y estabilización completada

## Notas de fase 5
- `pnpm install --frozen-lockfile` validó el lockfile tras las actualizaciones.
- Se aplicaron ajustes de código para compatibilidad con RN 0.85 / Expo 56 (StyleSheet, navigation bar, AsyncStorage, color scheme normalization, icon typings).

## Notas de fase 6
- `pnpm exec tsc --noEmit` pasó sin errores.
- `pnpm lint` pasó sin errores.
- Se corrigieron los issues de React Hooks, componentes creados durante render y sincronización de efectos en:
  - `app/(app)/cajero/ventas.tsx`
  - `app/(app)/cajero/solicitudes.tsx`
  - `app/(app)/cajero/nueva-cuenta.tsx`
  - `app/(app)/cajero/nueva-venta.tsx`
  - `app/(app)/cajero/nuevo-servicio.tsx`
  - `app/(app)/cajero/servicios.tsx`
  - `app/(auth)/login.tsx`
  - `components/shared/*`

## Notas de fase 2
- `expo` y `expo-*` se actualizaron a SDK 56.
- `react` y `react-dom` avanzaron a `19.2.7`.
- `react-native` actualizó a `0.85.3`.
- `expo-router` se actualizó a `56.2.8`.
- `@expo/metro-runtime` se agregó como dependencia directa para resolver la incompatibilidad de `expo-router`.

## Notas de fase 3
- `@react-native-async-storage/async-storage` actualizó a `3.1.1`.
- `react-native-gesture-handler` actualizó a `3.0.0`.
- `react-native-reanimated` se fijó en `4.3.0` para compatibilidad con `react-native-worklets@0.8.0`.
- `react-native-safe-area-context` actualizó a `5.8.0`.
- `react-native-screens` actualizó a `4.25.2`.
- `react-native-svg` actualizó a `15.15.5`.
- `react-native-worklets` se ajustó a `0.8.0` para la compatibilidad con Expo 56.

## Notas de fase 4
- `vitest` actualizó a `4.1.8`.
- `@playwright/test` actualizó a `1.60.0`.
- `react-test-renderer` actualizó a `19.2.7`.
- `eslint-config-expo` actualizó a `56.0.4`.
- `typescript` se mantuvo en `~5.9.3` debido a una advertencia de peer dependency de `eas-cli`.

## Fases

### 1. Preparación
1. Crear una rama nueva para la migración, por ejemplo `upgrade/expo-56`.
2. Asegurarse de que `pnpm install` y la app actual funcionan correctamente antes de cambiar versiones.
3. Confirmar la versión actual de `pnpm` y `node` requerida por el proyecto.

### 2. Actualizar Expo y dependencias clave
1. Actualizar `expo` a `~56.0.8`.
2. Actualizar paquetes `expo-*` relacionados con SDK 56:
   - `expo-build-properties`
   - `expo-camera`
   - `expo-constants`
   - `expo-device`
   - `expo-file-system`
   - `expo-font`
   - `expo-haptics`
   - `expo-image-picker`
   - `expo-intent-launcher`
   - `expo-linear-gradient`
   - `expo-linking`
   - `expo-local-authentication`
   - `expo-navigation-bar`
   - `expo-network`
   - `expo-notifications`
   - `expo-print`
   - `expo-router`
   - `expo-secure-store`
   - `expo-sharing`
   - `expo-speech`
   - `expo-splash-screen`
   - `expo-sqlite`
   - `expo-status-bar`
   - `expo-symbols`
   - `expo-updates`
3. Actualizar `react` y `react-dom` a `19.2.7`.
4. Actualizar `react-native` a `0.85.3`.
5. Verificar compatibilidad de `expo-router` con Expo 56.

### 3. Actualizar librerías de React Native y utilidades
1. Actualizar `@react-native-async-storage/async-storage` a `3.1.1`.
2. Actualizar `react-native-gesture-handler` a `3.0.0`.
3. Actualizar `react-native-reanimated` a `4.4.0`.
4. Actualizar `react-native-safe-area-context` a `5.8.0`.
5. Actualizar `react-native-screens` a `4.25.2`.
6. Actualizar `react-native-svg` a `15.15.5`.
7. Actualizar `@react-navigation/bottom-tabs` si es necesario luego de `react-navigation/native`.
8. Actualizar `@sentry/react-native` a `8.13.0`.
9. Validar `moti`, `react-native-qrcode-svg`, `react-native-sse`, `react-native-toast-message` con Expo 56.

### 4. Actualizar herramientas de desarrollo
1. Actualizar `typescript` a `6.0.3` si el códigobase es compatible.
2. Actualizar `vitest` a `4.1.8`.
3. Revisar `@types/react` y `react-test-renderer` contra React 19.2.
4. Revisar ESLint/`eslint-config-expo` y reglas compatibles con Expo 56.

### 5. Ejecutar instalación y ajustes
1. Ejecutar `pnpm install`.
2. Ejecutar `pnpm install --lockfile-only` si se quiere forzar actualización del lockfile sin instalar.
3. Revisar alertas de compatibilidad en la instalación.
4. Ajustar paquetes con breaking changes de Expo 56 según la documentación oficial.

### 6. Pruebas y validación
1. Ejecutar `pnpm lint` y `pnpx tsc --noEmit`.
2. Ejecutar la app en:
   - Android (`pnpm android` o `expo run:android`)
   - iOS (`pnpm ios` o `expo run:ios`)
   - Web (`pnpm web` o `expo start --web`)
3. Probar flujos críticos: autenticación, navegación, notificaciones, cámara, impresión, SQLite, splash screen.
4. Ejecutar pruebas existentes:
   - `pnpm test:e2e:smoke`
   - Suite de Vitest si existe.
5. Revisar `expo-router` y navegación web para cambios de API.

### 7. Corrección y estabilización
1. Resolver errores de compilación y fallos de runtime.
2. Ajustar imports o APIs de Expo renombradas o deprecadas.
3. Actualizar la configuración de `metro.config.js`, `tsconfig.json` o `babel.config.js` si es necesario.
4. Asegurarse de que no hay warnings críticos en la consola.

## Riesgos conocidos
- Migración de Expo SDK y React Native puede requerir cambios en la configuración de Metro y JS Engine.
- `expo-router` puede requerir cambios en rutas y layouts.
- `react-native-reanimated` debe volver a compilar el native module y actualizar los `babel-plugin` si aplica.
- `@testing-library/jest-native` aparece deprecated; evaluar actualizaciones de testing si se decide migrar pruebas.

## Notas adicionales
- Usar la guía oficial de Expo SDK 56: https://docs.expo.dev/versions/latest/
- Si se necesita un paso incremental, considerar primero subir a Expo SDK 55 y luego a 56.

## Seguimiento
- Crear issues o tareas en el repo con cada fase.
- Fases 1 a 7 marcadas como completadas.
- Mantener el archivo `upgrade-plan.md` como referencia en la rama de migración.
