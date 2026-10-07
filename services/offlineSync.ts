/**
 * @deprecated Cola offline legacy. No encolar nada nuevo aquí: usar
 * `services/outbox` (SQLite, idempotente, con estados visibles).
 *
 * Se conserva el drenado para no varar colas ya guardadas en dispositivos
 * (`offline_request_queue`). El envío pasa por `apiClientSafe`, que desde la
 * Fase 1 añade `x-idempotency-key` global, así que el drenado legacy también
 * quedó idempotente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { connectivity } from '@/services/connectivity';
import { createQueueId } from '@/utils/ids';
import logger from '@/utils/logger';

export { createQueueId };


interface QueuedRequest {
    id: string;
    endpoint: string;
    method: string;
    body: Record<string, unknown>;
    timestamp: number;
    retries: number;
}

const QUEUE_KEY = 'offline_request_queue';
const FAILED_QUEUE_KEY = 'offline_request_failed_queue';
const SYNC_STATUS_KEY = 'offline_sync_status';
const MAX_RETRIES = 3;
/** Tope de fallidos conservados para conciliar (el resto se descarta con log). */
const MAX_FAILED_KEPT = 50;

class OfflineSyncManager {
    private syncInProgress: boolean = false;
    private listeners: Set<() => void> = new Set();
    /** Mutex en memoria: serializa las escrituras read-modify-write. */
    private writeChain: Promise<void> = Promise.resolve();

    private async withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
        const run = this.writeChain.then(fn);
        // La cadena nunca se rompe por un fallo: el siguiente igual entra.
        this.writeChain = run.then(() => {}, () => {});
        return run;
    }

    constructor() {
        // Drena al volver la red. La conectividad es la unificada
        // (services/connectivity), no un listener propio: antes había dos
        // estados de red que podían contradecirse.
        connectivity.subscribe(state => {
            if (state === 'online') this.triggerSync();
            this.notifyListeners();
        });
        void connectivity.start();
    }

    addListener(callback: () => void) {
        this.listeners.add(callback);
        return () => { this.listeners.delete(callback); };
    }

    private notifyListeners() {
        this.listeners.forEach(cb => cb());
    }

    isConnected(): boolean {
        return connectivity.isOnline();
    }

    /** @deprecated Usar `outbox.enqueue`. Solo se mantiene por compatibilidad. */
    async queueRequest(endpoint: string, method: string, body: Record<string, unknown>): Promise<void> {
        logger.warn('offlineSync.queueRequest está deprecado: migrar a outbox.enqueue', { endpoint });
        await this.withWriteLock(async () => {
            const queue = await this.getQueue();

            const newRequest: QueuedRequest = {
                id: createQueueId(),
                endpoint,
                method,
                body,
                timestamp: Date.now(),
                retries: 0
            };

            queue.push(newRequest);
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        });

        this.notifyListeners();

        if (connectivity.isOnline()) {
            this.triggerSync();
        }
    }

    async getQueue(): Promise<QueuedRequest[]> {
        const data = await AsyncStorage.getItem(QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    }

    async getPendingCount(): Promise<number> {
        const queue = await this.getQueue();
        return queue.length;
    }

    /** Fallidos que agotaron reintentos (para conciliar, no se reintentan solos). */
    async getFailed(): Promise<QueuedRequest[]> {
        try {
            const data = await AsyncStorage.getItem(FAILED_QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async clearFailed(): Promise<void> {
        await AsyncStorage.removeItem(FAILED_QUEUE_KEY);
    }

    async clearQueue(): Promise<void> {
        await AsyncStorage.removeItem(QUEUE_KEY);
        this.notifyListeners();
    }

    async triggerSync(): Promise<void> {
        if (!connectivity.isOnline() || this.syncInProgress) return;
        
        this.syncInProgress = true;
        
        try {
            const queue = await this.getQueue();
            
            if (queue.length === 0) {
                await this.setSyncStatus({ lastSync: Date.now(), success: true, pendingCount: 0 });
                return;
            }

            const { apiClientSafe } = await import('@/api/client-safe');
            let successCount = 0;
            const failedRequests: QueuedRequest[] = [];
            const exhaustedRequests: QueuedRequest[] = [];

            for (const req of queue) {
                try {
                    // apiClientSafe añade x-idempotency-key: el reenvío no duplica.
                    await apiClientSafe(req.endpoint, {
                        method: req.method,
                        body: JSON.stringify(req.body),
                        retries: 0
                    });
                    successCount++;
                } catch (err) {
                    if (req.retries < MAX_RETRIES) {
                        req.retries++;
                        failedRequests.push(req);
                    } else {
                        // Antes se descartaba en silencio: ahora queda en la
                        // lista de fallidos para conciliar.
                        logger.warn('offlineSync: petición agotó reintentos, pasa a fallidos', {
                            endpoint: req.endpoint,
                            id: req.id,
                            error: err instanceof Error ? err.message : String(err),
                        });
                        exhaustedRequests.push(req);
                    }
                }
            }

            await this.withWriteLock(async () => {
                await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedRequests));
                if (exhaustedRequests.length > 0) {
                    const prev = await this.getFailed();
                    const merged = [...exhaustedRequests, ...prev].slice(0, MAX_FAILED_KEPT);
                    await AsyncStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(merged));
                }
            });
            
            await this.setSyncStatus({
                lastSync: Date.now(),
                success: failedRequests.length === 0,
                pendingCount: failedRequests.length,
                syncedCount: successCount
            });
        } catch (error) {
            logger.captureException(error, { context: 'OfflineSync:sync' });
            await this.setSyncStatus({ lastSync: Date.now(), success: false, pendingCount: (await this.getQueue()).length });
        } finally {
            this.syncInProgress = false;
            this.notifyListeners();
        }
    }

    private async setSyncStatus(status: Record<string, unknown>): Promise<void> {
        await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
    }

    async getSyncStatus(): Promise<{ lastSync: number; pendingCount: number } | null> {
        const data = await AsyncStorage.getItem(SYNC_STATUS_KEY);
        if (!data) return null;
        
        const status = JSON.parse(data);
        return {
            lastSync: status.lastSync,
            pendingCount: status.pendingCount || 0
        };
    }
}

export const offlineSync = new OfflineSyncManager();

export const queueRequest = (endpoint: string, method: string, body: Record<string, unknown>) => {
    return offlineSync.queueRequest(endpoint, method, body);
};

export const getPendingCount = () => offlineSync.getPendingCount();

export const triggerSync = () => offlineSync.triggerSync();

export const isOnline = () => offlineSync.isConnected();

/** @deprecated Solo lectura de fallidos legacy para conciliar. */
export const getFailedRequests = () => offlineSync.getFailed();

