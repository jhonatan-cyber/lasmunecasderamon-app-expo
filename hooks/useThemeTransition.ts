import { useCallback, useEffect, useRef, useState } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Envuelve el cambio de tema con una transición de opacidad de 200ms
 * para evitar el parpadeo brusco entre modo claro y oscuro.
 *
 * Devuelve `opacity` (Animated.Value) y `isDark` para usar en el layout.
 */
export function useThemeTransition() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [prevDark, setPrevDark] = useState(isDark);
    const [fading, setFading] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startFade = useCallback(() => {
        setFading(true);
        timeoutRef.current = setTimeout(() => {
            setFading(false);
        }, 200);
    }, []);

    useEffect(() => {
        if (prevDark !== isDark) {
            startFade();
            setPrevDark(isDark);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isDark, prevDark, startFade]);

    // Opacidad: 0 durante la transición, 1 en estado estable.
    const opacity = fading ? 0 : 1;

    return { isDark, opacity, fading };
}
