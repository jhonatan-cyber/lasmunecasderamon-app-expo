import { vi } from 'vitest';

/**
 * Setup de las pruebas de integración.
 *
 * Es deliberadamente **mucho más chico** que el de las unitarias: acá lo que se
 * prueba es justamente la cadena real (`apiClient` con `fetch`, conectividad,
 * SQLite), así que no se mockean ni el cliente HTTP ni la conectividad. Sólo se
 * reemplazan las fronteras que no existen en Node: los módulos nativos de Expo
 * y el almacenamiento del dispositivo.
 */

(globalThis as Record<string, unknown>).__DEV__ = true;

// URL del dashboard. La del working copy apunta a local; se puede cambiar sin
// tocar archivos con `DASHBOARD_URL=... pnpm test:integration`.
const dashboardUrl = process.env.DASHBOARD_URL || 'http://127.0.0.1:3000';
process.env.EXPO_PUBLIC_API_BASE_URL = dashboardUrl;

vi.mock('expo-constants', () => ({
    default: { expoConfig: null, manifest: null, sessionId: 'integration', installationId: 'test' },
}));

// Red del dispositivo: se gobierna a mano desde cada test con
// `connectivity.handleNetworkState`, así que el listener nativo no existe.
vi.mock('expo-network', () => ({
    getNetworkStateAsync: vi.fn(() =>
        Promise.resolve({ isConnected: true, isInternetReachable: true, type: 'WIFI' })
    ),
    addNetworkStateListener: vi.fn(() => ({ remove: vi.fn() })),
    NetworkStateType: { NONE: 'NONE', WIFI: 'WIFI', CELLULAR: 'CELLULAR' },
}));

// `services/mirror/driver.ts` importa expo-sqlite al cargar el módulo; el driver
// real que usa esta prueba es el de `node:sqlite` inyectado desde el test.
vi.mock('expo-sqlite', () => ({
    openDatabaseSync: vi.fn(() => ({
        execSync: vi.fn(),
        runSync: vi.fn(),
        getFirstSync: vi.fn(() => null),
        getAllSync: vi.fn(() => []),
        withTransactionSync: vi.fn(),
    })),
}));

vi.mock('react-native', () => ({
    Platform: { OS: 'web', select: (obj: any) => obj?.web ?? obj?.default },
}));

const secureStore: Record<string, string> = {};
vi.mock('expo-secure-store', () => ({
    setItemAsync: vi.fn((key: string, value: string) => {
        secureStore[key] = value;
        return Promise.resolve();
    }),
    getItemAsync: vi.fn((key: string) => Promise.resolve(secureStore[key] ?? null)),
    deleteItemAsync: vi.fn((key: string) => {
        delete secureStore[key];
        return Promise.resolve();
    }),
}));

const asyncStore: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
    default: {
        getItem: vi.fn((key: string) => Promise.resolve(asyncStore[key] ?? null)),
        setItem: vi.fn((key: string, value: string) => {
            asyncStore[key] = value;
            return Promise.resolve();
        }),
        removeItem: vi.fn((key: string) => {
            delete asyncStore[key];
            return Promise.resolve();
        }),
        clear: vi.fn(() => {
            Object.keys(asyncStore).forEach(key => delete asyncStore[key]);
            return Promise.resolve();
        }),
    },
}));

// Sentry no tiene sentido fuera del dispositivo; se silencia para que la
// consola de la prueba quede legible.
vi.mock('@/utils/sentry', () => ({
    addBreadcrumb: vi.fn(),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    initSentry: vi.fn(),
}));
