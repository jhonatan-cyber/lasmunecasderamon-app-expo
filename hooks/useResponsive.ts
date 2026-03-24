import { useWindowDimensions } from 'react-native';
import { BREAKPOINTS, BreakpointKey } from '@/constants/dimensions';

interface ResponsiveValues<T> {
  phone: T;
  tablet: T;
  desktop?: T;
}

export function useResponsive<T>(values: ResponsiveValues<T>): T {
  const { width } = useWindowDimensions();
  const isTablet = width >= BREAKPOINTS.lg;

  if (isTablet && values.desktop !== undefined) {
    return values.desktop;
  }
  return isTablet ? values.tablet : values.phone;
}

export function useBreakpoint(): BreakpointKey {
  const { width } = useWindowDimensions();

  if (width >= BREAKPOINTS.xxl) return 'xxl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
}

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= BREAKPOINTS.lg;
}

export function useIsLandscape(): boolean {
  const { width, height } = useWindowDimensions();
  return width > height;
}

export function useScaleFactor(): number {
  const { width } = useWindowDimensions();
  const BASE_WIDTH = 375;
  return width / BASE_WIDTH;
}

