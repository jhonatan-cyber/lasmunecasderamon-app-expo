/**
 * Punto único de verdad para el tamaño de ventana y los breakpoints.
 *
 * La app puede girar y en web/split-screen el tamaño cambia en caliente. Este
 * módulo concentra el cálculo para que el hook `useResponsiveMetrics`, los
 * tokens estáticos y los estilos de módulo usen exactamente la misma regla; no
 * debe quedar ningún `width >= 768` suelto en la app.
 *
 * La clasificación se hace por el **lado corto**: un móvil en horizontal no es
 * una tablet, y una tablet girada conserva su densidad.
 */

import { Dimensions } from 'react-native';

export const BASE_WIDTH = 375;
export const TABLET_MIN_WIDTH = 768;

export interface WindowMetrics {
    width: number;
    height: number;
    isTablet: boolean;
    isLandscape: boolean;
    isPhone: boolean;
}

/** Regla única de tablet: el lado corto alcanza el mínimo. */
export function isTabletSize(width: number, height: number): boolean {
    return Math.min(width, height) >= TABLET_MIN_WIDTH;
}

/** Tamaño actual de la ventana, no el del arranque. */
export function getWindowMetrics(): WindowMetrics {
    const { width, height } = Dimensions.get('window');
    const tablet = isTabletSize(width, height);
    return {
        width,
        height,
        isTablet: tablet,
        isLandscape: width > height,
        isPhone: !tablet,
    };
}

export interface ResponsiveSpacing {
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
}

export interface ResponsiveMetrics {
    width: number;
    height: number;
    isTablet: boolean;
    isLandscape: boolean;
    isPhone: boolean;
    spacing: ResponsiveSpacing;
    fontSize: {
        xxs: number;
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        xxl: number;
        xxxl: number;
        display: number;
    };
    borderRadius: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
        xxl: number;
        card: number;
        button: number;
        full: number;
    };
    iconSize: {
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
}

export function computeResponsiveMetrics(width: number, height: number): ResponsiveMetrics {
    const shortSide = Math.min(width, height);
    const isTablet = isTabletSize(width, height);
    // Sin límites, un móvil muy angosto encogía la interfaz y uno muy ancho la
    // inflaba. El rango mantiene la escala predecible y estable al girar.
    const factor = Math.min(1.15, Math.max(0.9, shortSide / BASE_WIDTH));
    const scale = (value: number): number =>
        isTablet ? Math.round(value * 1.4) : Math.round(value * factor);

    return {
        width,
        height,
        isTablet,
        isLandscape: width > height,
        isPhone: !isTablet,
        spacing: {
            xxs: 2,
            xs: isTablet ? 6 : scale(4),
            sm: isTablet ? 10 : scale(8),
            md: isTablet ? 18 : scale(16),
            lg: isTablet ? 24 : scale(20),
            xl: isTablet ? 30 : scale(24),
            xxl: isTablet ? 40 : scale(32),
            xxxl: isTablet ? 50 : scale(40),
        },
        fontSize: {
            xxs: isTablet ? 12 : 10,
            xs: isTablet ? 14 : 12,
            sm: isTablet ? 16 : 14,
            md: isTablet ? 18 : 16,
            lg: isTablet ? 20 : 18,
            xl: isTablet ? 24 : 20,
            xxl: isTablet ? 28 : 24,
            xxxl: isTablet ? 34 : 30,
            display: isTablet ? 42 : 36,
        },
        borderRadius: {
            xs: isTablet ? 6 : 4,
            sm: isTablet ? 10 : 8,
            md: isTablet ? 14 : 12,
            lg: isTablet ? 18 : 16,
            xl: isTablet ? 24 : 20,
            xxl: isTablet ? 32 : 28,
            card: isTablet ? 20 : 16,
            button: isTablet ? 18 : 14,
            full: 9999,
        },
        iconSize: {
            sm: isTablet ? 18 : 16,
            md: isTablet ? 24 : 20,
            lg: isTablet ? 30 : 26,
            xl: isTablet ? 36 : 32,
        },
    };
}
