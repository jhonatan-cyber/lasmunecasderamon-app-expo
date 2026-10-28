import { useCallback, useState, useSyncExternalStore } from 'react';
import { useConnectivity } from '@/hooks/useConnectivity';
import { getOutbox, type FlushSummary, type OutboxIntent } from '@/services/outbox';
import logger from '@/utils/logger';

export interface UseOutboxReturn {
    intents: OutboxIntent[];
    pendingCount: number;
    failedCount: number;
    unownedCount: number;
    isOffline: boolean;
    isFlushing: boolean;
    flush: () => Promise<FlushSummary>;
    retry: (id: string) => Promise<OutboxIntent | null>;
    discard: (id: string) => void;
}

const SIN_INTENCIONES: OutboxIntent[] = [];
const SIN_INTENTOS: FlushSummary = { skipped: true, sent: 0, pending: 0, failed: 0 };

const subscribeToOutbox = (onChange: () => void) => {
    try {
        return getOutbox().subscribe(onChange);
    } catch (error) {
        logger.captureException(error, { context: 'useOutbox:subscribe' });
        return () => { };
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

export const useOutbox = (): UseOutboxReturn => {
    const { isOffline } = useConnectivity();
    const intents = useSyncExternalStore(
        subscribeToOutbox,
        getOutboxSnapshot,
        getOutboxSnapshot
    );
    const [isFlushing, setIsFlushing] = useState(false);
    let unownedCount = 0;
    try { unownedCount = getOutbox().unownedCount(); } catch { /* Sin almacenamiento. */ }

    const flush = useCallback(async () => {
        setIsFlushing(true);
        try {
            return await getOutbox().flush();
        } catch (error) {
            logger.captureException(error, { context: 'useOutbox:flush' });
            return SIN_INTENTOS;
        } finally {
            setIsFlushing(false);
        }
    }, []);

    const retry = useCallback(async (id: string) => {
        try {
            return await getOutbox().retry(id);
        } catch (error) {
            logger.captureException(error, { context: 'useOutbox:retry' });
            return null;
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
        unownedCount,
        isOffline,
        isFlushing,
        flush,
        retry,
        discard,
    };
};
