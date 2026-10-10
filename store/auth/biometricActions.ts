import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import logger from '@/utils/logger';
import type { AuthState } from '../authTypes';

type AuthStateUpdater = (partial: Partial<AuthState>) => void;
type BiometricActions = Pick<
    AuthState,
    | 'checkBiometricAvailability'
    | 'authenticateWithBiometric'
    | 'enable2FA'
    | 'disable2FA'
    | 'setBiometricEnabled'
    | 'saveCredentials'
    | 'getCredentials'
    | 'removeCredentials'
>;

/** Biometric availability, secure credentials and 2FA capability actions. */
export function createBiometricActions(set: AuthStateUpdater): BiometricActions {
    const unsupportedTwoFactorError = new Error(
        'La configuración de 2FA aún no está disponible en el backend.',
    );

    return {
        checkBiometricAvailability: async () => {
            try {
                const compatible = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                const isAvailable = compatible && enrolled;
                let biometricType: AuthState['biometricType'] = null;

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
            } catch {
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
            } catch {
                return false;
            }
        },

        enable2FA: async (password) => {
            logger.warn('2FA enable requested but backend support is not available', {
                hasPassword: Boolean(password),
            });
            logger.warn('2FA enable skipped', { error: unsupportedTwoFactorError });
            return false;
        },

        disable2FA: async (password) => {
            logger.warn('2FA disable requested but backend support is not available', {
                hasPassword: Boolean(password),
            });
            logger.warn('2FA disable skipped', { error: unsupportedTwoFactorError });
            return false;
        },

        setBiometricEnabled: async (enabled) => {
            await AsyncStorage.setItem('biometricEnabled', enabled.toString());
            set({ isBiometricEnabled: enabled });
            if (!enabled) await SecureStore.deleteItemAsync('user_credentials');
        },

        saveCredentials: async (username, password) => {
            await SecureStore.setItemAsync('user_credentials', JSON.stringify({ username, password }));
        },

        getCredentials: async () => {
            try {
                const credentials = await SecureStore.getItemAsync('user_credentials');
                if (!credentials) return null;
                const parsed = JSON.parse(credentials) as { username?: string; password?: string };
                if (typeof parsed?.username !== 'string' || typeof parsed?.password !== 'string') return null;
                return { username: parsed.username, password: parsed.password };
            } catch {
                return null;
            }
        },

        removeCredentials: async () => {
            await SecureStore.deleteItemAsync('user_credentials');
        },
    };
}
