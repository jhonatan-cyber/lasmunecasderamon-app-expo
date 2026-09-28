import { useEffect, useSyncExternalStore } from 'react';

import { connectivity, type ConnectivityState } from '@/services/connectivity';

export interface UseConnectivityReturn {
    state: ConnectivityState;
    /** Confirmado con red. */
    isOnline: boolean;
    /** Confirmado sin red. */
    isOffline: boolean;
    /** Todavía no sabemos (arranque). */
    isUnknown: boolean;
}

const subscribeToConnectivity = (onChange: () => void) => connectivity.subscribe(onChange);
const getConnectivitySnapshot = () => connectivity.getState();

/**
 * Lee la conectividad unificada con `useSyncExternalStore`: el snapshot es un
 * string, así que no hay renders en cascada ni desfase entre el render y la
 * suscripción.
 *
 * Usar `isOffline` (no `!isOnline`) para decidir si conviene evitar una
 * petición: en `unknown` es mejor intentar.
 */
export const useConnectivity = (): UseConnectivityReturn => {
    const state = useSyncExternalStore(
        subscribeToConnectivity,
        getConnectivitySnapshot,
        getConnectivitySnapshot
    );

    useEffect(() => {
        void connectivity.start();
    }, []);

    return {
        state,
        isOnline: state === 'online',
        isOffline: state === 'offline',
        isUnknown: state === 'unknown',
    };
};
