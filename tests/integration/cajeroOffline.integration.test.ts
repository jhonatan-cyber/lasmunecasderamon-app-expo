import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { API_URL, apiClientSafe, setTokenInMemory } from '@/api/client';
import { connectivity } from '@/services/connectivity';
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS, setMirrorForTests } from '@/services/mirror';
import { createMirrorRepository, type MirrorRepository } from '@/services/mirror/repository';
import { ensureMirrorSchema, MIRROR_SCHEMA_VERSION } from '@/services/mirror/schema';
import { createOutboxRepository, type OutboxRepository } from '@/services/outbox/repository';
import {
    createOutboxService,
    IDEMPOTENCY_HEADER,
    type OutboxService,
} from '@/services/outbox/service';
import type { OutboxIntent } from '@/services/outbox/types';
import { createNodeSqliteMirrorDriver } from '../helpers/nodeSqliteMirrorDriver';

/**
 * Prueba de integración del modo offline del cajero **contra el dashboard real**.
 *
 * Qué ejercita de verdad (nada mockeado): `apiClient` con `fetch` y token real,
 * el espejo y la cola sobre SQLite real, la conectividad unificada, los payloads
 * reales y el servidor real con su idempotencia.
 *
 * Qué NO puede ejercitar y por qué:
 *
 * - el SQLite **nativo** de Expo (`expo-sqlite`) y la UI: no hay dispositivo ni
 *   emulador en esta máquina (sin `adb`, sin SDK de Android, Windows sin
 *   Xcode). El SQL es el mismo y corre contra `node:sqlite`, así que el esquema
 *   y las consultas sí se ejecutan de verdad;
 * - una venta que el servidor **acepte** (2xx): escribiría venta, stock, caja,
 *   comisiones y propinas, y revertir eso a mano es más riesgoso que el valor
 *   que agrega. El camino que se prueba acá es el que importa para el offline:
 *   que el servidor **no vuelva a ejecutar** una operación ya vista.
 *
 * Requiere el dashboard levantado (`PORT=3000 pnpm dev` en el repo del
 * dashboard). Si no responde, la suite se saltea sola.
 */

const CAJERO = { email: 'Pepe', password: '10101010' };
const CUENTA_INEXISTENTE = '00000000-0000-0000-0000-000000000000';

/** Prefijo de las claves de esta corrida, para poder limpiarlas del servidor. */
const RUN = `probe-integracion-${Date.now()}-`;

/**
 * ¿Está el dashboard? Cualquier respuesta HTTP cuenta como «sí»: el endpoint
 * está detrás del middleware de sesión y contesta 401 sin token, que es una
 * respuesta perfectamente válida. Sólo un fallo de red significa «no está».
 */
const serverUp = await (async () => {
    try {
        await fetch(`${API_URL}/sales?limit=1`, { method: 'GET' });
        return true;
    } catch {
        return false;
    }
})();

if (!serverUp) {
    console.warn(
        `[integración] El dashboard no responde en ${API_URL}. Se saltea la prueba.\n` +
            '             Levantalo con: cd lasmunecasderamon-dashboard && PORT=3000 pnpm dev'
    );
}

const goOffline = () => connectivity.handleNetworkState({ isConnected: false });
const goOnline = () =>
    connectivity.handleNetworkState({ isConnected: true, isInternetReachable: true });

describe.skipIf(!serverUp)('modo offline del cajero · contra el dashboard real', () => {
    let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;
    let mirror: MirrorRepository;
    let repository: OutboxRepository;
    let outbox: OutboxService;
    let token = '';
    let probeCounter = 0;

    beforeAll(async () => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(CAJERO),
        });

        const body = (await res.json()) as { token?: string };
        token = body.token ?? '';
        expect(token, 'el login del cajero tiene que devolver token').not.toBe('');

        // El mismo token que usaría la app: `apiClient` lo lee de memoria.
        setTokenInMemory(token);

        driver = createNodeSqliteMirrorDriver();
        ensureMirrorSchema(driver);
        mirror = createMirrorRepository(driver);
        setMirrorForTests(mirror);

        repository = createOutboxRepository(driver, {
            createId: () => `${RUN}${++probeCounter}`,
        });
        outbox = createOutboxService(repository);

        goOnline();
    });

    afterAll(() => {
        outbox?.clear();
        setMirrorForTests(null);
        driver?.close();
    });

    it('aplica el esquema del espejo con SQL real', () => {
        const aplicadas = driver.getAll<{ version: number }>(
            'SELECT version FROM mirror_schema_migrations ORDER BY version ASC'
        );

        expect(aplicadas.map(row => Number(row.version))).toEqual([1, 2]);
        expect(MIRROR_SCHEMA_VERSION).toBe(2);
    });

    describe('espejo de lectura (solo lecturas al servidor real)', () => {
        const claves = [
            {
                nombre: 'cuentas abiertas',
                key: () => MIRROR_KEYS.openAccounts,
                endpoint: () => `/cuentas?limit=50&_t=${Date.now()}`,
                maxAgeMs: MIRROR_MAX_AGE_MS.dinero,
            },
            {
                nombre: 'listado de ventas',
                key: () => MIRROR_KEYS.salesList,
                endpoint: () => `/sales?limit=50&_t=${Date.now()}`,
                maxAgeMs: MIRROR_MAX_AGE_MS.dinero,
            },
            {
                nombre: 'estado de caja',
                key: () => MIRROR_KEYS.cashregisterStatus,
                endpoint: () => `/cashregister/status`,
                maxAgeMs: MIRROR_MAX_AGE_MS.dinero,
            },
        ];

        it.each(claves)(
            'espeja «$nombre» y lo sirve sin red sin tocar el servidor',
            async ({ key, endpoint, maxAgeMs }) => {
                const clave = key();

                // 1) Con red: el dato viene del servidor y queda espejado.
                const online = await mirror.readThroughDetailed<any>(
                    clave,
                    () => apiClientSafe(endpoint()),
                    { maxAgeMs }
                );

                expect(online.fromCache, 'con red no debe venir del espejo').toBe(false);
                expect(online.error).toBeNull();

                const guardado = mirror.get<any>(clave);
                expect(guardado, `«${clave}» tiene que quedar en SQLite`).not.toBeNull();
                expect(guardado!.data).toEqual(online.data);

                // 2) Sin red: sale del espejo. El fetcher lanza a propósito, así
                // que si el espejo no sirviera el test falla en vez de pasar por
                // una petición que no debería existir.
                goOffline();
                try {
                    const offline = await mirror.readThroughDetailed<any>(
                        clave,
                        () => {
                            throw new Error('no debería llamarse al servidor sin red');
                        },
                        { maxAgeMs }
                    );

                    expect(offline.fromCache).toBe(true);
                    expect(offline.syncedAt).toBe(online.syncedAt);
                    expect(offline.data).toEqual(online.data);
                } finally {
                    goOnline();
                }
            }
        );

        it('espeja el detalle de una cuenta real y lo sirve sin red', async () => {
            const listado = await apiClientSafe<{ id_cuenta?: string }[]>('/cuentas?limit=5');
            const cuenta = (listado.data as any[])?.[0];

            if (!cuenta?.id_cuenta) {
                // Sin cuentas abiertas en la base local no hay detalle que probar.
                console.warn('[integración] No hay cuentas abiertas: se omite el detalle.');
                return;
            }

            const clave = MIRROR_KEYS.accountDetail(cuenta.id_cuenta);
            const online = await mirror.readThroughDetailed<any>(
                clave,
                () => apiClientSafe(`/cuentas/${cuenta.id_cuenta}?_t=${Date.now()}`),
                { maxAgeMs: MIRROR_MAX_AGE_MS.dinero }
            );

            expect(online.fromCache).toBe(false);
            expect((online.data as any)?.id_cuenta).toBe(cuenta.id_cuenta);

            goOffline();
            try {
                const offline = await getMirror().readThroughDetailed<any>(
                    clave,
                    () => {
                        throw new Error('no debería llamarse al servidor sin red');
                    },
                    { maxAgeMs: MIRROR_MAX_AGE_MS.dinero }
                );

                expect(offline.fromCache).toBe(true);
                expect((offline.data as any)?.id_cuenta).toBe(cuenta.id_cuenta);
            } finally {
                goOnline();
            }
        });
    });

    describe('cola de intenciones', () => {
        let ventaIntent: OutboxIntent;
        let consumosIntent: OutboxIntent;
        let cobroIntent: OutboxIntent;

        it('sin red no manda nada y deja las intenciones guardadas', async () => {
            goOffline();

            const t0 = Date.now();
            ventaIntent = await outbox.enqueueAndSend({
                type: 'sale.create',
                payload: {
                    detalles: [],
                    metodo_pago: 'efectivo',
                    sub_total: 0,
                    total: 0,
                    propina: 0,
                },
                label: 'Sonda venta',
            });
            consumosIntent = await outbox.enqueueAndSend({
                type: 'account.consumptions',
                payload: {
                    id_cuenta: CUENTA_INEXISTENTE,
                    consumos: { detalles: [{ producto_id: 'p-1', cantidad: 1 }], usuarios: [] },
                },
                label: 'Sonda consumos',
            });
            // Cobro de cuenta al endpoint transaccional: misma cuenta inexistente,
            // para ver cómo reacciona el servidor nuevo sin tocar negocio.
            cobroIntent = await outbox.enqueueAndSend({
                type: 'account.checkout',
                payload: {
                    id_cuenta: CUENTA_INEXISTENTE,
                    metodo_pago: 'efectivo',
                    total_cobrado: 1000,
                    propina: 0,
                },
                label: 'Sonda cobro',
            });

            expect(ventaIntent.status).toBe('pendiente');
            expect(consumosIntent.status).toBe('pendiente');
            expect(cobroIntent.status).toBe('pendiente');
            expect(outbox.pendingCount()).toBe(3);

            // Selladas con la hora del dispositivo en el momento de la operación,
            // no con la hora de sincronización: sin esto la venta caería en otro
            // turno al sincronizar.
            const deviceDate = (ventaIntent.payload as any).device_date;
            expect(typeof deviceDate).toBe('string');
            expect(Math.abs(new Date(deviceDate).getTime() - t0)).toBeLessThan(5_000);

            // Quedaron en la base del dispositivo, no sólo en memoria.
            const enSqlite = driver.getAll<{ id: string }>('SELECT id FROM outbox ORDER BY created_at');
            expect(enSqlite.map(row => row.id)).toEqual([
                ventaIntent.id,
                consumosIntent.id,
                cobroIntent.id,
            ]);
        });

        it('al volver la red se drena sola y el servidor contesta de verdad', async () => {
            goOnline();
            const summary = await outbox.flush();

            expect(summary.skipped).toBe(false);

            const venta = repository.get(ventaIntent.id)!;
            const consumos = repository.get(consumosIntent.id)!;
            const cobro = repository.get(cobroIntent.id)!;

            // Las dos fueron rechazadas o falladas por el servidor (no son
            // operaciones válidas), y ninguna quedó pendiente: la cola no
            // reintenta lo que el servidor ya contestó.
            expect(venta.status).toBe('fallida');
            expect(venta.lastError).toContain('Al menos un detalle es requerido');

            // El motivo es el del servidor con la ruta de consumos sobre una
            // cuenta inexistente (hoy 500, ver informe); lo importante es que el
            // envío llegó, volvió con un motivo y no quedó reintentándose solo.
            expect(consumos.status).toBe('fallida');
            expect(consumos.lastError).toBeTruthy();

            // El cobro transaccional contesta 404 con el motivo concreto: la
            // intención queda en revisión y no se manda sola otra vez.
            expect(cobro.status).toBe('fallida');
            expect(cobro.lastError).toContain('no encontrado');

            expect(repository.listFlushable(6)).toHaveLength(0);

            // El sello del momento de la operación sobrevive al envío.
            expect((repository.get(ventaIntent.id)!.payload as any).device_date).toBe(
                (ventaIntent.payload as any).device_date
            );
        });

        it('la clave que viajó es la que el servidor usa para deduplicar', async () => {
            // Se repite la operación contra el servidor con la MISMA clave pero
            // con otro body. Si hubiera vuelto a ejecutar, la respuesta sería
            // distinta (otra validación, u otra venta). Es la prueba de que el
            // reintento no duplica: el servidor devuelve lo que ya tenía.
            const res = await fetch(`${API_URL}/sales`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`,
                    [IDEMPOTENCY_HEADER]: ventaIntent.id,
                },
                body: JSON.stringify({
                    detalles: [{ producto_id: 'p-1', cantidad: 1, precio: 1, sub_total: 1 }],
                    metodo_pago: 'metodo-que-no-existe',
                    sub_total: 1,
                    total: 1,
                    propina: 0,
                }),
            });

            expect(res.status).toBe(400);
            expect(res.headers.get('x-idempotent-replay')).toBe('1');

            const body = (await res.json()) as any;

            // El body de ESTE envío sí trae un detalle y un método de pago
            // inexistente. Si el servidor hubiera vuelto a ejecutar, no podría
            // seguir quejándose de `detalles`: que lo haga es la prueba de que
            // replicó lo que ya tenía guardado.
            expect(body.error?.code).toBe('VALIDATION_ERROR');
            expect(body.error?.details?.[0]?.path).toEqual(['detalles']);
            expect(body.message).toBe('Error de validación');

            // Y el motivo registrado en la intención es exactamente el que el
            // servidor acaba de replicar: la app y el servidor coinciden en qué
            // pasó, sin haber ejecutado nada de nuevo.
            expect(repository.get(ventaIntent.id)!.lastError).toBe(body.error.message);
        });

        it('no re-ejecuta una operación que quedó sin resolver', async () => {
            const res = await fetch(`${API_URL}/cuentas/${CUENTA_INEXISTENTE}`, {
                method: 'PUT',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`,
                    [IDEMPOTENCY_HEADER]: consumosIntent.id,
                },
                body: JSON.stringify({ detalles: [], usuarios: [] }),
            });

            // 409: puede haber aplicado, así que reintentar en automático es
            // justo lo que duplicaría. Queda para revisión.
            expect(res.status).toBe(409);
            const body = (await res.json()) as { code?: string };
            expect(body.code).toBe('IDEMPOTENCY_FALLIDA');
        });

        it('tampoco re-ejecuta un cobro que quedó sin resolver', async () => {
            const res = await fetch(
                `${API_URL}/cuentas/${CUENTA_INEXISTENTE}/cobrar-con-venta`,
                {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        authorization: `Bearer ${token}`,
                        [IDEMPOTENCY_HEADER]: cobroIntent.id,
                    },
                    body: JSON.stringify({ metodo_pago: 'efectivo', total_cobrado: 1000 }),
                }
            );

            // El primer envío devolvió 404 (cuenta inexistente) y quedó
            // registrado: el reintento devuelve el 409 de revisión en vez de
            // volver a ejecutar el cobro.
            expect(res.status).toBe(409);
            const body = (await res.json()) as { code?: string };
            expect(body.code).toBe('IDEMPOTENCY_FALLIDA');
        });

        it('no vuelve a enviar lo ya resuelto', async () => {
            const antes = repository.list().length;
            await outbox.flush();

            expect(repository.list()).toHaveLength(antes);
            expect(repository.listFlushable(6)).toHaveLength(0);
        });
    });

    // Las claves de esta corrida quedan registradas en `sync_operations` del
    // dashboard; se identifican por el prefijo `probe-integracion-` y se borran
    // con el comando que está en tests/integration/README.md.
    it('identifica las sondas que hay que limpiar en el servidor', () => {
        const ids = repository.list().map(intent => intent.id);

        expect(ids.every(id => id.startsWith(RUN))).toBe(true);
        console.warn(`[integración] Limpiar en el dashboard: ${RUN}*`);
    });
});
