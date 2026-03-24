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

// Error especial para timeout de conexión
export class TimeoutError extends Error {
    code = 'TIMEOUT';
    constructor(message = 'La petición tardó demasiado. Verifica tu conexión.') {
        super(message);
        this.name = 'TimeoutError';
    }
}

// Error especial para errores de red
export class NetworkError extends Error {
    code = 'NETWORK_ERROR';
    constructor(message = __DEV__ 
        ? 'Error de conexión con el servidor local. Verifica que el servidor esté corriendo y en la misma red.' 
        : 'Error de conexión. Verifica tu internet e intenta nuevamente.') {
        super(message);
        this.name = 'NetworkError';
    }
}

// Error especial para reintentos agotados
export class RetryExhaustedError extends Error {
    code = 'RETRY_EXHAUSTED';
    constructor(message = 'Se agotaron los reintentos de conexión.') {
        super(message);
        this.name = 'RetryExhaustedError';
    }
}

// Callback que se invoca cuando el servidor retorna 401.
// Se registra desde el authStore para evitar dependencia circular.
// Por defecto no hace nada (solo lanza el error tipado).
// Cache el token en memoria para evitar accesos repetidos al disco (SecureStore) que son lentos
let tokenInMemory: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setTokenInMemory(token: string | null) {
    tokenInMemory = token;
}

export function getTokenInMemory(): string | null {
    return tokenInMemory;
}

export function setUnauthorizedHandler(handler: () => void) {
    onUnauthorized = handler;
}

/**
 * Determina si un error merece un reintento basado en su tipo y código de estado
 */
const shouldRetry = (error: any, statusCode?: number): boolean => {
    // No reintentar en errores de autorización (401) o prohibido (403)
    if (statusCode === 401 || statusCode === 403) {
        return false;
    }
    // No reintentar en errores de cliente (4xx) excepto 429 (Too Many Requests)
    if (statusCode && statusCode >= 400 && statusCode < 500) {
        return statusCode === 429;
    }
    // Reintentar en errores de servidor (5xx)
    if (statusCode && statusCode >= 500) {
        return true;
    }
    // Reintentar en nuestros errores personalizados de timeout y red
    if (error?.code === 'TIMEOUT' || error?.code === 'NETWORK_ERROR') {
        return true;
    }
    // Reintentar si es un error de fetch genérico (Network request failed o similar)
    if (error?.message?.toLowerCase().includes('network') || error?.name === 'TypeError') {
        return true;
    }
    // No reintentar en otros errores (como errores de parsing JSON, etc.)
    return false;
};

/**
 * Espera un tiempo determinado (en ms)
 */
const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Función de logging para diagnóstico de problemas de conexión
 * En producción, esto podría enviarse a un servicio de logging externo
 */
const logApiCall = (endpoint: string, attempt: number, maxRetries: number, status?: number, error?: any, durationMs?: number) => {
    const now = new Date();
    const timestamp = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().replace('Z', '') + 
        (now.getTimezoneOffset() <= 0 ? '+' : '-') + 
        String(Math.floor(Math.abs(now.getTimezoneOffset()) / 60)).padStart(2, '0') + ':' + 
        String(Math.abs(now.getTimezoneOffset()) % 60).padStart(2, '0');
    const logEntry = {
        timestamp,
        endpoint,
        url: `${API_URL}${endpoint}`,
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        status,
        error: error ? {
            message: error.message,
            code: error.code,
            name: error.name,
            type: error.type
        } : undefined,
        durationMs
    };
    
    // En desarrollo, mostrar en consola
    if (__DEV__) {
        console.log('[API CALL]', JSON.stringify(logEntry, null, 2));
    }
    // En producción, aquí podría enviarse a un servicio de logging externo
    // Por ejemplo: await sendToLoggingService(logEntry);
};

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

export const apiClient = async <T = any>(endpoint: string, options: RequestInit & { timeout?: number; retries?: number } = {}): Promise<T> => {
    const defaultRetries = __DEV__ ? 5 : 3;
    const { timeout: customTimeout, retries: maxRetries = defaultRetries, ...fetchOptions } = options;
    const url = `${API_URL}${endpoint}`;

    const headers = new Headers(fetchOptions.headers || {});

    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    // Usar el token en memoria si existe, sino buscarlo en disco UNA SOLA VEZ
    if (!tokenInMemory) {
        try {
            if (Platform.OS === 'web') {
                tokenInMemory = await localStorage.getItem('token');
            } else {
                tokenInMemory = await SecureStore.getItemAsync('token');
            }
        } catch (e) {}
    }

    if (tokenInMemory) {
        headers.set('Authorization', `Bearer ${tokenInMemory}`);
    }

    // Inyectar automáticamente la fecha del dispositivo en peticiones que envían datos
    let finalBody = fetchOptions.body;
    if (['POST', 'PUT', 'PATCH'].includes(options.method?.toUpperCase() || '') && typeof fetchOptions.body === 'string') {
        try {
            const bodyObj = JSON.parse(fetchOptions.body);
            // Solo inyectamos si es un objeto y no tiene ya una fecha seteada explícitamente
            if (typeof bodyObj === 'object' && bodyObj !== null && !bodyObj.device_date) {
                bodyObj.device_date = new Date().toISOString();
                finalBody = JSON.stringify(bodyObj);
            }
        } catch (e) {
            // Si no es JSON, lo dejamos como está
        }
    }

    const config: RequestInit = {
        ...fetchOptions,
        body: finalBody,
        headers,
    };

    let lastError: any = null;
    const startTime = Date.now();
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), customTimeout ?? 60000);

        try {
            const response = await fetch(url, { ...config, signal: controller.signal });
            clearTimeout(timeoutId);
            const durationMs = Date.now() - startTime;

            const data = await response.json().catch(() => ({}));

            if (response.status === 401) {
                onUnauthorized?.();
                logApiCall(endpoint, attempt, maxRetries, response.status, undefined, durationMs);
                throw new UnauthorizedError(data.error || data.message || 'Sesión inválida o expirada');
            }

            if (!response.ok) {
                if (!shouldRetry(null, response.status) || attempt === maxRetries) {
                    logApiCall(endpoint, attempt, maxRetries, response.status, undefined, durationMs);
                    throw new Error(data.error || data.message || 'Error en la petición API');
                }
                lastError = new Error(data.error || data.message || 'Error en la petición API');
                logApiCall(endpoint, attempt, maxRetries, response.status, lastError, durationMs);
                if (attempt < maxRetries) {
                    await delay(Math.min(1000 * 2 ** attempt, 10000));
                    continue;
                }
            }

            logApiCall(endpoint, attempt, maxRetries, response.status, undefined, durationMs);
            return data as T;
        } catch (err: any) {
            clearTimeout(timeoutId);
            const durationMs = Date.now() - startTime;
            lastError = err;
            
            if (!shouldRetry(err) || attempt === maxRetries) {
                logApiCall(endpoint, attempt, maxRetries, undefined, err, durationMs);
                if (err?.name === 'AbortError') throw new TimeoutError();
                if (!err.type || err.type === 'fetch-failed') throw new NetworkError();
                throw err;
            }
            
            logApiCall(endpoint, attempt, maxRetries, undefined, err, durationMs);
            if (attempt < maxRetries) {
                await delay(Math.min(1000 * 2 ** attempt, 10000));
            }
        }
    }
    
    throw lastError || new RetryExhaustedError();
};
