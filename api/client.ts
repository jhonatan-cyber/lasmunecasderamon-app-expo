import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export class UnauthorizedError extends Error {
    code = 'UNAUTHORIZED';
    constructor(message = 'Sesión inválida o expirada') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

export class TimeoutError extends Error {
    code = 'TIMEOUT';
    constructor(message = 'La petición tardó demasiado. Verifica tu conexión.') {
        super(message);
        this.name = 'TimeoutError';
    }
}

export class NetworkError extends Error {
    code = 'NETWORK_ERROR';
    constructor(message = __DEV__ 
        ? 'Error de conexión con el servidor local. Verifica que el servidor esté corriendo y en la misma red.' 
        : 'Error de conexión. Verifica tu internet e intenta nuevamente.') {
        super(message);
        this.name = 'NetworkError';
    }
}

export class RetryExhaustedError extends Error {
    code = 'RETRY_EXHAUSTED';
    constructor(message = 'Se agotaron los reintentos de conexión.') {
        super(message);
        this.name = 'RetryExhaustedError';
    }
}

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


const shouldRetry = (error: any, statusCode?: number): boolean => {
   
    if (statusCode === 401 || statusCode === 403) {
        return false;
    }
    if (statusCode && statusCode >= 400 && statusCode < 500) {
        return statusCode === 429;
    }
    if (statusCode && statusCode >= 500) {
        return true;
    }
    if (error?.code === 'TIMEOUT' || error?.code === 'NETWORK_ERROR') {
        return true;
    }
    if (error?.message?.toLowerCase().includes('network') || error?.name === 'TypeError') {
        return true;
    }
    return false;
};

const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

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
    

   
};

const getBaseUrl = () => {
    const PROD_URL = 'https://xn--lasmuecasderamon-bub.com';
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

    if (!__DEV__) {
        return envUrl || PROD_URL;
    }

    if (envUrl) {
        return envUrl;
    }

    if (Platform.OS === 'web') {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `http://${hostname}:3000`;
    }

    const hostCandidates = [
        (Constants as any)?.expoConfig?.hostUri,
        (Constants as any)?.expoGoConfig?.debuggerHost,
        (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost,
        (Constants as any)?.manifest?.debuggerHost,
        (Constants as any)?.manifest?.hostUri,
        (Constants as any)?.linkingUri,
    ].filter(Boolean) as string[];

    const extractHost = (value: string) => {
        const normalized = value.replace(/^[a-zA-Z]+:\/\//, '');
        return normalized.split('/')[0]?.split(':')[0];
    };

    const localIP = hostCandidates.map(extractHost).find(Boolean);

   
    if (localIP) {
        console.log('[API] Detected IP:', localIP);
        return `http://${localIP}:3000`;
    }

    
    console.log('[API] Using localhost fallback');
    return 'http://localhost:3000';
};

export const BASE_URL = getBaseUrl();
export const API_URL = `${BASE_URL}/api`;

// Debug: mostrar URL en desarrollo
if (__DEV__) {
    console.log('[API] Base URL:', BASE_URL);
    console.log('[API] Full URL:', API_URL);
}

export const apiClient = async <T = any>(endpoint: string, options: RequestInit & { timeout?: number; retries?: number } = {}): Promise<T> => {
    const defaultRetries = __DEV__ ? 1 : 3;
    const { timeout: customTimeout, retries: maxRetries = defaultRetries, ...fetchOptions } = options;
    const url = `${API_URL}${endpoint}`;
    console.log('[API] Full URL:', url);

    const headers = new Headers(fetchOptions.headers || {});

    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }


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
        console.log('[API] Token present:', tokenInMemory.substring(0, 20) + '...');
    } else {
        console.log('[API] NO TOKEN FOUND');
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
        const timeoutId = setTimeout(() => controller.abort(), customTimeout ?? 10000);

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
                    // Incluir el mensaje del servidor en el error
                    const serverMessage = data.message || data.error || `Error ${response.status}`;
                    throw new Error(serverMessage);
                }
                lastError = new Error(data.error || data.message || 'Error en la petición API');
                logApiCall(endpoint, attempt, maxRetries, response.status, lastError, durationMs);
                if (attempt < maxRetries) {
                    await delay(500);
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
                // Si el error ya es una instancia de Error lanzada arriba (con mensaje de servidor), no la convertimos a NetworkError
                if (err instanceof UnauthorizedError || err instanceof TimeoutError || err instanceof NetworkError) throw err;
                if (!err.type || err.type === 'fetch-failed') {
                    // Si el mensaje del error NO contiene "network" y viene de una respuesta fallida controlada, mantenemos el mensaje original
                    if (err.message && !err.message.toLowerCase().includes('fetch')) {
                        throw err;
                    }
                    throw new NetworkError();
                }
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
