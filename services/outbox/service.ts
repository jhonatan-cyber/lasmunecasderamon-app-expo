import { apiClientSafe } from '@/api/client';
import { NetworkError, TimeoutError, UnauthorizedError, httpDetailsOf } from '@/api/errors';
import { connectivity } from '@/services/connectivity';
import { createQueueId } from '@/utils/ids';
import logger from '@/utils/logger';

import type { OutboxRepository } from './repository';
import type { OutboxEnqueueInput, OutboxIntent, OutboxIntentType } from './types';

/** Tope de reintentos automáticos antes de pedir intervención humana. */
export const MAX_OUTBOX_ATTEMPTS = 6;

/** Envía una intención al servidor. Lanza si el servidor no la aceptó. */
export type IntentSender = (intent: OutboxIntent) => Promise<unknown>;

/**
 * Orden dentro de la misma cuenta: los consumos van antes que el cobro (el
 * cobro cierra la cuenta). El resto conserva el FIFO por created_at del SQL.
 */
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
        return 0; // sort estable: conserva el FIFO por created_at
    });
}

/**
 * Cabecera con la que el servidor deduplica. El id de la intención es estable
 * durante toda su vida, así que un reintento tras un timeout no duplica nada.
 */
export const IDEMPOTENCY_HEADER = 'x-idempotency-key';

/**
 * Payload de una intención de consumo: la cuenta a la que se le suman productos
 * y el body tal como lo espera `PUT /cuentas/:id`.
 */
export interface ConsumptionsIntentPayload {
    id_cuenta: string | number;
    consumos: Record<string, unknown>;
}

/**
 * Payload de una intención de cobro: la cuenta a cobrar y el body del endpoint
 * transaccional `POST /cuentas/:id/cobrar-con-venta`.
 */
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
        });

        if ((res as { success?: boolean })?.success === false) {
            throw new Error(
                (res as { message?: string })?.message || 'El servidor rechazó la venta.'
            );
        }

        return res;
    },

    /**
     * Cobro de cuenta con su venta, al endpoint que hace las dos cosas en una
     * sola transacción: si el corte deja la operación a medias, el servidor la
     * revierte entera y el reintento de la cola no duplica nada.
     */
    'account.checkout': async intent => {
        const { id_cuenta, ...cobro } = intent.payload as CheckoutIntentPayload;

        if (id_cuenta === undefined || id_cuenta === null) {
            throw new Error('La intención de cobro no tiene cuenta.');
        }

        const res = await apiClientSafe(`/cuentas/${id_cuenta}/cobrar-con-venta`, {
            method: 'POST',
            headers: { [IDEMPOTENCY_HEADER]: intent.id },
            body: JSON.stringify(cobro),
        });

        if ((res as { success?: boolean })?.success === false) {
            throw new Error((res as { message?: string })?.message || 'El servidor rechazó el cobro.');
        }

        return res;
    },

    /**
     * Consumos a una cuenta abierta. El `PUT` es un incremento: si el servidor no
     * deduplicara por la clave de la intención, reintentar cargaría los mismos
     * productos otra vez. La cuenta viene en el payload porque el endpoint la
     * lleva en la ruta.
     */
    'account.consumptions': async intent => {
        const { id_cuenta, consumos } = intent.payload as ConsumptionsIntentPayload;

        if (id_cuenta === undefined || id_cuenta === null || !consumos) {
            throw new Error('La intención de consumos no tiene cuenta o productos.');
        }

        const res = await apiClientSafe(`/cuentas/${id_cuenta}`, {
            method: 'PUT',
            headers: { [IDEMPOTENCY_HEADER]: intent.id },
            body: JSON.stringify(consumos),
        });

        if ((res as { success?: boolean })?.success === false) {
            throw new Error(
                (res as { message?: string })?.message || 'El servidor rechazó los consumos.'
            );
        }

        return res;
    },
};

/**
 * Sella el momento en que el usuario hizo la operación.
 *
 * `apiClient` inyecta `device_date` en el envío, así que sin esto una venta
 * encolada sin red quedaría con la hora de sincronización y no con la hora
 * real del cobro: movería la venta de turno y ensuciaría caja y reportes. Se
 * sella al encolar, que es cuando el hecho ocurrió, y no se pisa si el payload
 * ya lo trae.
 */
export function stampDeviceDate<TPayload>(payload: TPayload, now: () => number): TPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;

    const record = payload as Record<string, unknown>;
    if (record.device_date) return payload;

    return { ...record, device_date: new Date(now()).toISOString() } as TPayload;
}

export interface FlushSummary {
    /** `true` si no se intentó nada (sin red o ya había un flush en curso). */
    skipped: boolean;
    sent: number;
    pending: number;
    failed: number;
}

export interface OutboxServiceOptions {
    /**
     * Pregunta **solo si está confirmado que no hay red**. Con la conectividad
     * en `unknown` (arranque) conviene intentar el envío: fallar por no saber
     * sería perder una operación que sí podía salir.
     */
    isOffline?: () => boolean;
    senders?: Partial<Record<OutboxIntentType, IntentSender>>;
    maxAttempts?: number;
    now?: () => number;
}

export interface OutboxService {
    enqueue: <TPayload>(input: OutboxEnqueueInput<TPayload>) => OutboxIntent<TPayload>;
    /**
     * Encola y, si hay red, intenta enviar de inmediato. Devuelve el estado
     * final de la intención para que la pantalla decida qué decir al usuario.
     * Si el dispositivo no puede guardar la intención (web sin SQLite), la envía
     * directo: nunca se pierde en silencio.
     */
    enqueueAndSend: <TPayload>(input: OutboxEnqueueInput<TPayload>) => Promise<OutboxIntent<TPayload>>;
    flush: () => Promise<FlushSummary>;
    list: () => OutboxIntent[];
    listUnresolved: () => OutboxIntent[];
    /** Lista cacheada y estable; es el `getSnapshot` del store. */
    getSnapshot: () => OutboxIntent[];
    pendingCount: () => number;
    retry: (id: string) => Promise<OutboxIntent | null>;
    discard: (id: string) => void;
    clear: () => void;
    isFlushing: () => boolean;
    subscribe: (listener: () => void) => () => void;
}

/**
 * ¿El fallo es transitorio? Solo entonces tiene sentido reintentar solo. Un
 * error del servidor (validación, permisos, conflicto) daría lo mismo otra vez,
 * así que la intención queda 'fallida' para que alguien la mire.
 *
 * Un fallo de **transporte** (sin respuesta del servidor) es el único que se
 * reintenta solo. Si el servidor contestó —incluso con un 5xx— el intento ya
 * quedó registrado con su clave y un reintento automático no ejecutaría nada: el
 * dashboard contesta 409 «puede haber aplicado». Reintentarlo sólo gasta turnos y
 * cambia el motivo real por un conflicto de idempotencia, así que lo revisa una
 * persona.
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof NetworkError || error instanceof TimeoutError) return true;
    if (error instanceof UnauthorizedError) return false;
    if (httpDetailsOf(error)) return false;

    const message = error instanceof Error ? error.message : String(error);
    // `apiClient` envuelve los fallos de red en errores genéricos con este texto.
    return /fetch|network|timeout|timed out|abort/i.test(message);
}

/**
 * Mensaje que va a ver el usuario en la pantalla de pendientes.
 *
 * El `message` del error HTTP suele ser el genérico del sobre («Error de
 * validación»), mientras que el motivo concreto vive en `error.message` del
 * cuerpo («Al menos un detalle es requerido»). Se prefiere el concreto: es el
 * que le dice al cajero qué corregir.
 */
export function describeIntentError(error: unknown): string {
    const fallback = error instanceof Error ? error.message : String(error);
    return pickServerMessage(httpDetailsOf(error)?.body) ?? fallback;
}

/** Motivo concreto dentro del sobre de error del servidor, si lo hay. */
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

    const listeners = new Set<() => void>();
    let flushing = false;

    // Snapshot para `useSyncExternalStore`: React exige que `getSnapshot`
    // devuelva la misma referencia mientras nada cambie, así que la lista se
    // cachea y se invalida en cada mutación.
    let snapshot: OutboxIntent[] = [];
    let snapshotValid = false;

    const getSnapshot = (): OutboxIntent[] => {
        if (!snapshotValid) {
            snapshot = repository.listUnresolved();
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
    };

    /** Intención en memoria, para cuando el almacén local no puede guardarla. */
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
        };
    };

    /**
     * Camino sin cola: el dispositivo no puede guardar trabajo pendiente, así que
     * la intención se envía ahora o se reporta como fallida con un motivo claro.
     * No hay reintento posible, y decirlo es mejor que prometer que saldrá luego.
     */
    const sendWithoutQueue = async <TPayload>(
        intent: OutboxIntent<TPayload>
    ): Promise<OutboxIntent<TPayload>> => {
        if (isOffline()) {
            return {
                ...intent,
                status: 'fallida',
                lastError: 'Este dispositivo no puede guardar operaciones sin conexión.',
            };
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

    const send = async (intent: OutboxIntent): Promise<void> => {
        const sender = senders[intent.type];
        if (!sender) {
            repository.markFailed(intent.id, `Tipo de operación desconocido: ${intent.type}`);
            return;
        }

        repository.markSending(intent.id);

        try {
            const response = await sender(intent);
            repository.markApplied(intent.id, response);
        } catch (error) {
            const message = describeIntentError(error);
            const intentos = repository.get(intent.id)?.attempts ?? 0;

            if (isRetryableError(error) && intentos < maxAttempts) {
                repository.markRetryable(intent.id, message);
            } else {
                repository.markFailed(intent.id, message);
            }
        }
    };

    const flush = async (): Promise<FlushSummary> => {
        if (isOffline() || flushing) {
            return { skipped: true, sent: 0, pending: 0, failed: 0 };
        }

        flushing = true;
        const summary: FlushSummary = { skipped: false, sent: 0, pending: 0, failed: 0 };

        try {
            // Ordenado por cuenta: consumos antes que el cobro de la misma cuenta.
            for (const intent of orderFlushable(repository.listFlushable(maxAttempts))) {
                await send(intent);

                const estado = repository.get(intent.id)?.status;
                if (estado === 'aplicada') summary.sent += 1;
                else if (estado === 'fallida') summary.failed += 1;
                else summary.pending += 1;
            }
        } catch (error) {
            logger.captureException(error, { context: 'outbox:flush' });
        } finally {
            flushing = false;
            // Purga barata del historial resuelto en cada flush: evita que la
            // tabla crezca sin límite (aplicadas >7d, fallidas >30d, cap 500).
            try {
                repository.pruneResolved();
            } catch {
                // La purga nunca debe romper el flush.
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

            await flush();

            const actual = repository.get(intent.id);
            return (actual as OutboxIntent<TPayload> | null) ?? intent;
        },

        flush,

        list: () => repository.list(),
        listUnresolved: getSnapshot,
        getSnapshot,
        pendingCount: () => getSnapshot().length,

        retry: async (id: string) => {
            repository.retry(id);
            notify();
            await flush();
            return repository.get(id);
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
    };
}
