import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { computeResponsiveMetrics, type ResponsiveMetrics } from '@/utils/responsive';

/**
 * Tokens de layout que sí reaccionan a cambios de tamaño (rotación, web,
 * split-screen). Preferir este hook en componentes nuevos; los estilos creados
 * con `StyleSheet.create` a nivel de módulo conservan el tamaño del arranque.
 */
export function useResponsiveMetrics(): ResponsiveMetrics {
    const { width, height } = useWindowDimensions();
    return useMemo(() => computeResponsiveMetrics(width, height), [width, height]);
}
