import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connectivity } from '@/services/connectivity';
import { createQueueId, offlineSync } from '@/services/offlineSync';

// La cola envía por `@/api/client-safe` (no por el barril `@/api/client`), así
// que se mockea ese módulo: sin esto el test hace fetch real.
vi.mock('@/api/client-safe', () => ({
    apiClientSafe: vi.fn(() => Promise.resolve({ success: true, data: [] })),
}));

describe('createQueueId', () => {
    it('debe generar ids únicos aunque se pida en ráfaga', () => {
        const ids = new Set(Array.from({ length: 200 }, () => createQueueId()));

        expect(ids.size).toBe(200);
    });

    it('debe componer tiempo y azar separados por guion', () => {
        const parts = createQueueId(() => 0.5).split('-');

        expect(parts).toHaveLength(2);
        expect(parts.every(part => part.length > 0)).toBe(true);
    });

    it('debe ser determinista con la fuente de azar inyectada', () => {
        vi.useFakeTimers();
        vi.setSystemTime(1_800_000_000_000);

        expect(createQueueId(() => 0.5)).toBe(createQueueId(() => 0.5));

        vi.useRealTimers();
    });
});

describe('offlineSync y la conectividad unificada', () => {
    beforeEach(async () => {
        // Deja que el bootstrap del monitor consuma el mock de expo-network para
        // que cada caso controle el estado de forma explícita.
        await connectivity.start();
        await offlineSync.clearQueue();
    });

    it('no debe asumir conexión mientras el estado es unknown', () => {
        connectivity.handleNetworkState({});

        expect(offlineSync.isConnected()).toBe(false);
    });

    it('debe seguir al monitor de conectividad', () => {
        connectivity.handleNetworkState({ isConnected: true });
        expect(offlineSync.isConnected()).toBe(true);

        connectivity.handleNetworkState({ isConnected: false });
        expect(offlineSync.isConnected()).toBe(false);
    });

    it('debe encolar sin red y no intentar enviar', async () => {
        const { apiClientSafe } = await import('@/api/client-safe');
        connectivity.handleNetworkState({ isConnected: false });
        vi.mocked(apiClientSafe).mockClear();

        await offlineSync.queueRequest('/orders', 'POST', { codigo: 'ABC12345' });

        expect(await offlineSync.getPendingCount()).toBe(1);
        expect(vi.mocked(apiClientSafe)).not.toHaveBeenCalled();
    });

    it('debe drenar la cola al volver la red', async () => {
        const { apiClientSafe } = await import('@/api/client-safe');
        connectivity.handleNetworkState({ isConnected: false });
        await offlineSync.queueRequest('/orders', 'POST', { codigo: 'ABC12345' });
        expect(await offlineSync.getPendingCount()).toBe(1);

        vi.mocked(apiClientSafe).mockClear();
        connectivity.handleNetworkState({ isConnected: true });

        await vi.waitFor(async () => {
            expect(await offlineSync.getPendingCount()).toBe(0);
        });
        expect(vi.mocked(apiClientSafe)).toHaveBeenCalledWith(
            '/orders',
            expect.objectContaining({ method: 'POST' })
        );
    });
});
