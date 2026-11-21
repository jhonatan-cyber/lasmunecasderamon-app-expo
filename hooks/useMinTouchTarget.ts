import { useMemo } from 'react';
import { MIN_TOUCH_TARGET } from '@/constants/spacing';

/**
 * Calcula el `hitSlop` necesario para que un Pressable cumpla el área táctil
 * mínima de 44pt (Apple HIG / Material Design).
 *
 * Si el componente ya mide >= 44pt en ambos ejes, devuelve `undefined`
 * (sin hitSlop adicional). De lo contrario, calcula la diferencia necesaria
 * para cada lado.
 */
export function useMinTouchTarget(width?: number, height?: number) {
    const hitSlop = useMemo(() => {
        if (width === undefined || height === undefined) {
            // Sin dimensiones conocidas, usar un hitSlop seguro por defecto.
            return { top: 12, right: 12, bottom: 12, left: 12 };
        }

        const hDiff = Math.max(0, MIN_TOUCH_TARGET - height);
        const wDiff = Math.max(0, MIN_TOUCH_TARGET - width);

        // Si ya cumple en ambos ejes, no se necesita hitSlop.
        if (hDiff === 0 && wDiff === 0) {
            return undefined;
        }

        return {
            top: hDiff / 2,
            right: wDiff / 2,
            bottom: hDiff / 2,
            left: wDiff / 2,
        };
    }, [width, height]);

    return hitSlop;
}
