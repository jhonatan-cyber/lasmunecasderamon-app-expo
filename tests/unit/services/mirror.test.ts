import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createMirrorRepository,
    decideMirrorFallback,
    OfflineCacheMissError,
    type MirrorRepository,
} from '@/services/mirror/repository';
import {
    ensureMirrorSchema,
    MIRROR_MIGRATIONS,
    planMigrations,
    readAppliedVersions,
} from '@/services/mirror/schema';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';

const NOW = 1_800_000_000_000;

describe('planMigrations', () => {
    it('debe devolver todas las migraciones cuando no hay ninguna aplicada', () => {
        expect(planMigrations([]).map(m => m.version)).toEqual([1, 2]);
    });

    it('debe ignorar las ya aplicadas', () => {
        expect(planMigrations([1]).map(m => m.version)).toEqual([2]);
        expect(planMigrations([1, 2]).map(m => m.version)).toEqual([]);
    });

    it('debe ordenar por versión y saltar huecos', () => {
        const pendientes = planMigrations(
            [1, 3],
            [
                { version: 3, name: 'tres', statements: [] },
                { version: 2, name: 'dos', statements: [] },
                { version: 1, name: 'uno', statements: [] },
            ]
        );

        expect(pendientes.map(m => m.version)).toEqual([2]);
    });
});

describe('ensureMirrorSchema', () => {
    let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;

    beforeEach(() => {
        driver = createNodeSqliteMirrorDriver();
    });

    afterEach(() => {
        driver.close();
    });

    it('debe aplicar las migraciones y registrarlas en el ledger', () => {
        const version = ensureMirrorSchema(driver, () => NOW);

        expect(version).toBe(MIRROR_MIGRATIONS[MIRROR_MIGRATIONS.length - 1].version);
        expect(version).toBe(2);
        expect(readAppliedVersions(driver)).toHaveLength(MIRROR_MIGRATIONS.length);
        expect(
            driver.getFirst<{ applied_at: number }>(
                'SELECT applied_at FROM mirror_schema_migrations WHERE version = 1'
            )?.applied_at
        ).toBe(NOW);
    });

    it('debe ser idempotente', () => {
        ensureMirrorSchema(driver, () => NOW);
        ensureMirrorSchema(driver, () => NOW);
        ensureMirrorSchema(driver, () => NOW);

        expect(readAppliedVersions(driver)).toEqual([1, 2]);
    });

    it('debe aplicar solo lo que falta cuando el ledger ya trae una migración', () => {
        driver.exec(`CREATE TABLE mirror_schema_migrations (
            version INTEGER PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            applied_at INTEGER NOT NULL
        )`);
        driver.run(
            'INSERT INTO mirror_schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
            [2, 'outbox_de_intenciones', NOW]
        );

        expect(ensureMirrorSchema(driver, () => NOW + 1)).toBe(1);
        expect(readAppliedVersions(driver)).toEqual([1, 2]);
    });
});

describe('decideMirrorFallback', () => {
    it('debe ir a la red siempre que esté confirmada', () => {
        expect(
            decideMirrorFallback({ online: true, hasCache: true, cacheAgeMs: 0 })
        ).toEqual({ action: 'fetch' });
        expect(
            decideMirrorFallback({ online: true, hasCache: false, cacheAgeMs: null })
        ).toEqual({ action: 'fetch' });
    });

    it('debe servir el espejo sin red cuando hay dato guardado', () => {
        expect(
            decideMirrorFallback({ online: false, hasCache: true, cacheAgeMs: 60_000 })
        ).toEqual({ action: 'cached' });
    });

    it('debe fallar sin red y sin dato guardado', () => {
        expect(
            decideMirrorFallback({ online: false, hasCache: false, cacheAgeMs: null })
        ).toEqual({ action: 'fail' });
    });

    it('debe respetar maxAgeMs cuando no hay red', () => {
        expect(
            decideMirrorFallback({
                online: false,
                hasCache: true,
                cacheAgeMs: 120_000,
                maxAgeMs: 60_000,
            })
        ).toEqual({ action: 'fail' });

        expect(
            decideMirrorFallback({
                online: false,
                hasCache: true,
                cacheAgeMs: 30_000,
                maxAgeMs: 60_000,
            })
        ).toEqual({ action: 'cached' });
    });

    it('debe aceptar caché de cualquier antigüedad si no hay maxAgeMs', () => {
        expect(
            decideMirrorFallback({ online: false, hasCache: true, cacheAgeMs: 999_999_999 })
        ).toEqual({ action: 'cached' });
    });
});

describe('createMirrorRepository', () => {
    let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;
    let clock: number;
    let online: boolean;
    let mirror: MirrorRepository;

    beforeEach(() => {
        driver = createNodeSqliteMirrorDriver();
        ensureMirrorSchema(driver, () => NOW);
        clock = NOW;
        online = true;
        mirror = createMirrorRepository(driver, {
            isOffline: () => !online,
            now: () => clock,
        });
    });

    afterEach(() => {
        driver.close();
    });

    describe('almacenamiento', () => {
        it('debe guardar y recuperar el payload con su metadata', () => {
            mirror.put('catalog.categories', [{ id: 'cat-1' }], { source: '/categories' });

            expect(mirror.get('catalog.categories')).toEqual({
                data: [{ id: 'cat-1' }],
                syncedAt: NOW,
                source: '/categories',
            });
        });

        it('debe respetar un syncedAt explícito y sobrescribir la clave', () => {
            mirror.put('k', { v: 1 });
            mirror.put('k', { v: 2 }, { syncedAt: NOW - 5_000 });

            expect(mirror.get('k')).toEqual({ data: { v: 2 }, syncedAt: NOW - 5_000, source: null });
        });

        it('debe devolver null para una clave ausente', () => {
            expect(mirror.get('no-existe')).toBeNull();
        });

        it('debe descartar un payload corrupto en lugar de romper', () => {
            driver.run(
                'INSERT INTO mirror_cache (key, payload, synced_at, source) VALUES (?, ?, ?, ?)',
                ['roto', '{no-es-json', NOW, null]
            );

            expect(mirror.get('roto')).toBeNull();
            expect(mirror.keys()).not.toContain('roto');
        });

        it('no debe romperse si el valor no es serializable', () => {
            expect(() => mirror.put('bigint', { monto: BigInt(10) })).not.toThrow();
            expect(mirror.get('bigint')).toBeNull();
        });

        it('no debe romperse si el driver falla al escribir', () => {
            const roto = createNodeSqliteMirrorDriver();
            const otro = createMirrorRepository(roto);
            roto.close();

            expect(() => otro.put('k', { v: 1 })).not.toThrow();
        });

        it('debe comportarse como si no hubiera nada guardado si el driver falla', () => {
            const falla = () => {
                throw new Error('sin SQLite en esta plataforma');
            };
            const otro = createMirrorRepository({
                exec: falla,
                run: falla,
                getFirst: falla,
                getAll: falla,
                transaction: falla,
            });

            expect(otro.get('k')).toBeNull();
            expect(otro.getMeta('k')).toBeNull();
            expect(otro.keys()).toEqual([]);
            expect(() => otro.put('k', { v: 1 })).not.toThrow();
            expect(() => otro.setMeta('k', '1')).not.toThrow();
            expect(() => otro.remove('k')).not.toThrow();
            expect(() => otro.clear()).not.toThrow();
        });

        it('debe listar, borrar y limpiar claves', () => {
            mirror.put('b', 1);
            mirror.put('a', 2);
            mirror.put('c', 3);

            expect(mirror.keys()).toEqual(['a', 'b', 'c']);

            mirror.remove('a');
            expect(mirror.keys()).toEqual(['b', 'c']);

            mirror.clear();
            expect(mirror.keys()).toEqual([]);
        });

        it('debe guardar metadatos del espejo', () => {
            expect(mirror.getMeta('schema_version')).toBeNull();

            mirror.setMeta('schema_version', '1');
            mirror.setMeta('schema_version', '2');

            expect(mirror.getMeta('schema_version')).toBe('2');
        });
    });

    describe('readThroughDetailed', () => {
        it('debe consultar la red cuando está online y dejar el dato espejado', async () => {
            const fetcher = vi.fn().mockResolvedValue([{ id: 'cat-1' }]);

            const result = await mirror.readThroughDetailed('catalog.categories', fetcher);

            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                data: [{ id: 'cat-1' }],
                fromCache: false,
                syncedAt: NOW,
                error: null,
            });
            expect(mirror.get('catalog.categories')?.data).toEqual([{ id: 'cat-1' }]);
        });

        it('debe usar el espejo sin tocar la red cuando está offline', async () => {
            mirror.put('catalog.categories', [{ id: 'viejo' }], { syncedAt: NOW - 1_000 });
            clock = NOW;
            online = false;
            const fetcher = vi.fn().mockResolvedValue([]);

            const result = await mirror.readThroughDetailed('catalog.categories', fetcher);

            expect(fetcher).not.toHaveBeenCalled();
            expect(result.fromCache).toBe(true);
            expect(result.data).toEqual([{ id: 'viejo' }]);
            expect(result.syncedAt).toBe(NOW - 1_000);
        });

        it('debe consultar la red cuando la conectividad todavía no está confirmada', async () => {
            // Arranque: `connectivity` está en `unknown`. Tratarlo como offline
            // haría fallar la primera pantalla con «sin conexión y sin datos
            // guardados» aunque el dispositivo tenga red.
            const arrancando = createMirrorRepository(driver, {
                isOffline: () => false,
                now: () => clock,
            });
            const fetcher = vi.fn().mockResolvedValue([{ id: 'cat-1' }]);

            const result = await arrancando.readThroughDetailed('catalog.categories', fetcher);

            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(result.fromCache).toBe(false);
            expect(result.data).toEqual([{ id: 'cat-1' }]);
        });

        it('solo el offline confirmado debe habilitar leer del espejo', async () => {
            const arrancando = createMirrorRepository(driver, {
                isOffline: () => false,
                now: () => clock,
            });
            arrancando.put('catalog.categories', [{ id: 'viejo' }], { syncedAt: NOW - 1_000 });

            const fetcher = vi.fn().mockResolvedValue([{ id: 'nuevo' }]);
            await arrancando.readThroughDetailed('catalog.categories', fetcher);

            // Aunque haya algo guardado, con la red sin confirmar se intenta la red.
            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it('debe lanzar OfflineCacheMissError sin red y sin dato guardado', async () => {
            online = false;

            await expect(
                mirror.readThroughDetailed('catalog.categories', async () => [])
            ).rejects.toBeInstanceOf(OfflineCacheMissError);

            await expect(
                mirror.readThroughDetailed('catalog.categories', async () => [])
            ).rejects.toMatchObject({ code: 'OFFLINE_CACHE_MISS', key: 'catalog.categories' });
        });

        it('debe lanzar OfflineCacheMissError si el dato guardado superó maxAgeMs', async () => {
            mirror.put('catalog.categories', [{ id: 'viejo' }], { syncedAt: NOW - 120_000 });
            online = false;

            await expect(
                mirror.readThroughDetailed('catalog.categories', async () => [], {
                    maxAgeMs: 60_000,
                })
            ).rejects.toBeInstanceOf(OfflineCacheMissError);
        });

        it('debe devolver el dato guardado (con error adjunto) si la red falla estando online', async () => {
            mirror.put('catalog.categories', [{ id: 'viejo' }], { syncedAt: NOW - 600_000 });
            const onFallback = vi.fn();
            const failure = new Error('servidor caído');

            const result = await mirror.readThroughDetailed(
                'catalog.categories',
                vi.fn().mockRejectedValue(failure),
                { onFallback }
            );

            expect(result.fromCache).toBe(true);
            expect(result.data).toEqual([{ id: 'viejo' }]);
            expect(result.error).toBe(failure);
            expect(onFallback).toHaveBeenCalledWith(failure);
        });

        it('debe propagar el error de red si no hay nada guardado', async () => {
            const failure = new Error('servidor caído');

            await expect(
                mirror.readThroughDetailed('catalog.categories', vi.fn().mockRejectedValue(failure))
            ).rejects.toBe(failure);
        });

        it('debe envolver un error no-Error del fetcher', async () => {
            await expect(
                mirror.readThroughDetailed('catalog.categories', async () => {
                    throw 'string raro';
                })
            ).rejects.toBeInstanceOf(Error);
        });

        it('debe refrescar el espejo en cada lectura online', async () => {
            const fetcher = vi
                .fn()
                .mockResolvedValueOnce([{ id: 'primero' }])
                .mockResolvedValueOnce([{ id: 'segundo' }]);

            await mirror.readThrough('k', fetcher);
            clock = NOW + 5_000;
            const result = await mirror.readThrough('k', fetcher);

            expect(result).toEqual([{ id: 'segundo' }]);
            expect(mirror.get('k')).toEqual({
                data: [{ id: 'segundo' }],
                syncedAt: NOW + 5_000,
                source: null,
            });
        });
    });
});
