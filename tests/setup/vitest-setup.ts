import { vi } from 'vitest';

// ─────────── Mock @/api/client ───────────
vi.mock('@/api/client', () => ({
    apiClient: vi.fn(),
    setTokenInMemory: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
}));

// ─────────── Mock @/utils/logger ───────────
vi.mock('@/utils/logger', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        captureException: vi.fn(),
    },
}));

// ─────────── Mock @/utils/tokenStorage ───────────
vi.mock('@/utils/tokenStorage', () => ({
    TokenStorage: {
        saveToken: vi.fn(),
        getToken: vi.fn(() => Promise.resolve('mock-token')),
        removeTokens: vi.fn(),
    },
}));

// ─────────── Mock @react-native-async-storage/async-storage ───────────
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

// ─────────── Mock expo-secure-store (factory to avoid importing module) ───────────
vi.mock('expo-secure-store', () => ({
    setItemAsync: vi.fn(() => Promise.resolve()),
    getItemAsync: vi.fn(() => Promise.resolve(null)),
    deleteItemAsync: vi.fn(() => Promise.resolve()),
}));

// ─────────── Mock expo-local-authentication (factory to avoid importing) ───────────
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

// ─────────── Mock expo-router ───────────
// Simula useFocusEffect como useEffect para evitar loops infinitos
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

// ─────────── Mock react-native-toast-message ───────────
vi.mock('react-native-toast-message', () => ({
    default: {
        show: vi.fn(),
        hide: vi.fn(),
    },
}));

// ─────────── Mock expo-haptics ───────────
vi.mock('expo-haptics', () => ({
    impactAsync: vi.fn(() => Promise.resolve()),
    notificationAsync: vi.fn(() => Promise.resolve()),
    selectionAsync: vi.fn(() => Promise.resolve()),
    ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
    NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
}));

// ─────────── Mock react-native (partial - avoid importing native modules) ───────────
vi.mock('react-native', () => ({
    Platform: { OS: 'ios', select: vi.fn((obj: any) => obj?.ios ?? obj?.default) },
    DeviceEventEmitter: {
        addListener: vi.fn(() => ({ remove: vi.fn() })),
        emit: vi.fn(),
    },
    NativeModules: {},
    NativeEventEmitter: vi.fn(() => ({ addListener: vi.fn(), remove: vi.fn() })),
}));

// ─────────── Mock @tanstack/react-query ───────────
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

// ─────────── Mock expo-image-picker ───────────
vi.mock('expo-image-picker', () => ({
    requestCameraPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
    requestMediaLibraryPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
    launchCameraAsync: vi.fn(() => Promise.resolve({ canceled: true })),
    launchImageLibraryAsync: vi.fn(() => Promise.resolve({ canceled: true })),
    MediaTypeOptions: { Images: 'Images' },
}));


