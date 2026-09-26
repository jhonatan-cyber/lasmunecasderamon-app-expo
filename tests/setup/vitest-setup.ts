import { vi } from 'vitest';

// Los módulos de Expo asumen el entorno de React Native (`__DEV__`).
(globalThis as Record<string, unknown>).__DEV__ = true;

// Paquetes de Expo usados por cadenas de import transversales (api/base-url,
// TimerContext/voice announcer): se mockean para no cargar el runtime nativo.
vi.mock('expo-constants', () => ({
    default: { expoConfig: null, manifest: null, sessionId: 'test', installationId: 'test' },
}));
vi.mock('expo-speech', () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSpeakingAsync: vi.fn(() => Promise.resolve(false)),
}));
vi.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
    SafeAreaProvider: ({ children }: { children: any }) => children,
    SafeAreaView: ({ children }: { children: any }) => children,
}));
// Varios hooks de pantalla (useCuentasScreen, useSolicitudes) leen
// timers/serverOffset: en tests unitarios basta un contexto vacío.
vi.mock('@/context/TimerContext', () => ({
    useTimer: vi.fn(() => ({ timers: [], serverOffset: 0, refreshTimers: vi.fn() })),
    TimerProvider: ({ children }: { children: any }) => children,
}));


vi.mock('@/api/client', () => ({
    apiClient: vi.fn(),
    apiClientSafe: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    setTokenInMemory: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
}));


vi.mock('@/utils/logger', () => ({
    default: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        captureException: vi.fn(),
    },
}));


vi.mock('@/utils/tokenStorage', () => ({
    TokenStorage: {
        saveToken: vi.fn(),
        getToken: vi.fn(() => Promise.resolve('mock-token')),
        removeTokens: vi.fn(),
    },
}));


const asyncStorageStore: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
    default: {
        getItem: vi.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
        setItem: vi.fn((key: string, value: string) => {
            asyncStorageStore[key] = value;
            return Promise.resolve();
        }),
        removeItem: vi.fn((key: string) => {
            delete asyncStorageStore[key];
            return Promise.resolve();
        }),
        clear: vi.fn(() => {
            Object.keys(asyncStorageStore).forEach(k => delete asyncStorageStore[k]);
            return Promise.resolve();
        }),
    },
}));


vi.mock('expo-secure-store', () => ({
    setItemAsync: vi.fn(() => Promise.resolve()),
    getItemAsync: vi.fn(() => Promise.resolve(null)),
    deleteItemAsync: vi.fn(() => Promise.resolve()),
}));


vi.mock('expo-local-authentication', () => ({
    hasHardwareAsync: vi.fn(() => Promise.resolve(false)),
    isEnrolledAsync: vi.fn(() => Promise.resolve(false)),
    supportedAuthenticationTypesAsync: vi.fn(() => Promise.resolve([])),
    authenticateAsync: vi.fn(() => Promise.resolve({ success: false })),
    AuthenticationType: {
        FINGERPRINT: 1,
        FACIAL_RECOGNITION: 2,
        IRIS: 3,
    },
}));



import { useEffect, useRef } from 'react';

vi.mock('expo-router', () => ({
    useFocusEffect: vi.fn((callback: () => void | (() => void)) => {
        const ref = useRef(callback);
        ref.current = callback;
        useEffect(() => {
            const cleanup = ref.current();
            return () => { if (cleanup) cleanup(); };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
    }),
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
    useLocalSearchParams: vi.fn(() => ({})),
    useSegments: vi.fn(() => []),
}));


vi.mock('react-native-toast-message', () => ({
    default: {
        show: vi.fn(),
        hide: vi.fn(),
    },
}));


vi.mock('expo-haptics', () => ({
    impactAsync: vi.fn(() => Promise.resolve()),
    notificationAsync: vi.fn(() => Promise.resolve()),
    selectionAsync: vi.fn(() => Promise.resolve()),
    ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
    NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
}));


vi.mock('react-native', () => ({
    Platform: { OS: 'ios', select: vi.fn((obj: any) => obj?.ios ?? obj?.default) },
    // DeviceEventEmitter reemplazado por eventBus (utils/eventBus)
    NativeModules: {},
    NativeEventEmitter: vi.fn(() => ({ addListener: vi.fn(), remove: vi.fn() })),
    // Usados por hooks de pantalla (useClientes: Alert, useWindowDimensions;
    // useAccentColor: useColorScheme) en tests unitarios.
    Alert: { alert: vi.fn() },
    useWindowDimensions: vi.fn(() => ({ width: 390, height: 844, fontScale: 1 })),
    useColorScheme: vi.fn(() => 'dark'),
    StyleSheet: { create: (s: any) => s },
    Text: ({ children }: { children: any }) => children,
    View: ({ children }: { children: any }) => children,
    ActivityIndicator: () => null,
}));


vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn(),
        getQueryData: vi.fn(),
        setQueryData: vi.fn(),
    })),
    QueryClient: vi.fn(),
    QueryClientProvider: vi.fn(({ children }: { children: any }) => children),
}));


vi.mock('expo-image-picker', () => ({
    requestCameraPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
    requestMediaLibraryPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
    launchCameraAsync: vi.fn(() => Promise.resolve({ canceled: true })),
    launchImageLibraryAsync: vi.fn(() => Promise.resolve({ canceled: true })),
    MediaTypeOptions: { Images: 'Images' },
}));


