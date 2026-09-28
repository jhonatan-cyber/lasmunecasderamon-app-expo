import { useCallback, useState, useSyncExternalStore } from 'react';

import { useConnectivity } from '@/hooks/useConnectivity';
import { getOutbox, type OutboxIntent } from '@/services/outbox';
import logger from '@/utils/logger';

export interface UseOutboxReturn {
    /** Intenciones sin resolver (pendientes, en vuelo y fallidas). */
    intents: OutboxIntent[];
    pendingCount: number;
    failedCount: number;
    isOffline: boolean;
    isFlushing: boolean;
    flush: () => Promise<void>;
    retry: (id: string) => Promise<void>;
    discard: (id: string) => void;
}

const SIN_INTENCIONES: OutboxIntent[] = [];

/**
 * La cola es un sistema externo: se lee como store (`useSyncExternalStore`) en
 * vez de copiarla a estado local en un efecto, así no hay renders en cascada ni
 * desfase entre lo que muestra la pantalla y lo que hay guardado.
 */
const subscribeToOutbox = (onChange: () => void) => {
    try {
        return getOutbox().subscribe(onChange);
    } catch (error) {
        logger.captureException(error, { context: 'useOutbox:subscribe' });
        return () => {};
    }
};

const getOutboxSnapshot = (): OutboxIntent[] => {
    try {
        return getOutbox().getSnapshot();
    } catch (error) {
        logger.captureException(error, { context: 'useOutbox:snapshot' });
        return SIN_INTENCIONES;
    }
};

/**
 * Estado de la cola de intenciones del garzón: lo que ya se hizo en el
 * dispositivo y todavía no confirmó el servidor.
 */
export const useOutbox = (): UseOutboxReturn => {
    const { isOffline } = useConnectivity();
    const intents = useSyncExternalStore(
        subscribeToOutbox,
        getOutboxSnapshot,
        getOutboxSnapshot
    );
    const [isFlushing, setIsFlushing] = useState(false);

    const flush = useCallback(async () => {
        setIsFlushing(true);
        try {
            await getOutbox().flush();
        } catch (error) {
            logger.captureException(error, { context: 'useOutbox:flush' });
        } finally {
            setIsFlushing(false);
        }
    }, []);

    const retry = useCallback(async (id: string) => {
        try {
            await getOutbox().retry(id);
        } catch (error) {
            logger.captureException(error, { context: 'useOutbox:retry' });
        }
    }, []);

    const discard = useCallback((id: string) => {
        try {
            getOutbox().discard(id);
        } catch (error) {
            logger.captureException(error, { context: 'useOutbox:discard' });
        }
    }, []);

    return {
        intents,
        pendingCount: intents.length,
        failedCount: intents.filter(intent => intent.status === 'fallida').length,
        isOffline,
        isFlushing,
        flush,
        retry,
        discard,
    };
};
