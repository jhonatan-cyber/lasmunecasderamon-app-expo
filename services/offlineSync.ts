import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { NetworkError } from '@/api/client';

interface QueuedRequest {
    id: string;
    endpoint: string;
    method: string;
    body: any;
    timestamp: number;
    retries: number;
}

const QUEUE_KEY = 'offline_request_queue';
const SYNC_STATUS_KEY = 'offline_sync_status';
const MAX_RETRIES = 3;

class OfflineSyncManager {
    private isOnline: boolean = true;
    private syncInProgress: boolean = false;
    private listeners: Set<() => void> = new Set();

    constructor() {
        this.initNetworkListener();
    }

    private async initNetworkListener() {
        try {
            const state = await Network.getNetworkStateAsync();
            this.isOnline = state.isConnected ?? false;
            
            Network.addNetworkStateListener((state) => {
                const wasOffline = !this.isOnline;
                this.isOnline = state.isConnected ?? false;
                
                if (wasOffline && this.isOnline) {
                    this.triggerSync();
                }
                
                this.notifyListeners();
            });
        } catch (e) {
            console.log('Network listener init failed:', e);
        }
    }

    addListener(callback: () => void) {
        this.listeners.add(callback);
        return () => { this.listeners.delete(callback); };
    }

    private notifyListeners() {
        this.listeners.forEach(cb => cb());
    }

    isConnected(): boolean {
        return this.isOnline;
    }

    async queueRequest(endpoint: string, method: string, body: any): Promise<void> {
        const queue = await this.getQueue();
        
        const newRequest: QueuedRequest = {
            id: Math.random().toString(36).substr(2, 9),
            endpoint,
            method,
            body,
            timestamp: Date.now(),
            retries: 0
        };

        queue.push(newRequest);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        
        this.notifyListeners();
        
        if (this.isOnline) {
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

    async clearQueue(): Promise<void> {
        await AsyncStorage.removeItem(QUEUE_KEY);
        this.notifyListeners();
    }

    async triggerSync(): Promise<void> {
        if (!this.isOnline || this.syncInProgress) return;
        
        this.syncInProgress = true;
        
        try {
            const queue = await this.getQueue();
            
            if (queue.length === 0) {
                await this.setSyncStatus({ lastSync: Date.now(), success: true, pendingCount: 0 });
                return;
            }

            const { apiClient } = await import('@/api/client');
            let successCount = 0;
            const failedRequests: QueuedRequest[] = [];

            for (const req of queue) {
                try {
                    await apiClient(req.endpoint, {
                        method: req.method,
                        body: req.body,
                        retries: 0
                    });
                    successCount++;
                } catch (error) {
                    if (req.retries < MAX_RETRIES) {
                        req.retries++;
                        failedRequests.push(req);
                    }
                }
            }

            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedRequests));
            
            await this.setSyncStatus({
                lastSync: Date.now(),
                success: failedRequests.length === 0,
                pendingCount: failedRequests.length,
                syncedCount: successCount
            });
        } catch (error) {
            console.error('Sync failed:', error);
            await this.setSyncStatus({ lastSync: Date.now(), success: false, pendingCount: (await this.getQueue()).length });
        } finally {
            this.syncInProgress = false;
            this.notifyListeners();
        }
    }

    private async setSyncStatus(status: any): Promise<void> {
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

export const queueRequest = (endpoint: string, method: string, body: any) => {
    return offlineSync.queueRequest(endpoint, method, body);
};

export const getPendingCount = () => offlineSync.getPendingCount();

export const triggerSync = () => offlineSync.triggerSync();

export const isOnline = () => offlineSync.isConnected();

