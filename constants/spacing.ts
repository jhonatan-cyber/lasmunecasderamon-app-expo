import { Dimensions } from 'react-native';
import { isTablet } from './dimensions';

const { width } = Dimensions.get('window');
const BASE_WIDTH = 375;
const scaleFactor = width / BASE_WIDTH;

const baseScale = (val: number): number => {
  if (isTablet) {
    return Math.round(val * 1.4);
  }
  return Math.round(val * scaleFactor);
};

const tabletScale = (val: number): number => {
  return Math.round(val * 1.4);
};

export const Spacing = {
  xxs: isTablet ? 2 : 2,
  xs: isTablet ? 6 : baseScale(4),
  sm: isTablet ? 10 : baseScale(8),
  md: isTablet ? 18 : baseScale(16),
  lg: isTablet ? 24 : baseScale(20),
  xl: isTablet ? 30 : baseScale(24),
  xxl: isTablet ? 40 : baseScale(32),
  xxxl: isTablet ? 50 : baseScale(40),
} as const;

export const FontSize = {
  xxs: isTablet ? 10 : 8,
  xs: isTablet ? 12 : 10,
  sm: isTablet ? 14 : 12,
  md: isTablet ? 16 : 14,
  lg: isTablet ? 18 : 16,
  xl: isTablet ? 22 : 18,
  xxl: isTablet ? 26 : 22,
  xxxl: isTablet ? 32 : 28,
  display: isTablet ? 40 : 34,
} as const;

export const BorderRadius = {
  xs: isTablet ? 6 : 4,
  sm: isTablet ? 10 : 8,
  md: isTablet ? 14 : 12,
  lg: isTablet ? 18 : 16,
  xl: isTablet ? 24 : 20,
  xxl: isTablet ? 32 : 28,
  full: 9999,
} as const;

export const IconSize = {
  sm: isTablet ? 18 : 16,
  md: isTablet ? 24 : 20,
  lg: isTablet ? 30 : 26,
  xl: isTablet ? 36 : 32,
} as const;

export const HitSlop = {
  sm: { top: 8, right: 8, bottom: 8, left: 8 },
  md: { top: 12, right: 12, bottom: 12, left: 12 },
  lg: { top: 16, right: 16, bottom: 16, left: 16 },
} as const;
