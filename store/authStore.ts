import {
    apiClientSafe,
    setForbiddenHandler,
    setSessionConfirmedHandler,
    setTokenInMemory,
    setUnauthorizedHandler,
} from '@/api/client';
import logger from '@/utils/logger';
import {
    createOfflineSession,
    isOfflineSessionValid,
    OFFLINE_SESSION_STORAGE_KEY,
    parseOfflineSession,
    serializeOfflineSession,
    shouldRefreshOfflineSession,
} from '@/utils/offlineSession';
import { TokenStorage } from '@/utils/tokenStorage';
import { loginSchema, serverUserSchema } from '@lasmunecasderamon/validations';
import type { AuthState, LoginPayload, LoginResponse, User } from './authTypes';
import { createBiometricActions } from './auth/biometricActions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type { TempAuthData, User } from './authTypes';

export const useAuthStore = create<AuthState>((set, get) => {

    setUnauthorizedHandler(() => {
        if (get().user !== null) {
            set({ sessionExpired: true });
        }
    });

    // 403 con sesión válida: suele ser rol revocado/borrado. Se revalida
    // contra /auth/me; si el servidor ya no resuelve al usuario, se marca
    // la sesión como expirada. Guarda anti-loop: el /auth/me del recheck no
    // dispara otro recheck.
    let forbiddenCheckInFlight = false;
    setForbiddenHandler(() => {
        if (get().user === null || forbiddenCheckInFlight) return;
        forbiddenCheckInFlight = true;
        void get().refreshUser().then((ok) => {
            forbiddenCheckInFlight = false;
            if (!ok) set({ sessionExpired: true });
        }).catch(() => {
            forbiddenCheckInFlight = false;
            set({ sessionExpired: true });
        });
    });

    // Cada respuesta 2xx del API confirma que la sesión sigue viva, así que
    // reinicia la ventana de gracia offline (con un intervalo mínimo para no
    // escribir en disco en cada petición).
    setSessionConfirmedHandler(() => {
        const { user, offlineSession } = get();
        if (shouldRefreshOfflineSession(offlineSession, user?.id)) {
            void get().startOfflineSession();
        }
    });

    return {
        user: null,
        token: null,
        isLoading: true,
        sessionExpired: false,
        offlineSession: null,
        isBiometricEnabled: false,
        biometricType: null,
        isBiometricAvailable: false,

        clearSessionExpired: () => set({ sessionExpired: false }),

        loadOfflineSession: async () => {
            try {
                const raw = await AsyncStorage.getItem(OFFLINE_SESSION_STORAGE_KEY);
                const parsed = parseOfflineSession(raw);
                const currentUser = get().user;

                // Un marcador de otro usuario (o de una sesión ya cerrada) no vale.
                if (parsed && currentUser && parsed.userId !== currentUser.id) {
                    await AsyncStorage.removeItem(OFFLINE_SESSION_STORAGE_KEY);
                    set({ offlineSession: null });
                    return null;
                }

                set({ offlineSession: parsed });
                return parsed;
            } catch (error) {
                logger.captureException(error, { context: 'authStore:loadOfflineSession' });
                return null;
            }
        },

        startOfflineSession: async (now = Date.now()) => {
            const session = createOfflineSession(get().user?.id, now);
            if (!session) return;

            try {
                await AsyncStorage.setItem(
                    OFFLINE_SESSION_STORAGE_KEY,
                    serializeOfflineSession(session)
                );
            } catch (error) {
                logger.captureException(error, { context: 'authStore:startOfflineSession' });
            }

            // Aunque falle el disco, en memoria queda: la app no se bloquea por
            // no poder escribir el marcador.
            set({ offlineSession: session });
        },

        clearOfflineSession: async () => {
            try {
                await AsyncStorage.removeItem(OFFLINE_SESSION_STORAGE_KEY);
            } catch (error) {
                logger.captureException(error, { context: 'authStore:clearOfflineSession' });
            }
            set({ offlineSession: null });
        },

        canWorkOffline: (now = Date.now()) => isOfflineSessionValid(get().offlineSession, now),

        clearForcePasswordChange: async () => {
            const currentUser = get().user;
            if (!currentUser?.forcePasswordChange) return;
            const updatedUser = { ...currentUser, forcePasswordChange: false };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            set({ user: updatedUser });
        },

        tempAuthData: null,
        setTempAuthData: (data) => set({ tempAuthData: data }),

        ...createBiometricActions((partial) => set(partial)),

        login: async (username, password, codigo, qr_token) => {
            try {
                const payload: LoginPayload = {};

                if (qr_token) {
                    payload.qr_token = qr_token;
                } else {
                    let emailToSend = username.trim();
                    if (!emailToSend.includes('@')) {
                        emailToSend = `${emailToSend}@lasmuñecasderamon.com`;
                    }

                    
                    const parsed = loginSchema.safeParse({
                        email: emailToSend,
                        password,
                    });
                    if (!parsed.success) {
                        const firstError = parsed.error.issues[0]?.message || 'Credenciales inválidas';
                        throw new Error(firstError);
                    }

                    payload.email = parsed.data.email;
                    payload.password = parsed.data.password;
                }

                if (codigo) {
                    payload.codigo = codigo;
                }

                const response = await apiClientSafe('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const authData = response as unknown as LoginResponse;

                if (authData.requiereCodigo) {
                    return { requiereCodigo: true, user: authData.user };
                }

                if (!authData.success && !authData.token) {
                    throw new Error(authData.message || 'Error en autenticación');
                }

                const { token, user, asistenciaRegistrada = false } = authData;
                await TokenStorage.saveToken(token!);
                // Persiste el refresh token para que la sesión no caduque a los 15 min
                if (authData.refreshToken) {
                    await TokenStorage.saveRefreshToken(authData.refreshToken);
                }
                await AsyncStorage.setItem('user', JSON.stringify(user));

                setTokenInMemory(token!);
                set({ user: user!, token, tempAuthData: null });
                // El login acaba de confirmar la sesión contra el servidor.
                await get().startOfflineSession();

                return {
                    requiereCodigo: false,
                    asistenciaRegistrada,
                    forcePasswordChange: user?.forcePasswordChange,
                };
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Error desconocido en autenticación';
                throw new Error(message);
            }
        },

        logout: async () => {
            try {
                await apiClientSafe('/auth/logout', { method: 'POST' });
            } catch (e) {
                logger.error('API Logout failed', { error: e });
            }
            await TokenStorage.removeTokens();
            await AsyncStorage.removeItem('user');
            await get().clearOfflineSession();
            // La credencial biométrica no debe sobrevivir al logout (ni al
            // force_logout / rol borrado): si no, el login biométrico
            // reviviría una sesión ya cerrada en el servidor.
            await get().removeCredentials().catch(() => {});
            setTokenInMemory(null);
            set({ user: null, token: null, sessionExpired: false });
        },

        checkAuth: async () => {
            try {
                const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
                    let timeoutHandle: ReturnType<typeof setTimeout>;
                    const timeoutPromise = new Promise<null>((_, reject) => {
                        timeoutHandle = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
                    });
                    return Promise.race([promise, timeoutPromise]).then(
                        (result) => {
                            clearTimeout(timeoutHandle);
                            return result;
                        },
                        (err) => {
                            clearTimeout(timeoutHandle);
                            throw err;
                        },
                    );
                };

                // Lecturas independientes en paralelo (antes seriales con peor
                // caso >4s de splash). Cada una tolera su propio fallo.
                const [token, userStr, biometricEnabled] = await Promise.all([
                    withTimeout(TokenStorage.getToken(), 2000).catch(() => null),
                    withTimeout(AsyncStorage.getItem('user'), 2000).catch(() => null),
                    AsyncStorage.getItem('biometricEnabled').catch(() => null),
                    get().checkBiometricAvailability().catch(() => undefined),
                ]);
                if (token && userStr) {
                    setTokenInMemory(token);
                    try {
                        const parsedUser = JSON.parse(userStr) as User;
                        set({ token, user: parsedUser });

                        // Solo se carga el marcador: NO se crea. La ventana
                        // offline nace del contacto real con el servidor
                        // (login o primer 2xx vía setSessionConfirmedHandler).
                        // Crear gracia aquí dejaba operar 12h con un token que
                        // el backend ya pudo haber revocado.
                        await get().loadOfflineSession();
                    } catch {
                        // user corrupto en disco: se arranca sin sesión.
                        setTokenInMemory(null);
                        set({ token: null, user: null });
                    }
                }

                set({ isBiometricEnabled: biometricEnabled === 'true' });
            } catch (e) {
                logger.error('Error in checkAuth', { error: e });
            } finally {
                set({ isLoading: false });
            }
        },

        /**
         * Reconsulta /auth/me y actualiza el usuario local. La app no cachea
         * permisos (stateless), así que el refresh sirve para mantener el perfil
         * al día y para detectar sesiones cuyo rol dejó de existir: si el
         * servidor ya no resuelve al usuario, devuelve false.
         */
        refreshUser: async () => {
            try {
                const res = (await apiClientSafe('/auth/me')) as any;
                const servidor = res?.user ?? res?.data?.user ?? res?.data;
                const currentUser = get().user;
                // El servidor puede mandar el id numérico o el objeto en otra
                // forma tras un deploy: sin id válido no se toca la sesión.
                const parsed = serverUserSchema.safeParse(servidor);
                if (!res?.success || !parsed.success || !currentUser) {
                    if (res?.success && !parsed.success) {
                        logger.debug('authStore:refreshUser descartó /auth/me inválido');
                    }
                    return false;
                }
                const updatedUser = { ...currentUser, ...parsed.data } as User;
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                set({ user: updatedUser });
                // /auth/me respondió: sesión confirmada, ventana offline al día.
                await get().startOfflineSession();
                return true;
            } catch (err) {
                logger.fetchError(err, { context: 'authStore:refreshUser' });
                return false;
            }
        },
        updateProfile: async (partialUser) => {
            const currentUser = get().user;
            if (!currentUser) return false;

            const keys = Object.keys(partialUser) as (keyof User)[];
            const hasChanges = keys.some(
                (key) => partialUser[key] !== currentUser[key]
            );
            if (!hasChanges) return true;

            const updatedUser = { ...currentUser, ...partialUser };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            set({ user: updatedUser });

            // Optimista en local, pero se espera al servidor y se reporta:
            // sin red el PUT falla y el llamador puede avisar/reintentar.
            try {
                const res = await apiClientSafe('/users', {
                    method: 'PUT',
                    body: JSON.stringify({ id: currentUser.id, ...partialUser }),
                });
                return res?.success !== false;
            } catch (err) {
                logger.fetchError(err, { context: 'authStore:updateProfile' });
                return false;
            }
        }
    };
});
