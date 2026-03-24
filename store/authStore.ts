import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { apiClient, setUnauthorizedHandler, setTokenInMemory } from '@/api/client';

const TokenStorage = {
    save: async (token: string) => {
        if (Platform.OS === 'web') {
            await AsyncStorage.setItem('token', token);
        } else {
            await SecureStore.setItemAsync('token', token);
        }
    },
    get: async () => {
        if (Platform.OS === 'web') {
            return await AsyncStorage.getItem('token');
        } else {
            return await SecureStore.getItemAsync('token');
        }
    },
    remove: async () => {
        if (Platform.OS === 'web') {
            await AsyncStorage.removeItem('token');
        } else {
            await SecureStore.deleteItemAsync('token');
        }
    }
};

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
                    promptMessage: 'Autentícate para acceder',
                    cancelLabel: 'Cancelar',
                    disableDeviceFallback: false,
                    fallbackLabel: 'Usar contraseña',
                });

                return result.success;
            } catch (error) {

                return false;
            }
        },

        enable2FA: async (password: string) => {
            try {
                const user = get().user;
                if (!user) return false;

                const response = await apiClient('/auth/2fa/enable', {
                    method: 'POST',
                    body: JSON.stringify({ password }),
                });

                if (response.success) {
                    set({
                        user: { ...user, two_factor_enabled: true },
                        isBiometricEnabled: true
                    });
                    await AsyncStorage.setItem('biometricEnabled', 'true');
                    return true;
                }
                return false;
            } catch (error) {

                return false;
            }
        },

        disable2FA: async (password: string) => {
            try {
                const user = get().user;
                if (!user) return false;

                const response = await apiClient('/auth/2fa/disable', {
                    method: 'POST',
                    body: JSON.stringify({ password }),
                });

                if (response.success) {
                    set({
                        user: { ...user, two_factor_enabled: false },
                        isBiometricEnabled: false
                    });
                    await AsyncStorage.setItem('biometricEnabled', 'false');
                    await SecureStore.deleteItemAsync('user_credentials');
                    return true;
                }
                return false;
            } catch (error) {

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
                        emailToSend = `${emailToSend}@lasmuñecasderamon.com`;
                    }
                    payload.email = emailToSend;
                    payload.password = password;
                }

                if (codigo) {
                    payload.codigo = codigo;
                }

                const response = await apiClient('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (response.requiereCodigo) {
                    return { requiereCodigo: true, user: response.user };
                }

                if (!response.success && !response.token) {
                    throw new Error(response.message || 'Error en autenticación');
                }

                const { token, user } = response;
                await TokenStorage.save(token);
                await AsyncStorage.setItem('user', JSON.stringify(user));
                
                setTokenInMemory(token);
                set({ user, token, tempAuthData: null });

                let asistenciaRegistrada = false;
                if (user.qr_token && (user.role?.toLowerCase() === 'cajero' || user.role?.toLowerCase() === 'cajera')) {
                    const now = new Date();
                    const hour = now.getHours();
                    if (hour >= 21 && hour < 23) {
                        try {
                            await apiClient('/asistencia/registrar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ qr_token: user.qr_token }),
                            });
                            asistenciaRegistrada = true;
                        } catch (e) {
                            console.log('Auto-assist registration skipped:', e);
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
                await apiClient('/logout', { method: 'POST' });
            } catch (e) {
                console.error('API Logout failed:', e);
            }
            await TokenStorage.remove();
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

                const token = await withTimeout(TokenStorage.get(), 2000).catch(() => null);
                const userStr = await withTimeout(AsyncStorage.getItem('user'), 2000).catch(() => null);
                if (token && userStr) {
                    setTokenInMemory(token);
                    set({ token, user: JSON.parse(userStr) });
                }

                const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
                set({ isBiometricEnabled: biometricEnabled === 'true' });

                await get().checkBiometricAvailability();
            } catch (e) {
                console.log("Error in checkAuth:", e);
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

