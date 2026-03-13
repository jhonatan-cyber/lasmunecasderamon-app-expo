import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Error especial para token inválido / sesión expirada
export class UnauthorizedError extends Error {
    code = 'UNAUTHORIZED';
    constructor(message = 'Sesión inválida o expirada') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

// Callback que se invoca cuando el servidor retorna 401.
// Se registra desde el authStore para evitar dependencia circular.
// Por defecto no hace nada (solo lanza el error tipado).
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
    onUnauthorized = handler;
}

// Detect the best IP for the current platform
const getBaseUrl = () => {
    // Production URL (Punycode for lasmuñecasderamon.com)
    const PROD_URL = 'https://xn--lasmuecasderamon-bub.com';

    // If not in development mode, use production URL
    if (!__DEV__) {
        return PROD_URL;
    }

    // 1. DYNAMIC FOR WEB: Detects the current hostname of the browser
    if (Platform.OS === 'web') {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `http://${hostname}:3000`;
    }

    // 2. DYNAMIC FOR NATIVE: Asks Expo for the host laptop's IP
    const debuggerHost = (Constants as any).expoConfig?.hostUri;
    const localIP = debuggerHost?.split(':')[0];

    if (localIP) {
        return `http://${localIP}:3000`;
    }

    // Fallback
    return PROD_URL;
};

export const BASE_URL = getBaseUrl();
export const API_URL = `${BASE_URL}/api`;

export const apiClient = async (endpoint: string, options: RequestInit & { timeout?: number } = {}) => {
    const { timeout: customTimeout, ...fetchOptions } = options;
    options = fetchOptions;
    const url = `${API_URL}${endpoint}`;

    // Set default headers
    const headers = new Headers(options.headers || {});

    // Only set application/json if not already set and not FormData
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    // Add auth token if available
    try {
        let token: string | null = null;
        if (Platform.OS === 'web') {
            token = await localStorage.getItem('token'); // Web fallback
        } else {
            token = await SecureStore.getItemAsync('token');
        }

        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    } catch (e) {
        // Ignore storage errors
    }

    const config: RequestInit = {
        ...options,
        headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), customTimeout ?? 20000);

    let response: Response;
    try {
        response = await fetch(url, { ...config, signal: controller.signal });
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            throw new Error('La petición tardó demasiado. Verifica tu conexión.');
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        // Notificar al store (sin importarlo directamente → evita dependencia circular)
        onUnauthorized?.();
        throw new UnauthorizedError(data.error || data.message || 'Sesión inválida o expirada');
    }

    if (!response.ok) {
        throw new Error(data.error || data.message || 'Error en la petición API');
    }

    return data;
};
