import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Devuelve `true` cuando el usuario pidió reducir el movimiento en su sistema.
 * Las animaciones decorativas deben desactivarse o acortarse en ese caso.
 */
export function useReducedMotion(): boolean {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        let active = true;

        if (typeof AccessibilityInfo?.isReduceMotionEnabled !== 'function') {
            return;
        }

        AccessibilityInfo.isReduceMotionEnabled()
            .then((enabled) => {
                if (active) setReducedMotion(enabled);
            })
            .catch(() => {
                // En plataformas sin soporte se mantiene la animación.
            });

        const subscription = AccessibilityInfo.addEventListener?.(
            'reduceMotionChanged',
            (enabled) => setReducedMotion(enabled),
        );

        return () => {
            active = false;
            subscription?.remove();
        };
    }, []);

    return reducedMotion;
}
