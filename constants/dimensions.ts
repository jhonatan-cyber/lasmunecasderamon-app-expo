import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isTablet = width >= 768;
export const isLandscape = width > height;

export const BREAKPOINTS = {
  sm: 375,
  md: 414,
  lg: 768,
  xl: 1024,
  xxl: 1280,
} as const;

export const DEVICE = {
  width,
  height,
  isTablet,
  isLandscape,
  isPhone: !isTablet,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export const getBreakpoint = (): BreakpointKey => {
  if (width >= BREAKPOINTS.xxl) return 'xxl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
};

export const isWidthAbove = (breakpoint: BreakpointKey): boolean => {
  return width >= BREAKPOINTS[breakpoint];
};

export const isWidthBelow = (breakpoint: BreakpointKey): boolean => {
  return width < BREAKPOINTS[breakpoint];
};
