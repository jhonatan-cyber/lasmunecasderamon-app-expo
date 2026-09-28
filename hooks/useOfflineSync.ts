import { useState, useEffect, useCallback } from 'react';
import { offlineSync, getPendingCount, triggerSync } from '@/services/offlineSync';
import { useConnectivity } from '@/hooks/useConnectivity';

interface UseOfflineSyncReturn {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    lastSync: number | null;
    syncNow: () => Promise<void>;
    addOfflineListener: (callback: () => void) => () => void;
}

/**
 * Estado de la cola de sincronización. La conectividad ya **no** vive acá: sale
 * del monitor unificado (`services/connectivity`), que además nunca asume que
 * hay red antes de que `expo-network` responda.
 */
export const useOfflineSync = (): UseOfflineSyncReturn => {
    const { isOnline } = useConnectivity();
    const [pending, setPending] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<number | null>(null);

    useEffect(() => {
        const loadInitialState = async () => {
            setPending(await getPendingCount());

            const status = await offlineSync.getSyncStatus();
            if (status) {
                setLastSync(status.lastSync);
            }
        };

        loadInitialState();

        const unsubscribe = offlineSync.addListener(() => {
            getPendingCount().then(setPending);

            offlineSync.getSyncStatus().then((status) => {
                if (status) setLastSync(status.lastSync);
            });
        });

        return unsubscribe;
    }, []);

    const syncNow = useCallback(async () => {
        setSyncing(true);
        try {
            await triggerSync();
        } finally {
            setSyncing(false);
            setPending(await getPendingCount());
        }
    }, []);

    return {
        isOnline,
        pendingCount: pending,
        isSyncing: syncing,
        lastSync,
        syncNow,
        addOfflineListener: offlineSync.addListener
    };
};

export const useOfflineAwareQuery = <T>(
    queryKey: string,
    fetchFn: () => Promise<T>,
    options?: {
        onSuccess?: (data: T) => void;
        onError?: (error: Error) => void;
    }
) => {
    const { isOffline } = useConnectivity();

    const query = async (): Promise<T | null> => {
        // Solo se evita la petición cuando hay **confirmación** de que no hay
        // red; en `unknown` (arranque) conviene intentar y dejar que falle.
        if (isOffline) {
            return null;
        }

        try {
            const data = await fetchFn();
            options?.onSuccess?.(data);
            return data;
        } catch (error) {
            options?.onError?.(error as Error);
            throw error;
        }
    };

    return query;
};
