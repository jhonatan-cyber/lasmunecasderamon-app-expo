import { Platform } from 'react-native';
import { isTablet } from './dimensions';

const tintColorLight = '#000000';
const tintColorDark = '#FFFFFF';

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    background: '#FFFFFF',
    backgroundSecondary: '#F3F4F6',
    card: '#FFFFFF',
    cardSecondary: '#F9FAFB',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    tint: tintColorLight,
    tintSecondary: '#E11D48',
    icon: '#6B7280',
    iconSecondary: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    error: '#EF4444',
    errorLight: '#FEE2E2',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    accent: '#E11D48',
    accentLight: '#EDE9FE',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    background: '#000000',
    backgroundSecondary: '#111827',
    card: '#111111',
    cardSecondary: '#374151',
    border: '#374151',
    borderLight: '#4B5563',
    tint: tintColorDark,
    tintSecondary: '#A78BFA',
    icon: '#9CA3AF',
    iconSecondary: '#6B7280',
    tabIconDefault: '#4B5563',
    tabIconSelected: tintColorDark,
    error: '#F87171',
    errorLight: '#7F1D1D',
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#78350F',
    info: '#60A5FA',
    infoLight: '#1E3A8A',
    accent: '#A78BFA',
    accentLight: '#4C1D95',
    danger: '#F87171',
    dangerLight: '#7F1D1D',
  },
};

// Spacing, FontSize, and BorderRadius moved to constants/spacing.ts

// FontSize moved to constants/spacing.ts

export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

// BorderRadius moved to constants/spacing.ts

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
