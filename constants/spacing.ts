import { computeResponsiveMetrics, getWindowMetrics, type ResponsiveMetrics } from '@/utils/responsive';

let cachedWidth = -1;
let cachedHeight = -1;
let cachedMetrics: ResponsiveMetrics | null = null;

/**
 * Los tokens se calculaban una sola vez al importar el módulo, así que un
 * cambio de tamaño (web, split-screen, rotación) dejaba la escala vieja.
 * Ahora se recalculan cuando cambian las dimensiones; los `StyleSheet.create`
 * de nivel de módulo siguen capturando el valor del arranque, pero los estilos
 * calculados en render (y el hook `useResponsiveMetrics`) ya son reactivos.
 */
function currentMetrics(): ResponsiveMetrics {
    const { width, height } = getWindowMetrics();
    if (!cachedMetrics || width !== cachedWidth || height !== cachedHeight) {
        cachedMetrics = computeResponsiveMetrics(width, height);
        cachedWidth = width;
        cachedHeight = height;
    }
    return cachedMetrics;
}

export const Spacing = {
    get xxs() { return currentMetrics().spacing.xxs; },
    get xs() { return currentMetrics().spacing.xs; },
    get sm() { return currentMetrics().spacing.sm; },
    get md() { return currentMetrics().spacing.md; },
    get lg() { return currentMetrics().spacing.lg; },
    get xl() { return currentMetrics().spacing.xl; },
    get xxl() { return currentMetrics().spacing.xxl; },
    get xxxl() { return currentMetrics().spacing.xxxl; },
};

export const FontSize = {
    get xxs() { return currentMetrics().fontSize.xxs; },
    get xs() { return currentMetrics().fontSize.xs; },
    get sm() { return currentMetrics().fontSize.sm; },
    get md() { return currentMetrics().fontSize.md; },
    get lg() { return currentMetrics().fontSize.lg; },
    get xl() { return currentMetrics().fontSize.xl; },
    get xxl() { return currentMetrics().fontSize.xxl; },
    get xxxl() { return currentMetrics().fontSize.xxxl; },
    get display() { return currentMetrics().fontSize.display; },
};

export const BorderRadius = {
    get xs() { return currentMetrics().borderRadius.xs; },
    get sm() { return currentMetrics().borderRadius.sm; },
    get md() { return currentMetrics().borderRadius.md; },
    get lg() { return currentMetrics().borderRadius.lg; },
    get xl() { return currentMetrics().borderRadius.xl; },
    get xxl() { return currentMetrics().borderRadius.xxl; },
    get card() { return currentMetrics().borderRadius.card; },
    get button() { return currentMetrics().borderRadius.button; },
    get full() { return currentMetrics().borderRadius.full; },
};

export const IconSize = {
    get sm() { return currentMetrics().iconSize.sm; },
    get md() { return currentMetrics().iconSize.md; },
    get lg() { return currentMetrics().iconSize.lg; },
    get xl() { return currentMetrics().iconSize.xl; },
};

/** Objetivo táctil mínimo recomendado (Apple HIG / Material). */
export const MIN_TOUCH_TARGET = 44;

export const HitSlop = {
    sm: { top: 8, right: 8, bottom: 8, left: 8 },
    md: { top: 12, right: 12, bottom: 12, left: 12 },
    lg: { top: 16, right: 16, bottom: 16, left: 16 },
} as const;

export const BorderWidth = {
    thin: 0.5,
    base: 1,
    thick: 2,
} as const;
