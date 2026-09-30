import { beforeEach, describe, expect, it, vi } from 'vitest';

import { connectivity } from '@/services/connectivity';
import { blockOffline, OFFLINE_BLOCKED_ACTIONS } from '@/utils/offlineGuard';

const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/utils/toast-lazy', () => ({ showToast }));

describe('blockOffline', () => {
    beforeEach(() => {
        showToast.mockReset();
        // Arranca sin estado de red confirmado, como al abrir la app.
        connectivity.handleNetworkState({});
    });

    it('debe dejar pasar la operación cuando hay red confirmada', () => {
        expect(blockOffline('caja', () => true)).toBe(true);
        expect(showToast).not.toHaveBeenCalled();
    });

    it('debe bloquear y explicar el motivo cuando no hay red', () => {
        expect(blockOffline('cuenta', () => false)).toBe(false);

        expect(showToast).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'error',
                text1: OFFLINE_BLOCKED_ACTIONS.cuenta.title,
                text2: OFFLINE_BLOCKED_ACTIONS.cuenta.message,
            })
        );
    });

    it('debe avisar distinto según la operación bloqueada', () => {
        blockOffline('prepago', () => false);
        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({ text2: OFFLINE_BLOCKED_ACTIONS.prepago.message })
        );

        showToast.mockReset();
        blockOffline('caja', () => false);
        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({ text2: OFFLINE_BLOCKED_ACTIONS.caja.message })
        );

        expect(OFFLINE_BLOCKED_ACTIONS.caja.message).not.toBe(
            OFFLINE_BLOCKED_ACTIONS.prepago.message
        );
    });

    it('cada operación bloqueada debe tener un motivo propio y no genérico', () => {
        const mensajes = Object.values(OFFLINE_BLOCKED_ACTIONS).map(a => a.message);

        expect(new Set(mensajes).size).toBe(mensajes.length);
        mensajes.forEach(mensaje => expect(mensaje.length).toBeGreaterThan(30));
    });

    it('sin estado de red confirmado deja pasar: solo el offline corta', () => {
        // `unknown`: todavía no contestó expo-network.
        expect(blockOffline('cuenta')).toBe(true);
        expect(showToast).not.toHaveBeenCalled();

        connectivity.handleNetworkState({ isConnected: false });
        expect(blockOffline('cuenta')).toBe(false);
        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({ text2: OFFLINE_BLOCKED_ACTIONS.cuenta.message })
        );

        showToast.mockReset();
        connectivity.handleNetworkState({ isConnected: true, isInternetReachable: true });
        expect(blockOffline('cuenta')).toBe(true);
        expect(showToast).not.toHaveBeenCalled();
    });
});
