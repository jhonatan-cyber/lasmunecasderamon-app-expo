import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';

describe('authStore', () => {
    beforeEach(() => {
        useAuthStore.setState({
            user: null,
            token: null,
            isLoading: true,
            sessionExpired: false,
            isBiometricEnabled: false,
            biometricType: null,
            isBiometricAvailable: false,
            tempAuthData: null,
        });
    });

    describe('estado inicial', () => {
        it('debe iniciar con valores por defecto', () => {
            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.isLoading).toBe(true);
            expect(state.sessionExpired).toBe(false);
            expect(state.isBiometricEnabled).toBe(false);
            expect(state.biometricType).toBeNull();
            expect(state.isBiometricAvailable).toBe(false);
            expect(state.tempAuthData).toBeNull();
        });
    });

    describe('clearSessionExpired', () => {
        it('debe limpiar el flag de sesión expirada', () => {
            useAuthStore.setState({ sessionExpired: true });
            useAuthStore.getState().clearSessionExpired();
            expect(useAuthStore.getState().sessionExpired).toBe(false);
        });
    });

    describe('setTempAuthData', () => {
        it('debe guardar datos temporales de autenticación', () => {
            const data = { username: 'test', password: 'pass123' };
            useAuthStore.getState().setTempAuthData(data);
            expect(useAuthStore.getState().tempAuthData).toEqual(data);
        });

        it('debe permitir limpiar tempAuthData con null', () => {
            useAuthStore.setState({ tempAuthData: { username: 'test', password: 'pass' } });
            useAuthStore.getState().setTempAuthData(null);
            expect(useAuthStore.getState().tempAuthData).toBeNull();
        });
    });

    describe('updateProfile', () => {
        it('debe actualizar parcialmente el usuario actual', async () => {
            const mockUser = {
                id: '1',
                name: 'Test',
                lastName: 'User',
                email: 'test@test.com',
                role: 'anfitriona',
                foto: '',
                username: 'test',
            };
            useAuthStore.setState({ user: mockUser });

            await useAuthStore.getState().updateProfile({ phone: '123456789' });
            expect(useAuthStore.getState().user?.phone).toBe('123456789');
        });

        it('no debe hacer nada si no hay usuario logueado', async () => {
            const initialState = { ...useAuthStore.getState() };
            await useAuthStore.getState().updateProfile({ phone: '123' });
            expect(useAuthStore.getState()).toEqual(initialState);
        });

        it('no debe actualizar si no hay cambios reales', async () => {
            const mockUser = {
                id: '1',
                name: 'Test',
                lastName: 'User',
                email: 'test@test.com',
                role: 'anfitriona',
                foto: '',
                username: 'test',
                nick: 'tester',
            };
            useAuthStore.setState({ user: mockUser });

            await useAuthStore.getState().updateProfile({ nick: 'tester' });
            expect(useAuthStore.getState().user?.nick).toBe('tester');
        });
    });

    describe('enable2FA / disable2FA', () => {
        it('enable2FA debe retornar false (no soportado)', async () => {
            const result = await useAuthStore.getState().enable2FA('password');
            expect(result).toBe(false);
        });

        it('disable2FA debe retornar false (no soportado)', async () => {
            const result = await useAuthStore.getState().disable2FA('password');
            expect(result).toBe(false);
        });
    });

    describe('checkBiometricAvailability', () => {
        it('debe marcar como no disponible si no hay hardware', async () => {
            const { hasHardwareAsync } = await import('expo-local-authentication');
            vi.mocked(hasHardwareAsync).mockResolvedValue(false);

            await useAuthStore.getState().checkBiometricAvailability();
            const state = useAuthStore.getState();
            expect(state.isBiometricAvailable).toBe(false);
            expect(state.biometricType).toBeNull();
        });

        it('debe detectar Face ID cuando está disponible', async () => {
            const la = await import('expo-local-authentication');
            vi.mocked(la.hasHardwareAsync).mockResolvedValue(true);
            vi.mocked(la.isEnrolledAsync).mockResolvedValue(true);
            vi.mocked(la.supportedAuthenticationTypesAsync).mockResolvedValue([la.AuthenticationType.FACIAL_RECOGNITION]);

            await useAuthStore.getState().checkBiometricAvailability();
            const state = useAuthStore.getState();
            expect(state.isBiometricAvailable).toBe(true);
            expect(state.biometricType).toBe('facial');
        });

        it('debe detectar huella digital cuando está disponible', async () => {
            const la = await import('expo-local-authentication');
            vi.mocked(la.hasHardwareAsync).mockResolvedValue(true);
            vi.mocked(la.isEnrolledAsync).mockResolvedValue(true);
            vi.mocked(la.supportedAuthenticationTypesAsync).mockResolvedValue([la.AuthenticationType.FINGERPRINT]);

            await useAuthStore.getState().checkBiometricAvailability();
            const state = useAuthStore.getState();
            expect(state.isBiometricAvailable).toBe(true);
            expect(state.biometricType).toBe('fingerprint');
        });
    });

    describe('authenticateWithBiometric', () => {
        it('debe retornar true si la autenticación es exitosa', async () => {
            const la = await import('expo-local-authentication');
            vi.mocked(la.authenticateAsync).mockResolvedValue({ success: true });

            const result = await useAuthStore.getState().authenticateWithBiometric();
            expect(result).toBe(true);
        });

        it('debe retornar false si la autenticación falla', async () => {
            const la = await import('expo-local-authentication');
            vi.mocked(la.authenticateAsync).mockResolvedValue({ success: false, error: 'unknown' as any });

            const result = await useAuthStore.getState().authenticateWithBiometric();
            expect(result).toBe(false);
        });
    });

    describe('saveCredentials / getCredentials / removeCredentials', () => {
        it('debe guardar y recuperar credenciales', async () => {
            const { setItemAsync, getItemAsync } = await import('expo-secure-store');
            vi.mocked(setItemAsync).mockResolvedValue();
            vi.mocked(getItemAsync).mockResolvedValue(JSON.stringify({ username: 'test', password: 'pass' }));

            await useAuthStore.getState().saveCredentials('test', 'pass');
            const creds = await useAuthStore.getState().getCredentials();
            expect(creds).toEqual({ username: 'test', password: 'pass' });
        });

        it('debe eliminar credenciales', async () => {
            const { deleteItemAsync } = await import('expo-secure-store');
            vi.mocked(deleteItemAsync).mockResolvedValue();

            await useAuthStore.getState().removeCredentials();
            expect(deleteItemAsync).toHaveBeenCalledWith('user_credentials');
        });
    });

    describe('setBiometricEnabled', () => {
        it('debe habilitar biometricos', async () => {
            await useAuthStore.getState().setBiometricEnabled(true);
            expect(useAuthStore.getState().isBiometricEnabled).toBe(true);
        });

        it('debe deshabilitar biometricos', async () => {
            useAuthStore.setState({ isBiometricEnabled: true });
            await useAuthStore.getState().setBiometricEnabled(false);
            expect(useAuthStore.getState().isBiometricEnabled).toBe(false);
        });
    });

    describe('checkAuth', () => {
        it('debe establecer isLoading en false al finalizar', async () => {
            await useAuthStore.getState().checkAuth();
            expect(useAuthStore.getState().isLoading).toBe(false);
        });

        it('debe cargar usuario desde AsyncStorage si hay token', async () => {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            const { TokenStorage } = await import('@/utils/tokenStorage');
            
            vi.mocked(TokenStorage.getToken).mockResolvedValue('test-token');
            vi.mocked(AsyncStorage.getItem).mockImplementation(async (key: string) => {
                if (key === 'user') return JSON.stringify({ id: '1', name: 'Test', email: 'test@test.com', role: 'admin', foto: '', lastName: '', username: 'test' });
                if (key === 'biometricEnabled') return 'true';
                return null;
            });

            await useAuthStore.getState().checkAuth();
            const state = useAuthStore.getState();
            expect(state.token).toBe('test-token');
            expect(state.user).toBeTruthy();
            expect(state.user?.name).toBe('Test');
            expect(state.isBiometricEnabled).toBe(true);
        });
    });
});
