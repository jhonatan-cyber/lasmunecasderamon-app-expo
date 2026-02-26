import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Detect the best IP for the current platform
const getBaseUrl = () => {
    // 1. DYNAMIC FOR WEB: Detects the current hostname of the browser
    if (Platform.OS === 'web') {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `http://${hostname}:3000`;
    }

    // 2. DYNAMIC FOR NATIVE: Asks Expo for the host laptop's IP
    // debuggerHost is automatically updated by Expo whenever you run npx expo start
    const debuggerHost = Constants.expoConfig?.hostUri;
    const localIP = debuggerHost?.split(':')[0];

    if (localIP) {
        return `http://${localIP}:3000`;
    }

    // Fallback if autodetection fails (uses your current IP as safety)
    return 'http://192.168.0.6:3000';
};

export const BASE_URL = getBaseUrl();
export const API_URL = `${BASE_URL}/api`;

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
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

    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || data.message || 'Error en la petición API');
    }

    return data;
};
