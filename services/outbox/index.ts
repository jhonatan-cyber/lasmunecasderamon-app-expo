import { connectivity } from '@/services/connectivity';
import { getMirrorDriver, initMirror } from '@/services/mirror';
import logger from '@/utils/logger';
import { useAuthStore } from '@/store/authStore';
import { AppState } from 'react-native';
import { reconcileIntent } from './reconcile';

import { createOutboxRepository, type OutboxRepository } from './repository';
import { createOutboxService, type OutboxService } from './service';

export type { OutboxEnqueueInput, OutboxIntent, OutboxIntentStatus, OutboxIntentType } from './types';
export type { OutboxRepository } from './repository';
export type { ConsumptionsIntentPayload, FlushSummary, IntentSender, OutboxService } from './service';
export {
    IDEMPOTENCY_HEADER,
    INTENT_SENDERS,
    MAX_OUTBOX_ATTEMPTS,
    isRetryableError,
    orderFlushable,
    stampDeviceDate,
} from './service';

let repository: OutboxRepository | null = null;
let service: OutboxService | null = null;
let initialized = false;

/**
 * Cola de intenciones (singleton perezoso). Usa el mismo SQLite que el espejo
 * (la tabla `outbox` llega con la migración 2) y por eso asegura el esquema
 * antes de abrirla.
 */
export function getOutbox(): OutboxService {
    if (!service) {
        if (initMirror() === null) {
            logger.warn('Outbox: el espejo local no está disponible; la cola puede fallar');
        }
        const ownerId = () => {
            const auth = useAuthStore.getState();
            return auth.user?.id && !auth.sessionExpired ? String(auth.user.id) : null;
        };
        repository = createOutboxRepository(getMirrorDriver(), { ownerId });
        service = createOutboxService(repository, { ownerId, reconcile: reconcileIntent, scheduleRetries: true });
    }
    return service;
}

/** Repositorio crudo (tests y pantallas de diagnóstico). */
export function getOutboxRepository(): OutboxRepository | null {
    return repository;
}

/**
 * Arranque: drena lo que quedó pendiente y vuelve a intentar cada vez que se
 * recupera la red. Nunca lanza: si SQLite no está disponible, la app sigue.
 */
export function initOutbox(): void {
    if (initialized) return;

    try {
        const outbox = getOutbox();
        initialized = true;

        connectivity.subscribe(state => {
            outbox.refreshIdentity();
            if (state === 'online') void outbox.flush();
        });
        AppState.addEventListener('change', state => {
            if (state === 'active') void outbox.flush();
        });
        useAuthStore.subscribe((state, previous) => {
            if (state.user?.id !== previous.user?.id || state.sessionExpired !== previous.sessionExpired || state.token !== previous.token) {
                outbox.refreshIdentity();
                void outbox.flush();
            }
        });

        void outbox.flush();
    } catch (error) {
        logger.captureException(error, { context: 'outbox:init' });
    }
}

/** Solo tests: reemplaza el singleton por un servicio inyectado. */
export function setOutboxForTests(injected: OutboxService | null): void {
    service?.stop();
    service = injected;
    repository = null;
    initialized = true;
}
