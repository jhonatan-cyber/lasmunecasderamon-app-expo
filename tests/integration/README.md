# Prueba del modo offline (cajero)

Dos piezas, en orden de fidelidad:

1. **Arnés de integración** (`cajeroOffline.integration.test.ts`): corre acá mismo, sin
   hardware. Usa la cadena real —`apiClient` con `fetch` y token real, conectividad
   unificada, SQLite real (vía `node:sqlite`) y el dashboard real con su idempotencia—.
   Es lo más parecido a un dispositivo que se puede ejecutar en esta máquina.
2. **Runbook en dispositivo** (abajo): lo que ninguna suite puede hacer por vos —
   `expo-sqlite` nativo, el modo avión real del teléfono y el kill/relanzado de la app.

## 1. Arnés de integración

```bash
# Terminal 1: backend (Postgres local, escucha en 0.0.0.0:3000)
cd lasmunecasderamon-dashboard && pnpm dev

# Terminal 2: la prueba
cd lasmunecasderamon-app && pnpm test:integration
```

- Si el dashboard no responde, la suite **se saltea sola** y lo avisa (no falla en rojo).
- Otra URL: `DASHBOARD_URL=https://staging... pnpm test:integration`.
- Qué cubre: espejo de lectura (cuentas, ventas, estado de caja, detalle de cuenta)
  servido sin red; venta y consumos encolados con `device_date`; drenado al volver la
  red; y que el servidor **no re-ejecute** una operación ya vista (replay con
  `x-idempotent-replay: 1`, y 409 para la que quedó sin resolver).
- Qué **no** cubre, y por qué: el `expo-sqlite` nativo y la UI (no hay dispositivo ni
  emulador en esta máquina: sin `adb`, sin SDK de Android, sin JDK, Windows sin
  Xcode), y ninguna venta aceptada con 2xx, porque escribiría venta, stock, caja,
  comisiones y propinas en la base de desarrollo. El camino que sí se prueba es el que
  importa para el offline: que el servidor nunca duplique.

### Limpiar las sondas del servidor

Cada corrida deja dos claves de idempotencia en `sync_operations` del dashboard
(prefijo `probe-integracion-`). El script **solo lista** por defecto:

```bash
cd lasmunecasderamon-dashboard
node scripts/clean-sync-probes.js           # lista lo que borraría
node scripts/clean-sync-probes.js --yes     # borra
```

Reutiliza la guarda de BD local de los tests: no corre contra una BD remota salvo
`DB_ALLOW_REMOTE=1`.

## 2. Pantalla de diagnóstico (sólo desarrollo)

`app/(app)/diagnostico.tsx` muestra las filas **tal como quedaron en el SQLite del
teléfono**, sin pasar por los hooks ni por la caché de React:

- base, tablas y migración del espejo aplicada;
- cada fila de `mirror_cache` con su antigüedad, origen, tamaño y payload;
- cada fila de `outbox` con estado, intentos, motivo del rechazo, id de
  idempotencia y `device_date`.

Se abre desde **Pendientes → «VER SQLITE DEL DISPOSITIVO»** (el enlace sólo se
renderiza con `__DEV__`; en build de producción la ruta responde «Diagnóstico no
disponible»). Es de sólo lectura: nunca escribe, no drena la cola ni envía nada.

## 3. Runbook en dispositivo / emulador

### Requisitos

- **Dispositivo o emulador Android** con el dev client instalado. Opciones:
  `pnpm android` (`expo run:android`, necesita Android SDK + dispositivo por USB o AVD)
  o `pnpm android:dev` (APK de desarrollo vía EAS, se instala y escanea el QR).
  Con `adb reverse tcp:3000 tcp:3000` se puede servir el backend por USB sin tocar la
  red; en emulador, `base-url.ts` ya apunta a `10.0.2.2` solo.
- **Backend escuchando en todas las interfaces**: `pnpm dev` en el dashboard ya bindea
  `0.0.0.0:3000` (Postgres local levantado: `docker compose up -d` o el servicio).
- **Metro en LAN**: `pnpm start` en el app (por defecto en LAN).
- **No toques `.env`**: `EXPO_PUBLIC_API_BASE_URL` apunta a `localhost:3000`, pero
  `api/base-url.ts` resuelve el host en tiempo de ejecución a partir del dev server de
  Metro (la IP de la máquina), conservando el puerto 3000. Un teléfono en la misma
  red llega solo.
- Sesión de prueba: cajero `Pepe` / `10101010`.

### Fase A — Espejo en SQLite nativo

1. Con red, entra a **Cuentas**, **Caja** y **Ventas**; espera a que carguen.
2. Modo avión (Wi-Fi y datos apagados). Vuelve a abrir cada pantalla y hace pull to
   refresh.
   - **Pasa si:** aparece el chip **«Modo Offline»** en el header y los datos siguen
     ahí. Con el avión puesto es imposible que vengan de la red: sólo el SQLite del
     teléfono los puede entregar.
3. Prueba dura del espejo nativo: abrí **Pendientes → «VER SQLITE DEL
   DISPOSITIVO»** (`/diagnostico`, sólo en build de desarrollo). Ahí están las
   filas de `mirror_cache` con su antigüedad real, leyéndose del SQLite del
   teléfono.
   - **Pasa si:** aparecen las filas de Cuentas, Caja y Ventas, con el avión
     puesto. Si aparecen, el espejo nativo está vivo y no es una caché en memoria.
4. Cierra la app por completo, sigue en avión, ábrela de nuevo y entra a **Cuentas**.
   - **Pasa si:** sigue mostrando los datos. Eso prueba persistencia en disco y no
     caché en memoria; volvé a `/diagnostico` y las mismas filas deben seguir ahí
     después del relanzado.

### Fase B — Encolado de venta sin red

1. En avión, **Nueva Venta** → agrega un producto → cobra (efectivo).
2. **Pasa si:** el toast dice **«Venta guardada en el dispositivo / Se enviará
   automáticamente cuando vuelva la conexión»**, el banner rojo muestra
   **«SIN CONEXIÓN · 1 OPERACIÓN(ES) GUARDADA(S)»**, y al tocar **VER** aparece en
   `/cajero/pendientes` con chip **EN COLA**.
3. Verificá en el servidor que la venta **no** existe todavía (y que el cajero no
   engañó: el toast nunca dice «Venta realizada»).

### Fase C — Encolado de consumos sin red

1. En avión, **Cuentas** → abre una cuenta → agrega productos → guardar.
2. **Pasa si:** **«Consumos guardados en el dispositivo / Se enviarán automáticamente
   cuando vuelva la conexión»** y hay una segunda intención **EN COLA** en
   `/cajero/pendientes`.
3. En la misma pantalla, reintentá con **SINCRONIZAR AHORA** sin red: no debe avanzar
   (el botón queda deshabilitado), y la cola no pierde nada.

### Fase C2 — Cobro de cuenta sin red (transaccional)

1. En avión, **Cuentas** → toca **Cobrar** en una cuenta abierta.
2. **Pasa si:** el modal **no** se bloquea: muestra el aviso **«Sin conexión: el
   cobro se guarda en el dispositivo y se envía solo al volver la red. La cuenta
   sigue abierta hasta que el servidor lo confirme»**, el botón dice **GUARDAR
   COBRO**, y al confirmar aparece **«Cobro guardado en el dispositivo»** con una
   tercera intención **EN COLA** en `/cajero/pendientes`.
3. **Pasa si:** esa intención viaja como UNA sola (`account.checkout`): el
   servidor cierra la cuenta y factura la venta en la misma transacción, así que
   no puede quedar la cuenta cobrada sin venta. Verificalo en el servidor al
   reconectar: `SELECT COUNT(*) FROM ventas` sube una vez y la cuenta pasa a
   `estado = 0` una sola vez.
4. **Pasa si:** con caja cerrada el cobro **sí** sigue bloqueado (lo exige el
   servidor), y en el diagnóstico `/diagnostico` la intención muestra su
   `device_date` con la hora en que el cajero cobró.

### Fase D — Lo que está bloqueado a propósito

En avión, sin red, cada operación que depende del estado del servidor debe negarse
explicando el motivo, nunca encolarse en silencio. El cobro **no** está en esta
lista: desde el endpoint transaccional se encola (Fase C2).

| Pantalla | Qué se espera |
| --- | --- |
| Caja | botones de abrir/cerrar/retiro deshabilitados + aviso **«Sin conexión · Abrir, cerrar la caja o registrar un retiro necesita el servidor.»** |
| Ventas | toast de bloqueo para prepago, anulación y temporizador |
| Nueva cuenta | toast **«Crear o modificar una cuenta necesita el servidor.»** |

### Fase E — Sincronización al volver la red

1. Quitá el modo avión.
2. **Pasa si:** el banner pasa a **«ENVIANDO N OPERACIÓN(ES)…»** y luego desaparece;
   en `/cajero/pendientes` cada intención queda **ENVIADA** (o **REVISAR** con el
   motivo concreto del servidor), y al recargar las pantallas la venta, los
   consumos y el cobro aparecen **una sola vez** en el servidor.
3. Verificación en el servidor (una corrida limpia):
   ```sql
   SELECT id_cliente, endpoint, estado, intentos FROM sync_operations ORDER BY creado_en;
   -- venta creada exactamente una vez
   SELECT COUNT(*) FROM ventas;
   -- consumos cargados exactamente una vez en la cuenta
   ```
4. **Idempotencia:** tocá **REINTENTAR** sobre una intención **REVISAR**. El servidor
   debe contestar con lo mismo (409 `IDEMPOTENCY_FALLIDA` para la que pudo haberse
   aplicado) y el producto no debe duplicarse. Ese es el motivo de que un 5xx no se
   reintente solo en automático: lo mira una persona.
5. **Sello de hora:** la venta encolada sin red debe quedar con la hora en que se
   cobró (`device_date`), no la hora de sincronización; si no, se mueve de turno.

### Después de la prueba

- `/cajero/pendientes` vacío, sin **REVISAR**.
- Lo hecho desde el dispositivo es **data real**: la venta y los consumos de prueba
  quedan en la base junto con su fila en `sync_operations` (clave de idempotencia,
  no prefijo de sonda). Para identificar la corrida y limpiarla a mano:
  ```sql
  SELECT id_cliente, endpoint, estado, creado_en FROM sync_operations ORDER BY creado_en DESC LIMIT 5;
  ```
- Las sondas del arnés (prefijo `probe-integracion-`) sí se borran con
  `node scripts/clean-sync-probes.js --yes` en el dashboard.
