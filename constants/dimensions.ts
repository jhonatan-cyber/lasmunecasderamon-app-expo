import { TABLET_MIN_WIDTH } from '@/utils/responsive';

/**
 * Breakpoints de ancho. Para decidir si es tablet no usar estos valores: la
 * regla vive en `isTabletSize` / `useResponsiveMetrics` (lado corto), porque un
 * móvil en horizontal supera `lg` sin ser tablet.
 */
export const BREAKPOINTS = {
  sm: 375,
  md: 414,
  lg: TABLET_MIN_WIDTH,
  xl: 1024,
  xxl: 1280,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
