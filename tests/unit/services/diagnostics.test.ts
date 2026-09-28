import { beforeEach, describe, expect, it } from 'vitest';

import {
    collectOfflineDiagnostics,
    previewOf,
    PREVIEW_MAX_CHARS,
} from '@/services/diagnostics';
import { MIRROR_SCHEMA_VERSION } from '@/services/mirror';
import { createMirrorRepository, type MirrorRepository } from '@/services/mirror/repository';
import { ensureMirrorSchema } from '@/services/mirror/schema';
import { createOutboxRepository, type OutboxRepository } from '@/services/outbox/repository';
import { createOutboxService } from '@/services/outbox/service';
import type { MirrorDriver } from '@/services/mirror/driver';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';

const NOW = 1_800_000_000_000;

describe('diagnóstico offline (lectura del SQLite del dispositivo)', () => {
    let driver: MirrorDriver & { close: () => void };
    let mirror: MirrorRepository;
    let repository: OutboxRepository;

    beforeEach(() => {
        driver = createNodeSqliteMirrorDriver();
        ensureMirrorSchema(driver);
        mirror = createMirrorRepository(driver, { now: () => NOW });
        repository = createOutboxRepository(driver, { now: () => NOW });
    });

    it('reporta la base, sus tablas y la migración aplicada', () => {
        mirror.setMeta('schema_version', String(MIRROR_SCHEMA_VERSION));

        const reporte = collectOfflineDiagnostics({ driver, mirror, now: NOW });

        expect(reporte.db.available).toBe(true);
        expect(reporte.db.error).toBeNull();
        expect(reporte.db.appliedSchemaVersion).toBe(MIRROR_SCHEMA_VERSION);
        expect(reporte.db.expectedSchemaVersion).toBe(MIRROR_SCHEMA_VERSION);
        expect(reporte.db.tables).toEqual(expect.arrayContaining(['mirror_cache', 'outbox']));
    });

    it('lee las filas del espejo con su antigüedad, origen y payload', () => {
        mirror.put('cuentas.abiertas', [{ id: 'c-1' }], {
            syncedAt: NOW - 90_000,
            source: '/cuentas',
        });
        mirror.put('catalog.categories', [{ id: 1 }], { syncedAt: NOW });

        const reporte = collectOfflineDiagnostics({ driver, mirror, now: NOW });

        expect(reporte.mirror.count).toBe(2);

        const abiertas = reporte.mirror.rows.find(row => row.key === 'cuentas.abiertas')!;
        expect(abiertas.ageMs).toBe(90_000);
        expect(abiertas.source).toBe('/cuentas');
        expect(abiertas.bytes).toBeGreaterThan(0);
        expect(abiertas.preview).toContain('"c-1"');

        const guardadoAhora = reporte.mirror.rows.find(
            row => row.key === 'catalog.categories'
        )!;
        expect(guardadoAhora.ageMs).toBe(0);
        expect(guardadoAhora.source).toBeNull();
    });

    it('lee la cola con estado, intentos, motivo y sello de la operación', async () => {
        const outbox = createOutboxService(repository);

        const aplicada = outbox.enqueue({
            type: 'sale.create',
            payload: { total: 100 },
            label: 'Venta $100 · 1 ítem(s)',
        });
        repository.markSending(aplicada.id);
        repository.markApplied(aplicada.id, { success: true });

        const fallida = outbox.enqueue({
            type: 'account.consumptions',
            payload: {
                id_cuenta: 'c-9',
                consumos: { detalles: [] },
                device_date: new Date(NOW - 60_000).toISOString(),
            },
            label: 'Cuenta c-9 · 1 ítem(s)',
        });
        repository.markFailed(fallida.id, 'Al menos un detalle es requerido');

        const reporte = collectOfflineDiagnostics({
            driver,
            mirror,
            outboxRepository: repository,
            now: NOW,
        });

        expect(reporte.outbox.total).toBe(2);
        expect(reporte.outbox.unresolved).toBe(1);

        const hecha = reporte.outbox.rows.find(row => row.id === aplicada.id)!;
        expect(hecha.status).toBe('aplicada');
        expect(hecha.attempts).toBe(1);
        expect(hecha.label).toBe('Venta $100 · 1 ítem(s)');

        const revisar = reporte.outbox.rows.find(row => row.id === fallida.id)!;
        expect(revisar.status).toBe('fallida');
        expect(revisar.lastError).toBe('Al menos un detalle es requerido');
        expect(revisar.deviceDate).toBe(new Date(NOW - 60_000).toISOString());
    });

    it('no lanza cuando el almacén local no existe (build web o base ilegible)', () => {
        const roto: MirrorDriver = {
            exec: () => {},
            run: () => {},
            getFirst: () => {
                throw new Error('SQLite no disponible en esta plataforma');
            },
            getAll: () => {
                throw new Error('SQLite no disponible en esta plataforma');
            },
            transaction: task => task(),
        };

        const reporte = collectOfflineDiagnostics({
            driver: roto,
            mirror,
            outboxRepository: repository,
            now: NOW,
        });

        expect(reporte.db.available).toBe(false);
        expect(reporte.db.error).toContain('SQLite no disponible');
        expect(reporte.mirror.rows).toEqual([]);
        expect(reporte.outbox.rows).toEqual([]);
    });

    it('sigue reportando la cola aunque falle la lectura del espejo', () => {
        repository.enqueue({ type: 'sale.create', payload: { total: 100 }, label: 'Venta' });

        const espejoRoto: MirrorRepository = {
            ...mirror,
            keys: () => {
                throw new Error('espejo ilegible');
            },
        };

        const reporte = collectOfflineDiagnostics({
            driver,
            mirror: espejoRoto,
            outboxRepository: repository,
            now: NOW,
        });

        expect(reporte.db.error).toContain('espejo ilegible');
        expect(reporte.outbox.total).toBe(1);
    });
});

describe('previewOf', () => {
    it('devuelve el JSON completo si entra', () => {
        expect(previewOf({ a: 1 })).toBe('{"a":1}');
    });

    it('trunca payloads grandes sin cortar el texto a la mitad de un token', () => {
        const largo = { texto: 'x'.repeat(PREVIEW_MAX_CHARS * 2) };
        const preview = previewOf(largo);

        expect(preview).toHaveLength(PREVIEW_MAX_CHARS + 1);
        expect(preview.endsWith('…')).toBe(true);
    });

    it('sobrevive a payloads ilegibles', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;

        expect(previewOf(circular)).toBe('[payload ilegible]');
    });
});
