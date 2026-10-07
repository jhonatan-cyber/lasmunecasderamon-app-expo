import type { MirrorDriver, MirrorParam } from '@/services/mirror/driver';
import { createQueueId } from '@/utils/ids';
import logger from '@/utils/logger';

import type { OutboxEnqueueInput, OutboxIntent, OutboxIntentStatus } from './types';

interface OutboxRow {
    id: string;
    type: string;
    payload: string;
    label: string;
    created_at: number;
    updated_at: number;
    status: string;
    attempts: number;
    last_error: string | null;
    applied_at: number | null;
    response: string | null;
}

export interface OutboxRepository {
    enqueue<TPayload>(input: OutboxEnqueueInput<TPayload>, id?: string): OutboxIntent<TPayload>;
    get(id: string): OutboxIntent | null;
    list(): OutboxIntent[];
    /** Pendientes y fallidas, en orden de creación (lo que la UI muestra). */
    listUnresolved(): OutboxIntent[];
    /** Lo que corresponde enviar ahora: pendientes por debajo del tope. */
    listFlushable(maxAttempts: number): OutboxIntent[];
    markSending(id: string): void;
    markApplied(id: string, response: unknown): void;
    markFailed(id: string, error: string): void;
    /** Vuelve a 'pendiente' conservando el error (fallo transitorio). */
    markRetryable(id: string, error: string): void;
    retry(id: string): void;
    remove(id: string): void;
    clear(): void;
    countUnresolved(): number;
    /**
     * Purga historial resuelto: aplicadas hace más de `appliedOlderThanMs`
     * (def. 7d) y fallidas hace más de `failedOlderThanMs` (def. 30d).
     * Retorna nº de filas borradas. Sin esto la tabla crece sin límite.
     */
    pruneResolved(appliedOlderThanMs?: number, failedOlderThanMs?: number): number;
    /** Tope de seguridad: nº total de filas (para cap). */
    countAll(): number;
}

/** Retención por defecto del historial resuelto. */
export const OUTBOX_PRUNE_DEFAULTS = {
    /** Aplicadas: 7 días. */
    appliedOlderThanMs: 7 * 24 * 60 * 60 * 1000,
    /** Fallidas: 30 días (dan tiempo a conciliar). */
    failedOlderThanMs: 30 * 24 * 60 * 60 * 1000,
    /** Tope total de filas antes de podar las aplicadas más viejas. */
    maxRows: 500,
} as const;

const ESTADOS: OutboxIntentStatus[] = ['pendiente', 'enviando', 'aplicada', 'fallida'];

function mapRow(row: OutboxRow): OutboxIntent {
    const status = String(row.status) as OutboxIntentStatus;

    return {
        id: String(row.id),
        type: String(row.type) as OutboxIntent['type'],
        payload: parseJson(row.payload),
        label: row.label ?? '',
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
        status: ESTADOS.includes(status) ? status : 'fallida',
        attempts: Number(row.attempts ?? 0),
        lastError: row.last_error ?? null,
        appliedAt: row.applied_at === null ? null : Number(row.applied_at),
        response: row.response ? parseJson(row.response) : null,
    };
}

function parseJson(raw: string): unknown {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function createOutboxRepository(
    driver: MirrorDriver,
    options: { now?: () => number; createId?: () => string } = {}
): OutboxRepository {
    const now = options.now ?? (() => Date.now());
    const createId = options.createId ?? (() => createQueueId());

    const setStatus = (
        id: string,
        status: OutboxIntentStatus,
        extra: { lastError?: string | null; response?: string | null; appliedAt?: number | null } = {}
    ) => {
        const payload: MirrorParam[] = [status, now()];
        let sql = 'UPDATE outbox SET status = ?, updated_at = ?';

        if (extra.lastError !== undefined) {
            sql += ', last_error = ?';
            payload.push(extra.lastError);
        }
        if (extra.response !== undefined) {
            sql += ', response = ?';
            payload.push(extra.response);
        }
        if (extra.appliedAt !== undefined) {
            sql += ', applied_at = ?';
            payload.push(extra.appliedAt);
        }

        sql += ' WHERE id = ?';
        payload.push(id);

        driver.run(sql, payload);
    };

    const list = (sql: string, params: MirrorParam[] = []): OutboxIntent[] =>
        driver.getAll<OutboxRow>(sql, params).map(mapRow);

    return {
        enqueue: <TPayload,>(input: OutboxEnqueueInput<TPayload>, id?: string) => {
            const timestamp = now();
            const intent: OutboxIntent<TPayload> = {
                id: id ?? createId(),
                type: input.type,
                payload: input.payload,
                label: input.label ?? '',
                createdAt: timestamp,
                updatedAt: timestamp,
                status: 'pendiente',
                attempts: 0,
                lastError: null,
                appliedAt: null,
                response: null,
            };

            driver.run(
                `INSERT INTO outbox (id, type, payload, label, created_at, updated_at, status, attempts)
                 VALUES (?, ?, ?, ?, ?, ?, 'pendiente', 0)`,
                [
                    intent.id,
                    intent.type,
                    JSON.stringify(intent.payload),
                    intent.label,
                    intent.createdAt,
                    intent.updatedAt,
                ]
            );

            return intent;
        },

        get: (id: string) => {
            const rows = list('SELECT * FROM outbox WHERE id = ?', [id]);
            return rows[0] ?? null;
        },

        list: () => list('SELECT * FROM outbox ORDER BY created_at ASC'),

        listUnresolved: () =>
            list("SELECT * FROM outbox WHERE status IN ('pendiente', 'enviando', 'fallida') ORDER BY created_at ASC"),

        listFlushable: (maxAttempts: number) =>
            list(
                `SELECT * FROM outbox
                  WHERE status = 'pendiente' AND attempts < ?
                  ORDER BY created_at ASC`,
                [maxAttempts]
            ),

        markSending: (id: string) => {
            setStatus(id, 'enviando');
            driver.run('UPDATE outbox SET attempts = attempts + 1 WHERE id = ?', [id]);
        },

        markApplied: (id: string, response: unknown) => {
            setStatus(id, 'aplicada', {
                lastError: null,
                response: JSON.stringify(response ?? null),
                appliedAt: now(),
            });
        },

        markFailed: (id: string, error: string) => {
            setStatus(id, 'fallida', { lastError: error, appliedAt: now() });
        },

        markRetryable: (id: string, error: string) => {
            setStatus(id, 'pendiente', { lastError: error });
        },

        retry: (id: string) => {
            driver.run(
                `UPDATE outbox
                    SET status = 'pendiente', attempts = 0, last_error = NULL, updated_at = ?
                  WHERE id = ?`,
                [now(), id]
            );
        },

        remove: (id: string) => {
            driver.run('DELETE FROM outbox WHERE id = ?', [id]);
        },

        clear: () => {
            driver.run('DELETE FROM outbox');
            logger.debug('Outbox: cola vaciada');
        },

        countUnresolved: () => {
            const row = driver.getFirst<{ total: number }>(
                "SELECT COUNT(*) AS total FROM outbox WHERE status IN ('pendiente', 'enviando', 'fallida')"
            );
            return Number(row?.total ?? 0);
        },

        pruneResolved: (
            appliedOlderThanMs: number = OUTBOX_PRUNE_DEFAULTS.appliedOlderThanMs,
            failedOlderThanMs: number = OUTBOX_PRUNE_DEFAULTS.failedOlderThanMs,
        ) => {
            const countTotal = (): number => {
                const row = driver.getFirst<{ total: number }>('SELECT COUNT(*) AS total FROM outbox');
                return Number(row?.total ?? 0);
            };
            const before = countTotal();
            try {
                driver.run(
                    'DELETE FROM outbox WHERE status = ? AND COALESCE(applied_at, updated_at) < ?',
                    ['aplicada', now() - appliedOlderThanMs]
                );
                driver.run(
                    'DELETE FROM outbox WHERE status = ? AND COALESCE(applied_at, updated_at) < ?',
                    ['fallida', now() - failedOlderThanMs]
                );
                // Cap de seguridad: si aún hay demasiadas filas, se podan las
                // aplicadas más viejas (nunca pendientes/enviando/fallidas recientes).
                const total = countTotal();
                if (total > OUTBOX_PRUNE_DEFAULTS.maxRows) {
                    driver.run(
                        `DELETE FROM outbox WHERE id IN (
                           SELECT id FROM outbox WHERE status = 'aplicada'
                           ORDER BY COALESCE(applied_at, updated_at) ASC LIMIT ?
                         )`,
                        [total - OUTBOX_PRUNE_DEFAULTS.maxRows]
                    );
                }
                const deleted = Math.max(0, before - countTotal());
                logger.debug('Outbox: purga de historial resuelto', { deleted });
                return deleted;
            } catch (e) {
                logger.fetchError(e, { context: 'Outbox:pruneResolved' });
                return 0;
            }
        },

        countAll: () => {
            const row = driver.getFirst<{ total: number }>('SELECT COUNT(*) AS total FROM outbox');
            return Number(row?.total ?? 0);
        },
    };
}
