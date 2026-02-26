import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { apiClient } from '../api/client';

// Helper for cross-platform secure token storage
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
    id: number;
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
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string, codigo?: string) => Promise<{ requiereCodigo?: boolean, user?: User }>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    tempAuthData: { username: string; password: string; userTmp?: any } | null;
    setTempAuthData: (data: { username: string; password: string; userTmp?: any } | null) => void;
    updateProfile: (partialUser: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: true, // Empieza cargando para verificar token en secure store

    tempAuthData: null,
    setTempAuthData: (data) => set({ tempAuthData: data }),

    login: async (username, password, codigo) => {
        try {
            // Check domain
            let emailToSend = username.trim();
            if (!emailToSend.includes('@')) {
                emailToSend = `${emailToSend}@lasmuñecasderamon.com`;
            }

            const payload: any = { email: emailToSend, password };
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

            set({ user, token, tempAuthData: null });
            return { requiereCodigo: false };
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
        set({ user: null, token: null });
    },

    checkAuth: async () => {
        console.log("Starting checkAuth...");
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
            console.log("Got token from SecureStore");
            const userStr = await withTimeout(AsyncStorage.getItem('user'), 2000).catch(() => null);
            console.log("Got user from AsyncStorage");

            if (token && userStr) {
                set({ token, user: JSON.parse(userStr) });
            }
        } catch (e) {
            console.log("Error in checkAuth:", e);
        } finally {
            console.log("Setting isLoading to false");
            set({ isLoading: false });
        }
    },

    updateProfile: async (partialUser) => {
        const currentUser = get().user;
        if (currentUser) {
            const updatedUser = { ...currentUser, ...partialUser };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            set({ user: updatedUser });
        }
    }
}));
