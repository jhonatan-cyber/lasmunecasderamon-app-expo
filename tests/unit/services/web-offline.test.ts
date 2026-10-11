import { expect, it } from 'vitest';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import { createPersistentWebDriver } from '@/services/mirror/persistentWebDriver';
import { ensureMirrorSchema } from '@/services/mirror/schema';
import { createOutboxRepository } from '@/services/outbox/repository';

it('conserva operaciones en web al recargar el almacén', async () => {
    const SQL = await initSqlJs();
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const first = createPersistentWebDriver(SQL, storage, 'db');
    ensureMirrorSchema(first);
    const repository = createOutboxRepository(first, { ownerId: () => 'a' });
    const original = repository.enqueue({ type: 'sale.create', payload: { total: 100 } });
    const reloaded = createPersistentWebDriver(SQL, storage, 'db');
    expect(createOutboxRepository(reloaded, { ownerId: () => 'a' }).get(original.id)?.payload).toEqual({ total: 100 });
    expect(createOutboxRepository(reloaded, { ownerId: () => 'b' }).list()).toEqual([]);
});

it('revierte la escritura si se agota la cuota y conserva lo guardado antes', async () => {
    const SQL = await initSqlJs();
    let persisted: string | null = null;
    let full = false;
    const storage = { getItem: () => persisted, setItem: (_key: string, value: string) => {
        if (full) throw new Error('QuotaExceededError'); persisted = value;
    } };
    const driver = createPersistentWebDriver(SQL, storage, 'db');
    ensureMirrorSchema(driver);
    const repository = createOutboxRepository(driver);
    repository.enqueue({ type: 'sale.create', payload: { total: 100 } }, 'original');
    full = true;
    expect(() => repository.enqueue({ type: 'sale.create', payload: {} }, 'no-guardado')).toThrow(/Quota/);
    expect(repository.get('no-guardado')).toBeNull();
    expect(repository.get('original')).not.toBeNull();
    expect(createOutboxRepository(createPersistentWebDriver(SQL, storage, 'db')).list()).toHaveLength(1);
});
