import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NetworkError } from '@/api/errors';
import { ensureMirrorSchema, MIRROR_MIGRATIONS } from '@/services/mirror/schema';
import { createOutboxRepository } from '@/services/outbox/repository';
import { createOutboxService } from '@/services/outbox/service';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';
import { createMirrorRepository } from '@/services/mirror/repository';

let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;
beforeEach(() => { driver = createNodeSqliteMirrorDriver(); ensureMirrorSchema(driver); });
afterEach(() => { driver.close(); vi.useRealTimers(); });

it('aísla también los datos cacheados y no guarda una respuesta con otra sesión', async () => {
    let owner: string | null = 'a';
    const mirror = createMirrorRepository(driver, { ownerId: () => owner });
    mirror.put('ventas', { total: 100 });
    owner = 'b';
    expect(mirror.get('ventas')).toBeNull();
    await expect(mirror.readThrough('ventas', async () => {
        owner = 'a'; return { total: 200 };
    })).rejects.toThrow(/sesión/);
    expect(mirror.get('ventas')?.data).toEqual({ total: 100 });
    owner = null;
    expect(mirror.get('ventas')).toBeNull();
});

it('concilia un cierre inesperado incluso en el último intento permitido', async () => {
    const repository = createOutboxRepository(driver);
    const original = repository.enqueue({ type: 'sale.create', payload: {} });
    repository.markSending(original.id);
    const sender = vi.fn();
    const outbox = createOutboxService(repository, {
        maxAttempts: 1, reconcile: async () => ({ state: 'aplicada', response: { success: true } }),
        senders: { 'sale.create': sender },
    });
    await outbox.flush();
    // Conciliada como aplicada: se borra de SQLite en el mismo flush.
    expect(repository.get(original.id)).toBeNull();
    expect(sender).not.toHaveBeenCalled();
});

it('aísla la lectura, el envío y el descarte por usuario y conserva las filas anteriores', async () => {
    let owner: string | null = 'a';
    const repository = createOutboxRepository(driver, { ownerId: () => owner });
    const sender = vi.fn().mockResolvedValue({ success: true });
    const outbox = createOutboxService(repository, { ownerId: () => owner, senders: { 'sale.create': sender } });
    const original = outbox.enqueue({ type: 'sale.create', payload: { total: 100 } });
    expect(outbox.pendingCount()).toBe(1);
    owner = 'b';
    expect(outbox.pendingCount()).toBe(0);
    outbox.discard(original.id);
    await outbox.flush();
    expect(sender).not.toHaveBeenCalled();
    owner = 'a';
    expect(repository.get(original.id)?.ownerId).toBe('a');
    await outbox.flush();
    expect(sender).toHaveBeenCalledTimes(1);
    owner = null;
    expect(() => outbox.enqueue({ type: 'sale.create', payload: {} })).toThrow(/sesión/);
    expect((await outbox.enqueueAndSend({ type: 'sale.create', payload: {} })).status).toBe('fallida');
    expect(sender).toHaveBeenCalledTimes(1);
});

it('migra sin atribuir pendientes antiguos a la persona que inicia sesión', () => {
    const legacy = createNodeSqliteMirrorDriver();
    try {
        MIRROR_MIGRATIONS.slice(0, 2).forEach(m => m.statements.forEach(sql => legacy.exec(sql)));
        legacy.exec('CREATE TABLE mirror_schema_migrations (version INTEGER PRIMARY KEY, name TEXT, applied_at INTEGER)');
        legacy.run('INSERT INTO mirror_schema_migrations VALUES (1, ?, 0)', ['cache']);
        legacy.run('INSERT INTO mirror_schema_migrations VALUES (2, ?, 0)', ['outbox']);
        legacy.run("INSERT INTO outbox (id,type,payload,created_at,updated_at) VALUES ('legacy','sale.create','{}',0,0)");
        ensureMirrorSchema(legacy);
        const scoped = createOutboxRepository(legacy, { ownerId: () => 'nuevo' });
        expect(scoped.listUnresolved()).toEqual([]);
        expect(legacy.getFirst<{ total: number }>('SELECT COUNT(*) AS total FROM outbox')?.total).toBe(1);
    } finally { legacy.close(); }
});

it('detiene el lote si la sesión cambia durante un envío', async () => {
    let owner = 'a';
    const repository = createOutboxRepository(driver, { ownerId: () => owner });
    const sender = vi.fn().mockImplementation(async () => { owner = 'b'; return { success: true }; });
    const outbox = createOutboxService(repository, { ownerId: () => owner, senders: { 'sale.create': sender } });
    outbox.enqueue({ type: 'sale.create', payload: {} });
    outbox.enqueue({ type: 'sale.create', payload: {} });
    await outbox.flush();
    expect(sender).toHaveBeenCalledTimes(1);
    owner = 'a';
    expect(repository.listUnresolved().map(row => row.status)).toContain('enviando');
});

it('no cobra una cuenta si un consumo falló, pero permite otras cuentas', async () => {
    const repository = createOutboxRepository(driver);
    const consumption = vi.fn().mockRejectedValue(new Error('Producto inválido'));
    const checkout = vi.fn().mockResolvedValue({ success: true });
    const outbox = createOutboxService(repository, { senders: { 'account.consumptions': consumption, 'account.checkout': checkout } });
    outbox.enqueue({ type: 'account.checkout', payload: { id_cuenta: 1 } });
    outbox.enqueue({ type: 'account.consumptions', payload: { id_cuenta: 1, consumos: {} } });
    outbox.enqueue({ type: 'account.checkout', payload: { id_cuenta: 2 } });
    await outbox.flush();
    expect(checkout).toHaveBeenCalledTimes(1);
    expect(checkout.mock.calls[0][0].payload.id_cuenta).toBe(2);
    expect(repository.listUnresolved()).toHaveLength(2);
});

it('concilia una operación aplicada tras perder la respuesta, sin reenviarla', async () => {
    const repository = createOutboxRepository(driver);
    const original = repository.enqueue({ type: 'sale.create', payload: {} });
    repository.markSending(original.id);
    const sender = vi.fn();
    const outbox = createOutboxService(repository, {
        reconcile: async () => ({ state: 'aplicada', response: { success: true, data: { id: 77 } } }),
        senders: { 'sale.create': sender },
    });
    await outbox.flush();
    expect(sender).not.toHaveBeenCalled();
    // El servidor ya la tenía: se confirma y se borra, sin reenviarla.
    expect(repository.get(original.id)).toBeNull();
});

it('una conciliación inaccesible o dudosa no repite la escritura', async () => {
    const repository = createOutboxRepository(driver);
    const original = repository.enqueue({ type: 'sale.create', payload: {} });
    const sender = vi.fn();
    const outbox = createOutboxService(repository, {
        reconcile: async () => { throw new NetworkError(); }, senders: { 'sale.create': sender },
    });
    await outbox.flush();
    expect(sender).not.toHaveBeenCalled();
    expect(repository.get(original.id)?.status).toBe('pendiente');
});

it('espera automáticamente entre reintentos y conserva la misma clave', async () => {
    vi.useFakeTimers();
    const repository = createOutboxRepository(driver);
    const sender = vi.fn().mockRejectedValueOnce(new NetworkError()).mockResolvedValue({ success: true });
    const outbox = createOutboxService(repository, { scheduleRetries: true, senders: { 'sale.create': sender } });
    try {
        const original = await outbox.enqueueAndSend({ type: 'sale.create', payload: {} });
        expect(original.status).toBe('pendiente');
        await vi.advanceTimersByTimeAsync(1999);
        expect(sender).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(sender).toHaveBeenCalledTimes(2);
        expect(sender.mock.calls[1][0].id).toBe(original.id);
        // Confirmada en el reintento automático: la fila ya no está.
        expect(repository.get(original.id)).toBeNull();
    } finally { outbox.stop(); }
});
