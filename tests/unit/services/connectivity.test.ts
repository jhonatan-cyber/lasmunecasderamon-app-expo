import { describe, it, expect, vi } from 'vitest';

import { classifyNetworkState, ConnectivityMonitor } from '@/services/connectivity';

describe('classifyNetworkState', () => {
    it('debe devolver unknown cuando no hay snapshot', () => {
        expect(classifyNetworkState(null)).toBe('unknown');
        expect(classifyNetworkState(undefined)).toBe('unknown');
        expect(classifyNetworkState({})).toBe('unknown');
    });

    it('debe devolver offline cuando no hay conexión', () => {
        expect(classifyNetworkState({ isConnected: false })).toBe('offline');
        expect(classifyNetworkState({ isConnected: false, isInternetReachable: true })).toBe(
            'offline'
        );
    });

    it('debe devolver offline con wifi asociado pero sin salida a internet', () => {
        expect(
            classifyNetworkState({ isConnected: true, isInternetReachable: false })
        ).toBe('offline');
    });

    it('debe devolver online con conexión confirmada', () => {
        expect(classifyNetworkState({ isConnected: true })).toBe('online');
        expect(classifyNetworkState({ isConnected: true, isInternetReachable: true })).toBe(
            'online'
        );
    });

    it('debe devolver online si lo único confirmado es el alcance de internet', () => {
        expect(classifyNetworkState({ isInternetReachable: true })).toBe('online');
    });
});

describe('ConnectivityMonitor', () => {
    it('debe arrancar en unknown sin asumir que hay red', () => {
        const monitor = new ConnectivityMonitor();

        expect(monitor.getState()).toBe('unknown');
        expect(monitor.isOnline()).toBe(false);
        expect(monitor.isOffline()).toBe(false);
    });

    it('debe avisar a los suscriptores solo cuando el estado cambia', () => {
        const monitor = new ConnectivityMonitor();
        const listener = vi.fn();
        monitor.subscribe(listener);

        monitor.handleNetworkState({ isConnected: true });
        monitor.handleNetworkState({ isConnected: true, isInternetReachable: true });

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith('online');

        monitor.handleNetworkState({ isConnected: false });

        expect(listener).toHaveBeenCalledTimes(2);
        expect(listener).toHaveBeenLastCalledWith('offline');
    });

    it('debe permitir desuscribirse', () => {
        const monitor = new ConnectivityMonitor();
        const listener = vi.fn();

        const unsubscribe = monitor.subscribe(listener);
        unsubscribe();
        monitor.handleNetworkState({ isConnected: true });

        expect(listener).not.toHaveBeenCalled();
    });

    it('no debe romperse si un suscriptor lanza', () => {
        const monitor = new ConnectivityMonitor();
        const other = vi.fn();

        monitor.subscribe(() => {
            throw new Error('boom');
        });
        monitor.subscribe(other);

        expect(() => monitor.handleNetworkState({ isConnected: true })).not.toThrow();
        expect(other).toHaveBeenCalledWith('online');
    });

    it('debe tomar el estado de expo-network al arrancar', async () => {
        const Network = await import('expo-network');
        vi.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({
            isConnected: true,
            isInternetReachable: true,
        });

        const monitor = new ConnectivityMonitor();

        await expect(monitor.start()).resolves.toBe('online');
        expect(monitor.isOnline()).toBe(true);
    });

    it('debe arrancar una sola vez y quedarse en unknown si expo-network falla', async () => {
        const Network = await import('expo-network');
        vi.mocked(Network.getNetworkStateAsync).mockClear();
        vi.mocked(Network.getNetworkStateAsync).mockRejectedValueOnce(
            new Error('módulo nativo ausente')
        );

        const monitor = new ConnectivityMonitor();

        await expect(monitor.start()).resolves.toBe('unknown');
        await expect(monitor.start()).resolves.toBe('unknown');
        expect(vi.mocked(Network.getNetworkStateAsync)).toHaveBeenCalledTimes(1);
    });

    it('debe suscribirse a los cambios nativos de red', async () => {
        const Network = await import('expo-network');
        vi.mocked(Network.getNetworkStateAsync).mockResolvedValueOnce({ isConnected: true });

        const monitor = new ConnectivityMonitor();
        const listener = vi.fn();
        monitor.subscribe(listener);

        await monitor.start();

        const addListener = vi.mocked(Network.addNetworkStateListener);
        const emit = addListener.mock.calls[addListener.mock.calls.length - 1]?.[0];
        expect(emit).toBeTypeOf('function');

        emit?.({ isConnected: false });

        expect(monitor.getState()).toBe('offline');
        expect(listener).toHaveBeenCalledWith('offline');
    });
});
