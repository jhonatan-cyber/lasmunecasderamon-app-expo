# Plan de mejoras — lasmunecasderamon-app

Fecha: 2026-10-07 · Origen: auditoría solo-lectura (arquitectura, rendimiento, calidad).
Ordenado por impacto. Cada fase es mergeable por separado.

## Fase 0 — Quick wins (1–2 días, sin riesgo)

- [x] `api/token.ts` + `request.ts` + `authStore.ts`: `403` → `notifyForbidden()` → revalida con `refreshUser()` (con guarda anti-loop); si el servidor ya no resuelve al usuario, `sessionExpired`. Sin refresh de token (el token es válido) y sin retry.
- [x] `utils/tokenStorage.ts`: `removeTokens` con `Promise.allSettled` (ya no deja `refresh_token` huérfano).
- [x] `store/authStore.ts`: `logout` llama a `removeCredentials()`; `getCredentials` con `try/catch` + validación de forma.
- [x] 2FA: verificado que no hay UI (solo stubs en el store + tests). Sin cambios.
- [x] `context/NotificationContext.tsx`: toast "Conectado" → `logger.debug`.
- [x] Voz: preferencia `voice_alerts_enabled` (default activado = sin cambio de comportamiento) + Switch "Alertas por voz" en `PremiumProfileView`. Se optó por opt-out con UI en vez de `false` por defecto sin interruptor (apagarlo a ciegas rompía alertas de llamado al personal).
- [x] `configureNotifications()` solo en `NotificationProvider` (quitado de `app/(app)/_layout.tsx`).
- [x] `console.*` directos → `logger.*` (`login.tsx`, `eventBus.ts` — este último ahora reporta a Sentry).
- [x] `utils/sentry.ts`: sin DSN no se carga el SDK ni se inicializa (`isSentryEnabled()` expuesto); call-site sin placeholder.
- [x] `.env` a `.gitignore` + `.env.example` creado (NOTA: el `.env` actual sigue trackeado en git — hay que hacer `git rm --cached .env`).
- [x] `app.json`: fuera `RECORD_AUDIO` (nada graba audio), fuera el dominio con ñ (punycode es el canónico) y el `intentFilter` duplicado.
- [ ] `eas.json`: `preview_apk` contra staging, no contra prod. ⛔ Bloqueado: no existe backend staging (ver `packages/config`: solo `PROD_API_BASE_URL`). Requiere crear `staging.dashboard…` primero.
- [x] `app/_layout.tsx`: se evaluó guarda `__DEV__` para `expo-dev-client` y se descartó (el paquete es no-op en prod; el `require` condicional metía 7 warnings de lint por 0 beneficio medible).
- [x] `services/outbox`: `pruneResolved()` (aplicadas >7d, fallidas >30d, cap 500) ejecutada en cada `flush`.
- [x] Modal de sesión: botón "Reintentar sesión" (intenta `refreshUser()`; nunca fuerza logout — sin red el refresh falla con tokens aún válidos).

## Fase 1 — Dinero y offline (riesgo real, 1 semana)

Objetivo: ningún cobro duplicado ni perdido por retries/colas.

- [x] **Idempotencia global**: `api/request.ts` genera `x-idempotency-key` por llamada en todo POST/PUT/PATCH (estable en retries y reenvío post-refresh; respeta la del outbox; FormData excluido).
- [x] **`services/offlineSync.ts` deprecado**: `@deprecated`, warn en `queueRequest`, mutex de escritura, agotados → lista `offline_request_failed_queue` (cap 50, `getFailedRequests()`) en vez de descarte silencioso. Sin consumidores activos (hook sin uso); el drenado se conserva para colas ya guardadas y ahora es idempotente vía la clave global.
- [x] **Orden del flush**: `orderFlushable()` — FIFO global, pero consumos antes que el cobro dentro de la misma `id_cuenta` (exportado para tests).
- [ ] Criterio de aceptación: test de doble-submit (timeout + retry) crea 1 sola venta; cola legacy sin referencias.

## Fase 2 — Rendimiento (1 semana)

- [x] **Re-renders 1 Hz**: `TimerContext` dividido en datos + `TimerActionsContext` estable (`useTimerActions()` en los 3 consumidores que solo refrescan); `SalesContext` igual (`useSalesActions()`); `useMemo` en los 3 providers. Extra: `handleServerEvent` ya no depende del objeto `user` (un `updateProfile` cortaba el SSE). Selectores zustand revisados sin cambios (consumen casi todo el store o stores de 3 claves).
- [x] **N+1 por evento SSE**: hook `useDebouncedEventListener` (500 ms trailing) aplicado a `useDashboardData`, `SalesContext` y `PendingSolicitudesAlert` (el shake sigue inmediato).
- [x] **Arranque**: `enabled: !!user` en sales, fetch de timers solo con sesión, `initMirror/initOutbox//configurations` post-splash vía `InteractionManager`, `checkAuth` en paralelo + `withTimeout` sin leak + `user` corrupto tolerado.
- [x] **Bundle (parcial)**: `expo-image-picker` vía `import()` en handlers; SQLite diferido post-splash. Revertido `require` perezoso de `expo-sqlite` (rompía `vi.mock('expo-sqlite')` en 26 tests; documentado en `driver.ts`).
- [ ] **Bundle (pendiente QA dispositivo)**: `expo-camera` lazy (exige partir modales por `useCameraPermissions`); migrar 10 pantallas de `Image` RN a `expo-image`; fijar budget con `build:analyze`.
- [ ] Criterio: TTI medido antes/después, 0 re-renders fuera de la pantalla activa por tick.

## Fase 3 — Sesión y tiempo real (3–4 días)

- [x] **SSE + refresh**: sin red confirmada no se crea el socket (reconecta el evento `online`); tras 3 errores seguidos, UN intento de `refreshAccessToken()` por racha (si revive, reconecta ya); tráfico resetea la racha. Extra: `scheduleReconnect` estable vía ref (eliminado el error de lint preexistente).
- [ ] **Token en 3 sitios** (zustand + `tokenInMemory` + SecureStore, sync manual) → una sola fuente. ⛔ Pendiente: refactor grande, toca login/logout/refresh/request; hacer con QA de sesión.
- [x] **`checkAuth`**: ya no autocrea la gracia offline (test actualizado al nuevo comportamiento).
- [ ] **Tipar SSE**: unión discriminada + `handlers: Record<EventType, fn>` + gate por rol. ⛔ Pendiente: ~350 líneas con `any`; hacerlo por evento con tests.
- [ ] Unificar taxonomías push vs SSE (`order_created` vs `new_order`, …) en un mapa `evento → ruta`. ⛔ Pendiente junto al tipado.
- [x] `updateProfile`: ahora `await` al PUT y retorna `boolean` (optimista en local, reporta si el servidor no confirmó).

## Fase 4 — Calidad y CI (continuo)

- [x] **CI**: el workflow `quality.yml` SÍ existía (la auditoría lo pasó por alto): Node 20 → 22 (igual que `eas.json`), agregado paso `expo-doctor`. Thresholds de coverage 45/60/65/65 → 55/65/72/72 (medido 60.6/69.6/77.5/76.7). NOTA: `pnpm lint` ya falla en `master` por ~5+ errores preexistentes (`set-state-in-effect` en hooks) — el job quality estaba rojo antes de este plan; limpiarlos es tarea aparte.
- [x] **Tipos (borde API)**: `serverUserSchema` + `configurationsSchema` en `@lasmunecasderamon/validations`; aplicados en `refreshUser` (`/auth/me` inválido → `false` sin tocar la sesión) y `/configurations` (ignora formas raras en vez de `NaN` en umbrales).
- [x] **Tipos de dominio**: `Product/CartItem/Anfitriona/Room` → `types/cart.ts` (fin de la capa `store → components`); `ProductCard` re-exporta por compatibilidad.
- [ ] **Tipos (resto)**: reducción sistemática de los ~600 `any` de cobro; zod en respuestas SSE. ⛔ Pendiente: trabajo por archivo con QA.
- [ ] **God files**: partir `PremiumProfileView`, `cuentas`, `useCuentasScreen`; unificar reducers de pago ×3. ⛔ Pendiente: exigen QA visual.
- [x] **Logger**: `debug/info` sin breadcrumb; `maxBreadcrumbs: 50`; scrub de PII (`authorization|token|password|secret|codigo|qr_token|device_date` → `[redacted]`) en consola, breadcrumbs y `captureMessage`. Los 19 `eslint-disable` se dejan (quitarlos aflora errores preexistentes; van con la limpieza de lint).
- [x] Migrados ~33 `captureException` de fetches de fondo a `logger.fetchError` (18 hooks + overlay + profile + store). Quedan 15 en mutaciones/acciones de usuario y ops SQLite locales (ahí sí corresponde reportar).
- [ ] E2E nativo/SSE/SecureStore/SQLite (Playwright hoy solo cubre web estático).

## Orden sugerido

Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4. Las fases 0 y 4-parcial (CI) pueden ir en paralelo.
