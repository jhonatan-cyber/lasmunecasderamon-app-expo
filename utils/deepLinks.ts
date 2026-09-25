import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import logger from './logger';
interface DeepLinkConfig {
    screens: Record<string, string>;
    prefixes: string[];
}

const prefix = Linking.createURL('/');

export const deepLinks: DeepLinkConfig = {
    prefixes: [
        'lasmunecasderamon://',
        // Universal links: mismo dominio declarado en app.json (intentFilters iOS/Android).
        // El dashboard sirve /app/* como redirect (ver dashboard/app/app/page.tsx).
        'https://dashboard.xn--lasmuecasderamon-bub.com/app',
        'https://dashboard.lasmuñecasderamon.com/app',
        'https://dashboard.xn--lasmuecasderamon-bub.com',
        'https://dashboard.lasmuñecasderamon.com',
    ],
    screens: {
        home: '',
        cajero: 'cajero',
        cajeroVentas: 'cajero/ventas',
        cajeroServicios: 'cajero/servicios',
        cajeroCuentas: 'cajero/cuentas',
        cajeroCaja: 'cajero/caja',
        garzon: 'garzon',
        garzonPedidos: 'garzon/pedidos',
        garzonServicios: 'garzon/servicios',
        garzonProductos: 'garzon/productos',
        anfitriona: 'anfitriona',
        anfitrionaServicios: 'anfitriona/servicios',
        anfitrionaComisiones: 'anfitriona/comisiones',
        barman: 'barman',
        barmanBar: 'barman/bar',
        barmanVentas: 'barman/ventas',
        barmanServicios: 'barman/servicios',
        perfil: 'perfil',
        asistencia: 'asistencia',
        anticipos: 'anticipos',
        propinas: 'propinas',
        horasExtras: 'horas-extras',
    },
};

export const generateDeepLink = async (screen: keyof typeof deepLinks.screens, params?: Record<string, string>): Promise<string> => {
    const path = deepLinks.screens[screen];
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return `${prefix}${path}${query}`;
};

export const openDeepLink = async (url: string): Promise<boolean> => {
    try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
};

export const handleDeepLink = (url: string): { screen: string; params?: Record<string, string> } | null => {
    try {
        const parsed = Linking.parse(url);
        const rawPath = (parsed.path || '').replace(/^\/+/, '');

        // Universal links llegan como https://dashboard.../app/<ruta>; el prefijo
        // /app no es parte de las rutas de expo-router.
        const path = rawPath === 'app' ? '' : rawPath.startsWith('app/') ? rawPath.slice(4) : rawPath;

        if (!path) {
            return { screen: 'home', params: parsed.queryParams as Record<string, string> };
        }

        // Rutas más largas primero: 'cajero/ventas' debe ganarle a 'cajero'.
        const candidates = Object.entries(deepLinks.screens)
            .filter(([, screenPath]) => screenPath !== '')
            .sort(([, a], [, b]) => b.length - a.length);

        for (const [screen, screenPath] of candidates) {
            if (path === screenPath || path.startsWith(screenPath + '/')) {
                return {
                    screen,
                    params: parsed.queryParams as Record<string, string>,
                };
            }
        }

        return null;
    } catch (error) {
        logger.captureException(error, { context: 'DeepLinks:parseDeepLink' });
        return null;
    }
};

export const registerDeepLinkListeners = (callback: (url: string) => void): (() => void) => {
    const subscription = Linking.addEventListener('url', (event) => {
        callback(event.url);
    });
    
    return () => subscription.remove();
};

export const shareDeepLink = async (screen: keyof typeof deepLinks.screens, params?: Record<string, string>): Promise<void> => {
    const url = await generateDeepLink(screen, params);
    await Linking.openURL(url);
};

export const getInitialURL = async (): Promise<string | null> => {
    const initialURL = await Linking.getInitialURL();
    return initialURL;
};

export const addScheme = async (scheme: string): Promise<void> => {
    if (Platform.OS === 'android') {
        await Linking.openSettings();
    }
};

export const universalLinks = {
    openSales: () => openDeepLink('lasmunecasderamon://cajero/ventas'),
    openServices: () => openDeepLink('lasmunecasderamon://anfitriona/servicios'),
    openCaja: () => openDeepLink('lasmunecasderamon://cajero/caja'),
    openProfile: () => openDeepLink('lasmunecasderamon://perfil'),
    openAttendance: () => openDeepLink('lasmunecasderamon://asistencia'),
};

export default {
    deepLinks,
    generateDeepLink,
    openDeepLink,
    handleDeepLink,
    registerDeepLinkListeners,
    shareDeepLink,
    getInitialURL,
    universalLinks,
};
