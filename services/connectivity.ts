import * as Network from 'expo-network';

import logger from '@/utils/logger';

/**
 * Estado de conectividad del dispositivo.
 *
 * `unknown` es un estado real (arranque): hasta que `expo-network` responde no
 * sabemos si hay red, así que **nada debe asumir que sí**. Quien necesite
 * "intentar de todos modos" pregunta `isOffline()` (falso en `unknown`).
 */
export type ConnectivityState = 'unknown' | 'online' | 'offline';

export interface NetworkSnapshot {
    isConnected?: boolean | null;
    isInternetReachable?: boolean | null;
}

/**
 * Traduce el snapshot de `expo-network` al estado normalizado.
 *
 * `isInternetReachable === false` gana sobre `isConnected === true`: estar
 * asociado a un wifi sin salida (portal cautivo, router sin WAN) es estar
 * offline para efectos de la API.
 */
export function classifyNetworkState(
    snapshot: NetworkSnapshot | null | undefined
): ConnectivityState {
    if (!snapshot) return 'unknown';
    if (snapshot.isConnected === false) return 'offline';
    if (snapshot.isInternetReachable === false) return 'offline';
    if (snapshot.isConnected === true || snapshot.isInternetReachable === true) return 'online';
    return 'unknown';
}

export type ConnectivityListener = (state: ConnectivityState) => void;

/**
 * Fuente única de verdad de la conectividad. Antes había tres (este listener,
 * `context/NotificationContext` y el de `services/offlineSync`), cada una con
 * su propia idea de "estoy online".
 */
export class ConnectivityMonitor {
    private state: ConnectivityState = 'unknown';
    private readonly listeners = new Set<ConnectivityListener>();
    private startPromise: Promise<ConnectivityState> | null = null;
    private networkSubscription: { remove?: () => void } | null = null;

    getState(): ConnectivityState {
        return this.state;
    }

    /** Solo `true` con confirmación: en `unknown` devuelve false. */
    isOnline(): boolean {
        return this.state === 'online';
    }

    /** Solo `true` con confirmación de que NO hay red. */
    isOffline(): boolean {
        return this.state === 'offline';
    }

    /**
     * Ingesta de un snapshot de red. Es el único punto donde muta el estado
     * (lo usan el listener nativo y los tests).
     */
    handleNetworkState(snapshot: NetworkSnapshot | null | undefined): ConnectivityState {
        const next = classifyNetworkState(snapshot);
        if (next !== this.state) {
            this.state = next;
            this.notify(next);
        }
        return next;
    }

    /**
     * Suscribe un callback a los cambios de estado (no emite el estado actual:
     * el consumidor arranca leyendo `getState()`).
     */
    subscribe(listener: ConnectivityListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /** Idempotente y nunca lanza: si `expo-network` falla queda en `unknown`. */
    start(): Promise<ConnectivityState> {
        if (!this.startPromise) {
            this.startPromise = this.bootstrap();
        }
        return this.startPromise;
    }

    private async bootstrap(): Promise<ConnectivityState> {
        try {
            this.handleNetworkState(await Network.getNetworkStateAsync());
            this.networkSubscription = Network.addNetworkStateListener(state => {
                this.handleNetworkState(state);
            });
        } catch (error) {
            logger.captureException(error, { context: 'connectivity:start' });
        }
        return this.state;
    }

    private notify(state: ConnectivityState) {
        this.listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                logger.captureException(error, { context: 'connectivity:listener' });
            }
        });
    }
}

export const connectivity = new ConnectivityMonitor();
