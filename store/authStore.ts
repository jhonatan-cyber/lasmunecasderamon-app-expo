import { apiClient, setTokenInMemory, setUnauthorizedHandler } from '@/api/client';
import logger from '@/utils/logger';
import { TokenStorage } from '@/utils/tokenStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export interface User {
    id: string;
    name: string;
    lastName: string;
    email: string;
    role: string;
    foto: string;
    username: string;
    phone?: string;
    address?: string;
    estado_civil?: string;
    nick?: string;
    qr_token?: string;
    two_factor_enabled?: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    sessionExpired: boolean;
    login: (username: string, password: string, codigo?: string, qr_token?: string) => Promise<{ requiereCodigo?: boolean, user?: User, asistenciaRegistrada?: boolean }>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearSessionExpired: () => void;
    tempAuthData: { username: string; password: string; userTmp?: any } | null;
    setTempAuthData: (data: { username: string; password: string; userTmp?: any } | null) => void;
    updateProfile: (partialUser: Partial<User>) => Promise<void>;
    isBiometricEnabled: boolean;
    setBiometricEnabled: (enabled: boolean) => Promise<void>;
    saveCredentials: (username: string, password: string) => Promise<void>;
    getCredentials: () => Promise<{ username: string; password: string } | null>;
    removeCredentials: () => Promise<void>;
    biometricType: 'fingerprint' | 'facial' | 'iris' | null;
    isBiometricAvailable: boolean;
    checkBiometricAvailability: () => Promise<void>;
    authenticateWithBiometric: () => Promise<boolean>;
    enable2FA: (password: string) => Promise<boolean>;
    disable2FA: (password: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => {
    const unsupportedTwoFactorError = new Error('La configuración de 2FA aún no está disponible en el backend.');


    setUnauthorizedHandler(() => {
        if (get().user !== null) {
            set({ sessionExpired: true });
        }
    });

    return {
        user: null,
        token: null,
        isLoading: true,
        sessionExpired: false,
        isBiometricEnabled: false,
        biometricType: null,
        isBiometricAvailable: false,

        clearSessionExpired: () => set({ sessionExpired: false }),

        tempAuthData: null,
        setTempAuthData: (data) => set({ tempAuthData: data }),

        checkBiometricAvailability: async () => {
            try {
                const compatible = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                const isAvailable = compatible && enrolled;

                let biometricType: 'fingerprint' | 'facial' | 'iris' | null = null;

                if (isAvailable) {
                    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                        biometricType = 'facial';
                    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                        biometricType = 'fingerprint';
                    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
                        biometricType = 'iris';
                    }
                }

                set({ isBiometricAvailable: isAvailable, biometricType });
            } catch (error) {

                set({ isBiometricAvailable: false, biometricType: null });
            }
        },

        authenticateWithBiometric: async () => {
            try {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'AutentÃ­cate para acceder',
                    cancelLabel: 'Cancelar',
                    disableDeviceFallback: false,
                    fallbackLabel: 'Usar contraseÃ±a',
                });

                return result.success;
            } catch (error) {

                return false;
            }
        },

        enable2FA: async (password: string) => {
            try {
                logger.warn('2FA enable requested but backend support is not available', {
                    hasPassword: Boolean(password)
                });
                throw unsupportedTwoFactorError;
            } catch (error) {
                logger.warn('2FA enable skipped', { error });
                return false;
            }
        },

        disable2FA: async (password: string) => {
            try {
                logger.warn('2FA disable requested but backend support is not available', {
                    hasPassword: Boolean(password)
                });
                throw unsupportedTwoFactorError;
            } catch (error) {
                logger.warn('2FA disable skipped', { error });
                return false;
            }
        },

        login: async (username, password, codigo, qr_token) => {
            try {
                const payload: any = {};

                if (qr_token) {
                    payload.qr_token = qr_token;
                } else {
                    let emailToSend = username.trim();
                    if (!emailToSend.includes('@')) {
                        emailToSend = `${emailToSend}@lasmuÃ±ecasderamon.com`;
                    }
                    payload.email = emailToSend;
                    payload.password = password;
                }

                if (codigo) {
                    payload.codigo = codigo;
                }

                const response = await apiClient('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (response.requiereCodigo) {
                    return { requiereCodigo: true, user: response.user };
                }

                if (!response.success && !response.token) {
                    throw new Error(response.message || 'Error en autenticaciÃ³n');
                }

                const { token, user } = response;
                await TokenStorage.saveToken(token);
                await AsyncStorage.setItem('user', JSON.stringify(user));
                
                setTokenInMemory(token);
                set({ user, token, tempAuthData: null });

                let asistenciaRegistrada = false;
                if (user.qr_token && (user.role?.toLowerCase() === 'cajero' || user.role?.toLowerCase() === 'cajera')) {
                    const now = new Date();
                    const hour = now.getHours();
                    if (hour >= 21 && hour < 23) {
                        try {
                            await apiClient('/attendance/register', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ qr_token: user.qr_token }),
                            });
                            asistenciaRegistrada = true;
                        } catch (e) {
                            logger.warn('Auto-assist registration skipped', { error: e });
                        }
                    }
                }

                return { requiereCodigo: false, asistenciaRegistrada };
            } catch (error: any) {
                throw new Error(error.message);
            }
        },

        logout: async () => {
            try {
                await apiClient('/auth/logout', { method: 'POST' });
            } catch (e) {
                logger.error('API Logout failed', { error: e });
            }
            await TokenStorage.removeTokens();
            await AsyncStorage.removeItem('user');
            setTokenInMemory(null);
            set({ user: null, token: null, sessionExpired: false });
        },

        checkAuth: async () => {
            try {
                const withTimeout = (promise: Promise<any>, timeoutMs: number) => {
                    let timeoutHandle: any;
                    const timeoutPromise = new Promise((_, reject) => {
                        timeoutHandle = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
                    });
                    return Promise.race([
                        promise.then(result => {
                            clearTimeout(timeoutHandle);
                            return result;
                        }),
                        timeoutPromise
                    ]);
                };

                const token = await withTimeout(TokenStorage.getToken(), 2000).catch(() => null);
                const userStr = await withTimeout(AsyncStorage.getItem('user'), 2000).catch(() => null);
                if (token && userStr) {
                    setTokenInMemory(token);
                    set({ token, user: JSON.parse(userStr) });
                }

                const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
                set({ isBiometricEnabled: biometricEnabled === 'true' });

                await get().checkBiometricAvailability();
            } catch (e) {
                logger.error('Error in checkAuth', { error: e });
            } finally {
                set({ isLoading: false });
            }
        },

        setBiometricEnabled: async (enabled) => {
            await AsyncStorage.setItem('biometricEnabled', enabled.toString());
            set({ isBiometricEnabled: enabled });
            if (!enabled) {
                await SecureStore.deleteItemAsync('user_credentials');
            }
        },

        saveCredentials: async (username, password) => {
            await SecureStore.setItemAsync('user_credentials', JSON.stringify({ username, password }));
        },

        getCredentials: async () => {
            const credentials = await SecureStore.getItemAsync('user_credentials');
            return credentials ? JSON.parse(credentials) : null;
        },

        removeCredentials: async () => {
            await SecureStore.deleteItemAsync('user_credentials');
        },

        updateProfile: async (partialUser) => {
            const currentUser = get().user;
            if (currentUser) {
                // Verificar si hay cambios reales para evitar re-renders innecesarios
                const hasChanges = Object.keys(partialUser).some(
                    (key) => (partialUser as any)[key] !== (currentUser as any)[key]
                );
                
                if (hasChanges) {
                    const updatedUser = { ...currentUser, ...partialUser };
                    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                    set({ user: updatedUser });
                }
            }
        }
    };
});




