import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore, type User } from '@/store/authStore';
import { OFFLINE_SESSION_GRACE_MS, OFFLINE_SESSION_STORAGE_KEY } from '@/utils/offlineSession';

// Siempre en el pasado respecto al reloj real: los casos que no inyectan
// `now` usan `Date.now()`.
const NOW = 1_700_000_000_000;

const USER: User = {
    id: 'u-1',
    name: 'Pepe',
    lastName: 'Pérez',
    email: 'pepe@lasmunecasderamon.com',
    role: 'cajero',
    foto: '',
    username: 'pepe',
};

const readStoredSession = async () => {
    const raw = await AsyncStorage.getItem(OFFLINE_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
};

describe('authStore · sesión offline', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        useAuthStore.setState({
            user: null,
            token: null,
            isLoading: false,
            sessionExpired: false,
            offlineSession: null,
            tempAuthData: null,
        });
    });

    describe('startOfflineSession', () => {
        it('debe persistir el marcador y abrir la ventana offline', async () => {
            useAuthStore.setState({ user: USER });

            await useAuthStore.getState().startOfflineSession(NOW);

            expect(useAuthStore.getState().offlineSession).toEqual({ userId: 'u-1', savedAt: NOW });
            expect(await readStoredSession()).toEqual({ userId: 'u-1', savedAt: NOW });
            expect(useAuthStore.getState().canWorkOffline(NOW)).toBe(true);
        });

        it('no debe marcar nada sin usuario', async () => {
            await useAuthStore.getState().startOfflineSession(NOW);

            expect(useAuthStore.getState().offlineSession).toBeNull();
            expect(await readStoredSession()).toBeNull();
            expect(useAuthStore.getState().canWorkOffline(NOW)).toBe(false);
        });

        it('debe cerrar la ventana pasada la gracia', async () => {
            useAuthStore.setState({ user: USER });

            await useAuthStore.getState().startOfflineSession(NOW);

            expect(
                useAuthStore.getState().canWorkOffline(NOW + OFFLINE_SESSION_GRACE_MS + 1)
            ).toBe(false);
        });
    });

    describe('loadOfflineSession', () => {
        it('debe leer el marcador guardado', async () => {
            await AsyncStorage.setItem(
                OFFLINE_SESSION_STORAGE_KEY,
                JSON.stringify({ userId: 'u-1', savedAt: NOW })
            );
            useAuthStore.setState({ user: USER });

            const session = await useAuthStore.getState().loadOfflineSession();

            expect(session).toEqual({ userId: 'u-1', savedAt: NOW });
            expect(useAuthStore.getState().canWorkOffline(NOW)).toBe(true);
        });

        it('debe descartar el marcador de otro usuario', async () => {
            await AsyncStorage.setItem(
                OFFLINE_SESSION_STORAGE_KEY,
                JSON.stringify({ userId: 'otro-usuario', savedAt: NOW })
            );
            useAuthStore.setState({ user: USER });

            const session = await useAuthStore.getState().loadOfflineSession();

            expect(session).toBeNull();
            expect(await readStoredSession()).toBeNull();
        });

        it('debe tolerar un marcador ilegible', async () => {
            await AsyncStorage.setItem(OFFLINE_SESSION_STORAGE_KEY, '{no-es-json');
            useAuthStore.setState({ user: USER });

            expect(await useAuthStore.getState().loadOfflineSession()).toBeNull();
        });
    });

    describe('clearOfflineSession', () => {
        it('debe borrar el marcador persistido y el de memoria', async () => {
            useAuthStore.setState({ user: USER });
            await useAuthStore.getState().startOfflineSession(NOW);

            await useAuthStore.getState().clearOfflineSession();

            expect(useAuthStore.getState().offlineSession).toBeNull();
            expect(await readStoredSession()).toBeNull();
        });
    });

    describe('login y logout', () => {
        it('el login debe abrir la ventana offline', async () => {
            const { apiClientSafe } = await import('@/api/client');
            vi.mocked(apiClientSafe).mockResolvedValueOnce({
                success: true,
                token: 'token-de-prueba',
                refreshToken: 'refresh-de-prueba',
                user: USER,
            } as never);

            await useAuthStore.getState().login('pepe@lasmunecasderamon.com', '10571705');

            const session = useAuthStore.getState().offlineSession;
            expect(session?.userId).toBe('u-1');
            expect(useAuthStore.getState().canWorkOffline()).toBe(true);
            expect(await readStoredSession()).toEqual(session);
        });

        it('el logout debe cerrar la ventana offline', async () => {
            const { apiClientSafe } = await import('@/api/client');
            vi.mocked(apiClientSafe).mockResolvedValue({ success: true } as never);
            useAuthStore.setState({ user: USER, token: 'token' });
            await useAuthStore.getState().startOfflineSession(NOW);

            await useAuthStore.getState().logout();

            expect(useAuthStore.getState().offlineSession).toBeNull();
            expect(await readStoredSession()).toBeNull();
        });
    });

    describe('checkAuth', () => {
        it('NO debe crear el marcador sin contacto con el servidor (solo cargarlo)', async () => {
            // Sin validación del backend, regalar 12h de gracia offline con un
            // token quizás revocado es peor que arrancar sin ventana: esta se
            // abre con el primer 2xx (setSessionConfirmedHandler) o el login.
            const { TokenStorage } = await import('@/utils/tokenStorage');
            vi.mocked(TokenStorage.getToken).mockResolvedValue('token-de-prueba');
            await AsyncStorage.setItem('user', JSON.stringify(USER));

            await useAuthStore.getState().checkAuth();

            expect(useAuthStore.getState().offlineSession).toBeNull();
            expect(await readStoredSession()).toBeNull();
            // ...y por tanto no se puede operar offline hasta el primer 2xx.
            expect(useAuthStore.getState().canWorkOffline()).toBe(false);
        });

        it('debe respetar el marcador ya guardado', async () => {
            const { TokenStorage } = await import('@/utils/tokenStorage');
            vi.mocked(TokenStorage.getToken).mockResolvedValue('token-de-prueba');
            await AsyncStorage.setItem('user', JSON.stringify(USER));
            await AsyncStorage.setItem(
                OFFLINE_SESSION_STORAGE_KEY,
                JSON.stringify({ userId: 'u-1', savedAt: NOW })
            );

            await useAuthStore.getState().checkAuth();

            expect(useAuthStore.getState().offlineSession).toEqual({ userId: 'u-1', savedAt: NOW });
        });
    });

    describe('refreshUser', () => {
        it('debe reiniciar la ventana cuando el servidor responde', async () => {
            const { apiClientSafe } = await import('@/api/client');
            vi.mocked(apiClientSafe).mockResolvedValueOnce({
                success: true,
                user: { id: 'u-1', name: 'Pepe actualizado' },
            } as never);
            useAuthStore.setState({ user: USER, offlineSession: { userId: 'u-1', savedAt: NOW } });

            const refreshed = await useAuthStore.getState().refreshUser();

            expect(refreshed).toBe(true);
            expect(useAuthStore.getState().offlineSession?.userId).toBe('u-1');
            expect(useAuthStore.getState().offlineSession?.savedAt).toBeGreaterThan(NOW);
        });
    });
});
