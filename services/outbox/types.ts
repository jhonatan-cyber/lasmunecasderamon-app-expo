/**
 * Tipos de la cola de intenciones (outbox).
 *
 * Una intención es trabajo que el usuario ya hizo en el dispositivo y que
 * todavía no confirmó el servidor. Se guarda la intención de negocio —no el
 * request HTTP— porque el payload tiene que poder reinterpretarse, mostrarse al
 * usuario y, sobre todo, llevar un id estable que sirva de clave de
 * idempotencia al enviarla.
 */
export type OutboxIntentType =
    | 'order.create'
    | 'sale.create'
    | 'account.consumptions'
    /** Cobro de cuenta con su venta: el servidor lo hace en una sola transacción. */
    | 'account.checkout';

export type OutboxIntentStatus =
    /** Lista para enviar; también es el estado de los reintentos automáticos. */
    | 'pendiente'
    /** Se está enviando ahora mismo. */
    | 'enviando'
    /** El servidor la aplicó. */
    | 'aplicada'
    /** El servidor la rechazó o se agotaron los intentos: requiere revisión. */
    | 'fallida';

export interface OutboxIntent<TPayload = unknown> {
    /** Id local, único y estable: viaja como `x-idempotency-key`. */
    id: string;
    type: OutboxIntentType;
    payload: TPayload;
    /** Texto corto para la pantalla de pendientes. */
    label: string;
    createdAt: number;
    updatedAt: number;
    status: OutboxIntentStatus;
    attempts: number;
    lastError: string | null;
    appliedAt: number | null;
    /** Respuesta del servidor cuando se aplicó. */
    response: unknown | null;
}

export interface OutboxEnqueueInput<TPayload = unknown> {
    type: OutboxIntentType;
    payload: TPayload;
    label?: string;
}
