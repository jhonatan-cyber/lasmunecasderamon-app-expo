import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureMirrorSchema } from '@/services/mirror/schema';
import { createOutboxRepository } from '@/services/outbox/repository';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';

/**
 * Arranque de la cola: el salto de la red a `online` y la vuelta al primer
 * plano deben drenar solos lo que quedó guardado, sin que nadie pulse nada.
 * Los dos disparadores viven en `initOutbox`; acá se ejercitan con el monitor
 * de conectividad y el `AppState` sustituidos.
 */
const red = vi.hoisted(() => ({
    listeners: [] as Array<(state: string) => void>,
    subscribe: vi.fn((listener: (state: string) => void) => {
        red.listeners.push(listener);
        return () => {};
    }),
    isOffline: vi.fn(() => false),
}));

vi.mock('@/services/connectivity', () => ({ connectivity: red }));

const appState = vi.hoisted(() => ({
    handlers: [] as Array<(state: string) => void>,
}));

vi.mock('react-native', () => ({
    AppState: {
        addEventListener: vi.fn((_event: string, handler: (state: string) => void) => {
            appState.handlers.push(handler);
            return { remove: vi.fn() };
        }),
    },
}));

const auth = vi.hoisted(() => ({
    state: { user: { id: 'u-garzon' }, sessionExpired: false, token: 'token' },
}));

vi.mock('@/store/authStore', () => ({
    useAuthStore: {
        getState: () => auth.state,
        subscribe: vi.fn(() => () => {}),
    },
}));

const cliente = vi.hoisted(() => ({ apiClientSafe: vi.fn() }));

vi.mock('@/api/client', () => ({ apiClientSafe: cliente.apiClientSafe }));

/** La cola abre el mismo SQLite que el espejo: acá se sustituye por el real de node. */
const mirror = vi.hoisted(() => ({ driver: null as unknown }));

vi.mock('@/services/mirror', () => ({
    getMirrorDriver: () => mirror.driver,
    initMirror: () => 0,
}));

const ENVIOS_ORDEN = () =>
    cliente.apiClientSafe.mock.calls.filter(call => String(call[0]) === '/orders').length;

/**
 * `initOutbox` arranca una sola vez por proceso, así que cada prueba reimporta
 * el módulo con el registro limpio para poder ejercitar el arranque de nuevo.
 */
const arrancarCola = async () => {
    const { initOutbox } = await import('@/services/outbox');
    initOutbox();
};

describe('outbox · arranque', () => {
    let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;
    let repository: ReturnType<typeof createOutboxRepository>;

    beforeEach(() => {
        vi.resetModules();
        red.listeners.length = 0;
        appState.handlers.length = 0;
        driver = createNodeSqliteMirrorDriver();
        mirror.driver = driver;
        ensureMirrorSchema(driver, () => 1_700_000_000_000);
        repository = createOutboxRepository(driver, { ownerId: () => 'u-garzon' });
        cliente.apiClientSafe.mockReset();
        cliente.apiClientSafe.mockImplementation(async (url: string) =>
            String(url).startsWith('/sync-operations')
                ? { success: true, data: { state: 'not_found' } }
                : { success: true }
        );
    });

    afterEach(() => {
        driver.close();
    });

    const encolarPendiente = () =>
        repository.enqueue({ type: 'order.create', payload: { codigo: 'ABC12345' } });

    const emitirRed = (estado: string) => red.listeners.forEach(listener => listener(estado));
    const emitirAppState = (estado: string) => appState.handlers.forEach(handler => handler(estado));

    it('drena sola al recuperar la red y al volver al primer plano', async () => {
        encolarPendiente();

        await arrancarCola();

        // Al arrancar ya intenta vaciar lo que quedó de la sesión anterior.
        await vi.waitFor(() => expect(ENVIOS_ORDEN()).toBe(1));
        expect(repository.list()).toEqual([]);

        // Recuperar la red es el disparador de la sincronización automática.
        encolarPendiente();
        emitirRed('offline');
        expect(ENVIOS_ORDEN()).toBe(1);
        emitirRed('online');
        await vi.waitFor(() => expect(ENVIOS_ORDEN()).toBe(2));
        expect(repository.list()).toEqual([]);

        // Volver a la app después de un rato en segundo plano también drena.
        encolarPendiente();
        emitirAppState('active');
        await vi.waitFor(() => expect(ENVIOS_ORDEN()).toBe(3));
        expect(repository.list()).toEqual([]);
    });

    it('envía con la clave de la intención para no duplicar al reintentar', async () => {
        const intent = encolarPendiente();

        await arrancarCola();

        await vi.waitFor(() => expect(ENVIOS_ORDEN()).toBe(1));
        const envio = cliente.apiClientSafe.mock.calls.find(call => String(call[0]) === '/orders');
        expect(envio?.[1]).toMatchObject({ headers: { 'x-idempotency-key': intent.id } });
    });
});
