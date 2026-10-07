import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { attachHttpDetails, NetworkError, TimeoutError, UnauthorizedError } from '@/api/errors';
import { ensureMirrorSchema } from '@/services/mirror/schema';
import { createOutboxRepository, type OutboxRepository } from '@/services/outbox/repository';
import {
    createOutboxService,
    describeIntentError,
    isRetryableError,
    MAX_OUTBOX_ATTEMPTS,
    orderFlushable,
} from '@/services/outbox/service';
import type { OutboxIntent } from '@/services/outbox/types';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';

const NOW = 1_700_000_000_000;

const PEDIDO = { codigo: 'ABC12345', meseroId: 'u-1', total: 5000 };

describe('isRetryableError', () => {
    it('debe reintentar los fallos de red y de tiempo', () => {
        expect(isRetryableError(new NetworkError())).toBe(true);
        expect(isRetryableError(new TimeoutError())).toBe(true);
        expect(isRetryableError(new Error('Network request failed'))).toBe(true);
        expect(isRetryableError(new Error('The operation was aborted'))).toBe(true);
    });

    it('no debe reintentar los errores del servidor', () => {
        expect(isRetryableError(new Error('Código es requerido'))).toBe(false);
        expect(isRetryableError(new Error('Permisos insuficientes'))).toBe(false);
    });

    it('no debe reintentar automáticamente una sesión inválida', () => {
        expect(isRetryableError(new UnauthorizedError('Sesión expirada'))).toBe(false);
    });

    it('no debe reintentar nada que el servidor haya contestado, ni un 5xx', () => {
        // El dashboard ya guardó el intento con su clave: reintentar sola no
        // ejecutaría nada (contesta 409) y taparía el motivo real.
        const error500 = attachHttpDetails(new Error('Error interno del servidor'), {
            status: 500,
            body: null,
        });
        const error400 = attachHttpDetails(new Error('Error de validación'), {
            status: 400,
            body: { message: 'Error de validación' },
        });

        expect(isRetryableError(error500)).toBe(false);
        expect(isRetryableError(error400)).toBe(false);
    });
});

describe('describeIntentError', () => {
    it('debe preferir el motivo concreto del cuerpo al genérico del sobre', () => {
        const error = attachHttpDetails(new Error('Error de validación'), {
            status: 400,
            body: {
                success: false,
                message: 'Error de validación',
                error: { code: 'VALIDATION_ERROR', message: 'Al menos un detalle es requerido' },
            },
        });

        expect(describeIntentError(error)).toBe('Al menos un detalle es requerido');
    });

    it('debe caer al mensaje del sobre si el cuerpo no trae uno más preciso', () => {
        const error = attachHttpDetails(new Error('Error interno del servidor'), {
            status: 500,
            body: { success: false, message: 'La caja está cerrada' },
        });

        expect(describeIntentError(error)).toBe('La caja está cerrada');
    });

    it('debe usar el mensaje del error cuando no hay respuesta del servidor', () => {
        expect(describeIntentError(new NetworkError('sin red'))).toBe('sin red');
        expect(describeIntentError('texto suelto')).toBe('texto suelto');
    });

    it('debe ignorar cuerpos que no son objetos', () => {
        const error = attachHttpDetails(new Error('Error 502'), {
            status: 502,
            body: '<html>Bad Gateway</html>',
        });

        expect(describeIntentError(error)).toBe('Error 502');
    });
});

describe('outbox · repositorio', () => {
    let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;
    let outbox: OutboxRepository;
    let clock: number;

    beforeEach(() => {
        driver = createNodeSqliteMirrorDriver();
        ensureMirrorSchema(driver, () => NOW);
        clock = NOW;
        outbox = createOutboxRepository(driver, { now: () => clock, createId: () => 'intent-1' });
    });

    afterEach(() => {
        driver.close();
    });

    it('la migración 2 debe crear la tabla de la cola', () => {
        const tablas = driver
            .getAll<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
            .map(row => row.name);

        expect(tablas).toContain('outbox');
    });

    it('debe encolar una intención pendiente con su etiqueta', () => {
        const intent = outbox.enqueue({ type: 'order.create', payload: PEDIDO, label: 'Pedido ABC12345' });

        expect(intent.id).toBe('intent-1');
        expect(intent.status).toBe('pendiente');
        expect(intent.attempts).toBe(0);
        expect(intent).toMatchObject({ label: 'Pedido ABC12345', createdAt: NOW, updatedAt: NOW });

        expect(outbox.get('intent-1')).toEqual(intent);
        expect(outbox.get('no-existe')).toBeNull();
    });

    it('debe generar un id distinto cuando no se inyecta uno', () => {
        const repo = createOutboxRepository(driver, { now: () => NOW });
        const a = repo.enqueue({ type: 'order.create', payload: PEDIDO });
        const b = repo.enqueue({ type: 'order.create', payload: PEDIDO });

        expect(a.id).not.toBe(b.id);
    });

    it('debe listar en orden de creación', () => {
        let i = 0;
        const repo = createOutboxRepository(driver, { now: () => NOW, createId: () => `id-${++i}` });

        repo.enqueue({ type: 'order.create', payload: PEDIDO });
        repo.enqueue({ type: 'order.create', payload: PEDIDO });
        repo.enqueue({ type: 'order.create', payload: PEDIDO });

        expect(repo.list().map(intent => intent.id)).toEqual(['id-1', 'id-2', 'id-3']);
    });

    it('markSending debe marcar en vuelo y contar el intento', () => {
        outbox.enqueue({ type: 'order.create', payload: PEDIDO });
        outbox.markSending('intent-1');

        const intent = outbox.get('intent-1');
        expect(intent?.status).toBe('enviando');
        expect(intent?.attempts).toBe(1);
    });

    it('markApplied debe guardar la respuesta y la fecha', () => {
        outbox.enqueue({ type: 'order.create', payload: PEDIDO });
        clock = NOW + 1_000;
        outbox.markApplied('intent-1', { success: true, pedido: { id: 'p-1' } });

        const intent = outbox.get('intent-1');
        expect(intent).toMatchObject({ status: 'aplicada', appliedAt: NOW + 1_000, lastError: null });
        expect(intent?.response).toEqual({ success: true, pedido: { id: 'p-1' } });
    });

    it('markFailed debe dejar el error a la vista', () => {
        outbox.enqueue({ type: 'order.create', payload: PEDIDO });
        outbox.markFailed('intent-1', 'Código es requerido');

        expect(outbox.get('intent-1')).toMatchObject({
            status: 'fallida',
            lastError: 'Código es requerido',
        });
    });

    it('markRetryable debe volver a pendiente sin perder el intento contado', () => {
        outbox.enqueue({ type: 'order.create', payload: PEDIDO });
        outbox.markSending('intent-1');
        outbox.markRetryable('intent-1', 'Network request failed');

        expect(outbox.get('intent-1')).toMatchObject({
            status: 'pendiente',
            attempts: 1,
            lastError: 'Network request failed',
        });
    });

    it('retry debe reiniciar intentos y error para un reintento manual', () => {
        outbox.enqueue({ type: 'order.create', payload: PEDIDO });
        outbox.markSending('intent-1');
        outbox.markFailed('intent-1', 'Código es requerido');
        outbox.retry('intent-1');

        expect(outbox.get('intent-1')).toMatchObject({
            status: 'pendiente',
            attempts: 0,
            lastError: null,
        });
    });

    it('listFlushable debe tomar solo pendientes por debajo del tope', () => {
        outbox.enqueue({ type: 'order.create', payload: PEDIDO });
        outbox.markFailed('intent-1', 'error de negocio');

        const ids = ['id-a', 'id-b'];
        let i = 0;
        const repo = createOutboxRepository(driver, { now: () => NOW, createId: () => ids[i++] });
        repo.enqueue({ type: 'order.create', payload: PEDIDO });
        repo.markSending('id-a');
        repo.markSending('id-a');
        repo.markSending('id-a');
        repo.markRetryable('id-a', 'timeout');

        expect(repo.listFlushable(3).map(intent => intent.id)).toEqual([]);
        expect(repo.listFlushable(4).map(intent => intent.id)).toEqual(['id-a']);
    });

    it('debe contar solo lo que sigue sin resolver', () => {
        outbox.enqueue({ type: 'order.create', payload: PEDIDO });
        expect(outbox.countUnresolved()).toBe(1);

        outbox.markApplied('intent-1', { success: true });
        expect(outbox.countUnresolved()).toBe(0);
        expect(outbox.listUnresolved()).toEqual([]);
    });

    it('debe descartar y vaciar la cola', () => {
        let i = 0;
        const repo = createOutboxRepository(driver, { now: () => NOW, createId: () => `id-${++i}` });
        repo.enqueue({ type: 'order.create', payload: PEDIDO });
        repo.enqueue({ type: 'order.create', payload: PEDIDO });

        repo.remove('id-1');
        expect(repo.list().map(intent => intent.id)).toEqual(['id-2']);

        repo.clear();
        expect(repo.list()).toEqual([]);
    });

    it('no debe romperse con un payload ilegible', () => {
        outbox.enqueue({ type: 'order.create', payload: PEDIDO });
        driver.run('UPDATE outbox SET payload = ? WHERE id = ?', ['{roto', 'intent-1']);

        expect(outbox.get('intent-1')?.payload).toBeNull();
    });
});

/**
 * Driver que no guarda nada: así se comporta la app en web, donde no hay
 * SQLite (ver `services/mirror/driver.web.ts`).
 */
const SIN_ALMACEN = {
    exec: () => {},
    run: () => {},
    getFirst: <T,>() => null as T | null,
    getAll: <T,>() => [] as T[],
    transaction: (task: () => void) => task(),
};

describe('outbox · dispositivo sin almacén local (web)', () => {
    let online: boolean;
    let senders: Record<string, (intent: OutboxIntent) => Promise<unknown>>;

    const buildService = () =>
        createOutboxService(createOutboxRepository(SIN_ALMACEN, { now: () => NOW }), {
            isOffline: () => !online,
            senders: senders as never,
        });

    beforeEach(() => {
        online = true;
        senders = { 'order.create': vi.fn().mockResolvedValue({ success: true }) };
    });

    it('debe enviar directo cuando el almacén no puede guardar la intención', async () => {
        const outbox = buildService();

        const intent = await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(senders['order.create']).toHaveBeenCalledTimes(1);
        expect(intent.status).toBe('aplicada');
        expect(outbox.pendingCount()).toBe(0);
    });

    it('no debe prometer que saldrá luego si no hay red ni almacén', async () => {
        online = false;
        const outbox = buildService();

        const intent = await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(senders['order.create']).not.toHaveBeenCalled();
        expect(intent.status).toBe('fallida');
        expect(intent.lastError).toContain('sin conexión');
    });

    it('debe reportar el motivo del servidor si el envío directo falla', async () => {
        senders['order.create'] = vi.fn().mockRejectedValue(new Error('Código es requerido'));
        const outbox = buildService();

        const intent = await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(intent.status).toBe('fallida');
        expect(intent.lastError).toBe('Código es requerido');
    });

    it('debe intentar el envío directo cuando la conectividad no está confirmada', async () => {
        // Arranque (`unknown`): no se sabe si hay red, así que se intenta. Solo
        // el offline confirmado justifica descartar la operación.
        const outbox = createOutboxService(createOutboxRepository(SIN_ALMACEN, { now: () => NOW }), {
            isOffline: () => false,
            senders: senders as never,
        });

        const intent = await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(senders['order.create']).toHaveBeenCalledTimes(1);
        expect(intent.status).toBe('aplicada');
    });
});

describe('outbox · servicio', () => {
    let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;
    let repository: OutboxRepository;
    let online: boolean;
    let senders: Record<string, (intent: OutboxIntent) => Promise<unknown>>;

    const buildService = (options: { maxAttempts?: number } = {}) =>
        createOutboxService(repository, {
            isOffline: () => !online,
            senders: senders as never,
            maxAttempts: options.maxAttempts,
        });

    beforeEach(() => {
        driver = createNodeSqliteMirrorDriver();
        ensureMirrorSchema(driver, () => NOW);
        online = true;
        let i = 0;
        repository = createOutboxRepository(driver, { now: () => NOW, createId: () => `id-${++i}` });
        senders = { 'order.create': vi.fn().mockResolvedValue({ success: true }) };
    });

    afterEach(() => {
        driver.close();
    });

    it('no debe enviar nada sin red', async () => {
        online = false;
        const outbox = buildService();

        const intent = await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(intent.status).toBe('pendiente');
        expect(senders['order.create']).not.toHaveBeenCalled();
        expect(await outbox.flush()).toEqual({ skipped: true, sent: 0, pending: 0, failed: 0 });
    });

    it('debe enviar en orden y marcar aplicada cada intención', async () => {
        const outbox = buildService();

        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });
        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(senders['order.create']).toHaveBeenCalledTimes(2);
        expect(outbox.listUnresolved()).toEqual([]);
        expect(outbox.pendingCount()).toBe(0);
        expect(repository.list().map(intent => intent.status)).toEqual(['aplicada', 'aplicada']);
    });

    it('debe enviar la intención con su id como clave de idempotencia', async () => {
        senders['order.create'] = vi.fn(async (intent: OutboxIntent) => {
            expect(intent.id).toBe('id-1');
            return { success: true };
        });
        const outbox = buildService();

        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO, label: 'Pedido ABC12345' });

        expect(senders['order.create']).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'id-1',
                // El payload se sella con la hora del dispositivo al encolar (ver
                // `stampDeviceDate`): el resto de los campos va intacto.
                payload: expect.objectContaining(PEDIDO),
                label: 'Pedido ABC12345',
            })
        );
    });

    it('debe dejar pendiente con el error cuando el fallo es de red', async () => {
        senders['order.create'] = vi.fn().mockRejectedValue(new NetworkError());
        const outbox = buildService();

        const intent = await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(intent.status).toBe('pendiente');
        expect(intent.attempts).toBe(1);
        expect(intent.lastError).toBeTruthy();
        expect(outbox.pendingCount()).toBe(1);
    });

    it('debe reintentar solo la intención cuando el fallo fue transitorio', async () => {
        senders['order.create'] = vi
            .fn()
            .mockRejectedValueOnce(new TimeoutError())
            .mockResolvedValueOnce({ success: true });
        const outbox = buildService();

        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });
        const summary = await outbox.flush();

        expect(summary).toEqual({ skipped: false, sent: 1, pending: 0, failed: 0 });
        expect(repository.get('id-1')?.status).toBe('aplicada');
    });

    it('debe marcar fallida y no reintentar sola una intención rechazada', async () => {
        senders['order.create'] = vi.fn().mockRejectedValue(new Error('Código es requerido'));
        const outbox = buildService();

        const intent = await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(intent.status).toBe('fallida');
        expect(intent.lastError).toBe('Código es requerido');

        await outbox.flush();
        expect(senders['order.create']).toHaveBeenCalledTimes(1);
    });

    it('debe rendirse tras el tope de intentos y pedir revisión', async () => {
        senders['order.create'] = vi.fn().mockRejectedValue(new NetworkError());
        const outbox = buildService({ maxAttempts: 2 });

        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });
        await outbox.flush();

        expect(repository.get('id-1')).toMatchObject({ status: 'fallida', attempts: 2 });
    });

    it('debe permitir reintentar a mano una intención fallida', async () => {
        senders['order.create'] = vi
            .fn()
            .mockRejectedValueOnce(new Error('Permisos insuficientes'))
            .mockResolvedValueOnce({ success: true });
        const outbox = buildService();

        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });
        const intent = await outbox.retry('id-1');

        expect(intent?.status).toBe('aplicada');
        expect(outbox.pendingCount()).toBe(0);
    });

    it('debe marcar fallida una intención de tipo desconocido', async () => {
        const outbox = buildService();
        const intent = await outbox.enqueueAndSend({
            type: 'otro.tipo' as never,
            payload: PEDIDO,
        });

        expect(intent.status).toBe('fallida');
        expect(intent.lastError).toContain('desconocido');
    });

    it('debe descartar una intención sin enviarla', async () => {
        online = false;
        const outbox = buildService();
        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        outbox.discard('id-1');

        expect(outbox.listUnresolved()).toEqual([]);
        expect(outbox.pendingCount()).toBe(0);
    });

    it('debe avisar a los suscriptores en cada cambio de la cola', async () => {
        const outbox = buildService();
        const listener = vi.fn();
        outbox.subscribe(listener);

        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(listener).toHaveBeenCalled();
    });

    it('no debe solapar dos flush simultáneos', async () => {
        const outbox = buildService();
        online = false;
        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });
        online = true;

        const [a, b] = await Promise.all([outbox.flush(), outbox.flush()]);

        expect([a.skipped, b.skipped].filter(Boolean)).toHaveLength(1);
        expect(senders['order.create']).toHaveBeenCalledTimes(1);
    });

    it('debe exponer el tope de intentos por defecto', () => {
        expect(MAX_OUTBOX_ATTEMPTS).toBeGreaterThan(1);
    });

    it('debe mantener la misma referencia del snapshot mientras nada cambie', async () => {
        const outbox = buildService();
        const primero = outbox.getSnapshot();

        expect(outbox.getSnapshot()).toBe(primero);

        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(outbox.getSnapshot()).not.toBe(primero);
        expect(outbox.getSnapshot()).toEqual(outbox.getSnapshot());
    });

    it('debe mostrar en el snapshot lo que sigue sin enviar', async () => {
        online = false;
        const outbox = buildService();
        await outbox.enqueueAndSend({ type: 'order.create', payload: PEDIDO });

        expect(outbox.getSnapshot().map(intent => intent.id)).toEqual(['id-1']);
        expect(outbox.pendingCount()).toBe(1);
    });
});

describe('orderFlushable', () => {
    const intent = (overrides: Partial<OutboxIntent> & { id: string }): OutboxIntent => ({
        type: 'order.create',
        payload: {},
        label: '',
        createdAt: NOW,
        updatedAt: NOW,
        status: 'pendiente',
        attempts: 0,
        lastError: null,
        appliedAt: null,
        response: null,
        ...overrides,
    });

    it('pone los consumos antes que el cobro de la misma cuenta', () => {
        const checkout = intent({
            id: 'checkout', type: 'account.checkout',
            payload: { id_cuenta: 7 }, createdAt: NOW,
        });
        const consumos = intent({
            id: 'consumos', type: 'account.consumptions',
            payload: { id_cuenta: 7, consumos: {} }, createdAt: NOW + 1,
        });

        expect(orderFlushable([checkout, consumos]).map(i => i.id)).toEqual(['consumos', 'checkout']);
    });

    it('conserva el FIFO entre cuentas distintas', () => {
        const a = intent({ id: 'a', type: 'account.checkout', payload: { id_cuenta: 1 }, createdAt: NOW });
        const b = intent({ id: 'b', type: 'account.consumptions', payload: { id_cuenta: 2, consumos: {} }, createdAt: NOW + 1 });

        expect(orderFlushable([a, b]).map(i => i.id)).toEqual(['a', 'b']);
    });
});
