import { apiClientSafe } from '@/api/client';
import { NetworkError, TimeoutError, UnauthorizedError, httpDetailsOf } from '@/api/errors';
import { connectivity } from '@/services/connectivity';
import { createQueueId } from '@/utils/ids';
import logger from '@/utils/logger';
import type { OutboxRepository } from './repository';
import type { OutboxEnqueueInput, OutboxIntent, OutboxIntentType } from './types';

export const MAX_OUTBOX_ATTEMPTS = 6;
export type IntentSender = (intent: OutboxIntent) => Promise<unknown>;

const ACCOUNT_TYPE_ORDER: Partial<Record<OutboxIntentType, number>> = {
    'account.consumptions': 0,
    'account.checkout': 1,
};

function intentAccountKey(intent: OutboxIntent): string | null {
    if (intent.type !== 'account.consumptions' && intent.type !== 'account.checkout') return null;
    const id = (intent.payload as { id_cuenta?: unknown } | null)?.id_cuenta;
    return id === undefined || id === null ? null : String(id);
}

export function orderFlushable(intents: OutboxIntent[]): OutboxIntent[] {
    return [...intents].sort((a, b) => {
        const keyA = intentAccountKey(a);
        const keyB = intentAccountKey(b);
        if (keyA !== null && keyA === keyB) {
            return (ACCOUNT_TYPE_ORDER[a.type] ?? 0) - (ACCOUNT_TYPE_ORDER[b.type] ?? 0);
        }
        return 0;
    });
}

export const IDEMPOTENCY_HEADER = 'x-idempotency-key';
export interface ConsumptionsIntentPayload {
    id_cuenta: string | number;
    consumos: Record<string, unknown>;
}

export interface CheckoutIntentPayload {
    id_cuenta: string | number;
    metodo_pago?: string;
    total_cobrado?: number;
    propina?: number;
    habitacion_id?: string | number | null;
}

export const INTENT_SENDERS: Record<OutboxIntentType, IntentSender> = {
    'order.create': async intent => {
        const res = await apiClientSafe('/orders', {
            method: 'POST',
            headers: { [IDEMPOTENCY_HEADER]: intent.id },
            body: JSON.stringify(intent.payload),
            retries: 0,
        });

        if ((res as { success?: boolean })?.success === false) {
            throw new Error(
                (res as { message?: string })?.message || 'El servidor rechazó el pedido.'
            );
        }

        return res;
    },

    'sale.create': async intent => {
        const res = await apiClientSafe('/sales', {
            method: 'POST',
            headers: { [IDEMPOTENCY_HEADER]: intent.id },
            body: JSON.stringify(intent.payload),
            retries: 0,
        });

        if ((res as { success?: boolean })?.success === false) {
            throw new Error(
                (res as { message?: string })?.message || 'El servidor rechazó la venta.'
            );
        }

        return res;
    },

    'account.checkout': async intent => {
        const { id_cuenta, ...cobro } = intent.payload as CheckoutIntentPayload;

        if (id_cuenta === undefined || id_cuenta === null) {
            throw new Error('La intención de cobro no tiene cuenta.');
        }

        const res = await apiClientSafe(`/accounts/${id_cuenta}/charge-with-sale`, {
            method: 'POST',
            headers: { [IDEMPOTENCY_HEADER]: intent.id },
            body: JSON.stringify(cobro),
            retries: 0,
        });

        if ((res as { success?: boolean })?.success === false) {
            throw new Error((res as { message?: string })?.message || 'El servidor rechazó el cobro.');
        }

        return res;
    },

    'account.consumptions': async intent => {
        const { id_cuenta, consumos } = intent.payload as ConsumptionsIntentPayload;

        if (id_cuenta === undefined || id_cuenta === null || !consumos) {
            throw new Error('La intención de consumos no tiene cuenta o productos.');
        }

        const res = await apiClientSafe(`/accounts/${id_cuenta}`, {
            method: 'PUT',
            headers: { [IDEMPOTENCY_HEADER]: intent.id },
            body: JSON.stringify(consumos),
            retries: 0,
        });

        if ((res as { success?: boolean })?.success === false) {
            throw new Error(
                (res as { message?: string })?.message || 'El servidor rechazó los consumos.'
            );
        }

        return res;
    },
};

export function stampDeviceDate<TPayload>(payload: TPayload, now: () => number): TPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;

    const record = payload as Record<string, unknown>;
    if (record.device_date) return payload;

    return { ...record, device_date: new Date(now()).toISOString() } as TPayload;
}

export interface FlushSummary {
    skipped: boolean;
    sent: number;
    pending: number;
    failed: number;
}

export interface OutboxServiceOptions {
    ownerId?: () => string | null;
    retryDelayMs?: (attempt: number) => number;
    scheduleRetries?: boolean;
    reconcile?: (intent: OutboxIntent) => Promise<Reconciliation>;

    isOffline?: () => boolean;
    senders?: Partial<Record<OutboxIntentType, IntentSender>>;
    maxAttempts?: number;
    now?: () => number;
}

export type Reconciliation =
    | { state: 'not_found' }
    | { state: 'aplicada'; response: unknown }
    | { state: 'pendiente' }
    | { state: 'rechazada' | 'fallida'; message: string };

export interface OutboxService {
    enqueue: <TPayload>(input: OutboxEnqueueInput<TPayload>) => OutboxIntent<TPayload>;
    enqueueAndSend: <TPayload>(input: OutboxEnqueueInput<TPayload>) => Promise<OutboxIntent<TPayload>>;
    flush: () => Promise<FlushSummary>;
    list: () => OutboxIntent[];
    listUnresolved: () => OutboxIntent[];
    /** Lista cacheada y estable; es el `getSnapshot` del store. */
    getSnapshot: () => OutboxIntent[];
    pendingCount: () => number;
    unownedCount: () => number;
    retry: (id: string) => Promise<OutboxIntent | null>;
    discard: (id: string) => void;
    clear: () => void;
    isFlushing: () => boolean;
    subscribe: (listener: () => void) => () => void;
    refreshIdentity: () => void;
    stop: () => void;
}

export function isRetryableError(error: unknown): boolean {
    if (error instanceof NetworkError || error instanceof TimeoutError) return true;
    if (error instanceof UnauthorizedError) return false;
    if (httpDetailsOf(error)) return false;

    const message = error instanceof Error ? error.message : String(error);
    // `apiClient` envuelve los fallos de red en errores genéricos con este texto.
    return /fetch|network|timeout|timed out|abort/i.test(message);
}

export function describeIntentError(error: unknown): string {
    const fallback = error instanceof Error ? error.message : String(error);
    return pickServerMessage(httpDetailsOf(error)?.body) ?? fallback;
}

function pickServerMessage(body: unknown): string | null {
    if (!body || typeof body !== 'object') return null;

    const { message, error } = body as { message?: unknown; error?: unknown };

    if (error && typeof error === 'object') {
        const anidado = (error as { message?: unknown }).message;
        if (typeof anidado === 'string' && anidado.trim()) return anidado.trim();
    }
    if (typeof error === 'string' && error.trim()) return error.trim();
    if (typeof message === 'string' && message.trim()) return message.trim();

    return null;
}

export function createOutboxService(
    repository: OutboxRepository,
    options: OutboxServiceOptions = {}
): OutboxService {
    const isOffline = options.isOffline ?? (() => connectivity.isOffline());
    const maxAttempts = options.maxAttempts ?? MAX_OUTBOX_ATTEMPTS;
    const now = options.now ?? (() => Date.now());
    const senders = { ...INTENT_SENDERS, ...options.senders };
    const retryDelayMs = options.retryDelayMs ?? ((attempt: number) => Math.min(60_000, 1000 * 2 ** Math.min(attempt, 6)));
    const activeOwner = () => options.ownerId?.() ?? null;
    const hasSession = () => !options.ownerId || activeOwner() !== null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const checkoutBlocked = (intent: OutboxIntent): boolean => intent.type === 'account.checkout' &&
        intentAccountKey(intent) !== null && repository.hasUnresolvedConsumptions(intentAccountKey(intent)!);
    const schedule = () => {
        if (timer) clearTimeout(timer);
        timer = null;
        if (!options.scheduleRetries || isOffline() || !hasSession()) return;
        const candidates = repository.listFlushable(maxAttempts).filter(intent => !checkoutBlocked(intent));
        if (!candidates.length) return;
        const due = Math.min(...candidates.map(intent => intent.nextAttemptAt ?? 0));
        timer = setTimeout(() => { timer = null; void flush(); }, Math.max(250, due - now()));
    };

    const listeners = new Set<() => void>();
    let flushing = false;
    let snapshot: OutboxIntent[] = [];
    let snapshotValid = false;
    let snapshotOwner: string | null = null;

    const getSnapshot = (): OutboxIntent[] => {
        if (!snapshotValid || snapshotOwner !== activeOwner()) {
            snapshot = repository.listUnresolved();
            snapshotOwner = activeOwner();
            snapshotValid = true;
        }
        return snapshot;
    };

    const notify = () => {
        snapshotValid = false;
        listeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                logger.captureException(error, { context: 'outbox:listener' });
            }
        });
        if (!flushing) schedule();
    };

    const createTransientIntent = <TPayload>(
        input: OutboxEnqueueInput<TPayload>
    ): OutboxIntent<TPayload> => {
        const timestamp = now();

        return {
            id: createQueueId(),
            type: input.type,
            payload: stampDeviceDate(input.payload, now),
            label: input.label ?? '',
            createdAt: timestamp,
            updatedAt: timestamp,
            status: 'pendiente',
            attempts: 0,
            lastError: null,
            appliedAt: null,
            response: null,
            ownerId: activeOwner(),
            nextAttemptAt: 0,
        };
    };

    const sendWithoutQueue = async <TPayload>(
        intent: OutboxIntent<TPayload>
    ): Promise<OutboxIntent<TPayload>> => {
        if (isOffline() || !hasSession()) {
            return {
                ...intent,
                status: 'fallida',
                lastError: !hasSession() ? 'Inicia sesión antes de enviar operaciones.' : 'Este dispositivo no puede guardar operaciones sin conexión.',
            };
        }
        if (options.ownerId && intent.ownerId !== activeOwner()) {
            return { ...intent, status: 'fallida', lastError: 'La operación pertenece a otra sesión.' };
        }
        if (checkoutBlocked(intent)) {
            return { ...intent, status: 'fallida', lastError: 'Primero sincroniza o revisa los consumos de esta cuenta.' };
        }

        const sender = senders[intent.type];
        if (!sender) {
            return {
                ...intent,
                status: 'fallida',
                lastError: `Tipo de operación desconocido: ${intent.type}`,
            };
        }

        try {
            const response = await sender(intent);
            return { ...intent, status: 'aplicada', response, appliedAt: now() };
        } catch (error) {
            return {
                ...intent,
                status: 'fallida',
                lastError: describeIntentError(error),
            };
        }
    };

    const confirm = (intent: OutboxIntent, response: unknown): OutboxIntent => {
        repository.remove(intent.id);
        return { ...intent, status: 'aplicada', response, appliedAt: now(), lastError: null };
    };

    const persisted = (intent: OutboxIntent, fallback: OutboxIntent): OutboxIntent =>
        repository.get(intent.id) ?? fallback;

    const send = async (intent: OutboxIntent): Promise<OutboxIntent | null> => {
        const owner = activeOwner();
        const sameSession = () => hasSession() && activeOwner() === owner;
        if (!sameSession()) return null;
        const sender = senders[intent.type];
        if (!sender) {
            const error = `Tipo de operación desconocido: ${intent.type}`;
            repository.markFailed(intent.id, error);
            return persisted(intent, { ...intent, status: 'fallida', lastError: error });
        }

        try {
            if (options.reconcile) {
                let result: Reconciliation;
                try { result = await options.reconcile(intent); }
                catch (error) {
                    if (sameSession()) repository.markRetryable(intent.id, describeIntentError(error), now() + 30_000);
                    return null;
                }
                if (!sameSession()) return null;
                if (result.state === 'aplicada') return confirm(intent, result.response);
                if (result.state === 'rechazada' || result.state === 'fallida') {
                    repository.markFailed(intent.id, result.message);
                    return persisted(intent, { ...intent, status: 'fallida', lastError: result.message });
                }
                if (result.state === 'pendiente') {
                    const aviso = 'El servidor sigue procesando esta operación.';
                    repository.markRetryable(intent.id, aviso, now() + 30_000);
                    return persisted(intent, { ...intent, status: 'pendiente', lastError: aviso });
                }
            }
            if (!sameSession() || isOffline()) return null;
            if (intent.attempts >= maxAttempts) {
                const error = 'Se agotaron los intentos; revisa esta operación antes de reenviarla.';
                repository.markFailed(intent.id, error);
                return persisted(intent, { ...intent, status: 'fallida', lastError: error });
            }
            repository.markSending(intent.id);
            const response = await sender(intent);
            if (!sameSession()) return null;
            return confirm(intent, response);
        } catch (error) {
            if (!sameSession()) return null;
            const message = describeIntentError(error);
            const intentos = repository.get(intent.id)?.attempts ?? 0;

            if (isRetryableError(error) && intentos < maxAttempts) {
                repository.markRetryable(intent.id, message, now() + retryDelayMs(intentos));
                return persisted(intent, { ...intent, status: 'pendiente', lastError: message });
            }
            repository.markFailed(intent.id, message);
            return persisted(intent, { ...intent, status: 'fallida', lastError: message });
        }
    };

    const flush = async (recogidos?: Map<string, OutboxIntent>): Promise<FlushSummary> => {
        if (isOffline() || flushing || !hasSession()) {
            return { skipped: true, sent: 0, pending: 0, failed: 0 };
        }

        flushing = true;
        const owner = activeOwner();
        const summary: FlushSummary = { skipped: false, sent: 0, pending: 0, failed: 0 };

        try {

            if (owner) {
                try {
                    repository.adoptUnowned(owner);
                } catch (error) {
                    logger.captureException(error, { context: 'outbox:adoptUnowned' });
                }
            }

            for (const intent of orderFlushable(repository.listFlushable(maxAttempts))) {
                if (activeOwner() !== owner || !hasSession() || isOffline()) break;
                if ((intent.nextAttemptAt ?? 0) > now()) continue;
                if (checkoutBlocked(intent)) {
                    repository.markRetryable(intent.id, 'Primero sincroniza o revisa los consumos de esta cuenta.');
                    summary.pending += 1; continue;
                }

                let desenlace: OutboxIntent | null = null;
                try {
                    desenlace = await send(intent);
                } catch (error) {
                    logger.captureException(error, { context: 'outbox:send', intentId: intent.id });
                    try {
                        repository.markRetryable(intent.id, describeIntentError(error));
                    } catch (markError) {
                        logger.captureException(markError, { context: 'outbox:send:retryable' });
                    }
                }

                if (desenlace) {
                    recogidos?.set(desenlace.id, desenlace);
                    if (desenlace.status === 'aplicada') summary.sent += 1;
                    else if (desenlace.status === 'fallida') summary.failed += 1;
                    else summary.pending += 1;
                    continue;
                }

                const estado = repository.get(intent.id)?.status;
                if (estado === 'fallida') summary.failed += 1;
                else summary.pending += 1;
            }
        } catch (error) {
            logger.captureException(error, { context: 'outbox:flush' });
        } finally {
            flushing = false;
            try {
                repository.pruneResolved();
            } catch {

            }
            notify();
        }

        return summary;
    };

    return {
        enqueue: input => {
            const intent = repository.enqueue({
                ...input,
                payload: stampDeviceDate(input.payload, now),
            });
            notify();
            return intent;
        },

        enqueueAndSend: async <TPayload>(input: OutboxEnqueueInput<TPayload>) => {
            const stamped: OutboxEnqueueInput<TPayload> = {
                ...input,
                payload: stampDeviceDate(input.payload, now),
            };

            let intent: OutboxIntent<TPayload> | null = null;
            let persisted = false;

            try {
                intent = repository.enqueue<TPayload>(stamped);
                persisted = Boolean(repository.get(intent.id));
            } catch (error) {
                logger.captureException(error, { context: 'outbox:enqueue' });
            }

            notify();

            if (!intent || !persisted) {
                return sendWithoutQueue(intent ?? createTransientIntent(stamped));
            }

            const desenlaces = new Map<string, OutboxIntent>();
            await flush(desenlaces);

            const actual = desenlaces.get(intent.id) ?? repository.get(intent.id);
            return (actual as OutboxIntent<TPayload> | null) ?? intent;
        },

        flush,

        list: () => repository.list(),
        listUnresolved: getSnapshot,
        getSnapshot,
        pendingCount: () => getSnapshot().length,
        unownedCount: () => repository.countUnowned(),

        retry: async (id: string) => {
            repository.retry(id);
            notify();
            const desenlaces = new Map<string, OutboxIntent>();
            await flush(desenlaces);
            return desenlaces.get(id) ?? repository.get(id);
        },

        discard: (id: string) => {
            repository.remove(id);
            notify();
        },

        clear: () => {
            repository.clear();
            notify();
        },

        isFlushing: () => flushing,

        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        refreshIdentity: notify,
        stop: () => { if (timer) clearTimeout(timer); timer = null; },
    };
}
