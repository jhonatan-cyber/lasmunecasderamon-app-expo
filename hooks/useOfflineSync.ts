import { useState, useEffect, useCallback } from 'react';
import { offlineSync, isOnline, getPendingCount, triggerSync } from '../utils/offlineSync';

interface UseOfflineSyncReturn {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    lastSync: number | null;
    syncNow: () => Promise<void>;
    addOfflineListener: () => () => void;
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
    const [connected, setConnected] = useState(true);
    const [pending, setPending] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<number | null>(null);

    useEffect(() => {
        const loadInitialState = async () => {
            setConnected(isOnline());
            setPending(await getPendingCount());
            
            const status = await offlineSync.getSyncStatus();
            if (status) {
                setLastSync(status.lastSync);
            }
        };

        loadInitialState();

        const unsubscribe = offlineSync.addListener(() => {
            setConnected(isOnline());
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
        isOnline: connected,
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
    const { isOnline } = useOfflineSync();

    const query = async (): Promise<T | null> => {
        if (!isOnline) {
            console.log('Offline - skipping fetch for:', queryKey);
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