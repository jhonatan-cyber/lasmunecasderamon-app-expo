import { Platform } from 'react-native';

const tintColorLight = '#000000';
const tintColorDark = '#FFFFFF';

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#4B5563',
    textMuted: '#4B5563',
    background: '#FFFFFF',
    backgroundSecondary: '#F3F4F6',
    card: '#FFFFFF',
    cardSecondary: '#F3F4F6',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    tint: tintColorLight,
    tintSecondary: '#FF1B3D',
    icon: '#4B5563',
    iconSecondary: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,
    error: '#EF4444',
    errorLight: '#FEE2E2',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    accent: '#FF1B3D',
    accentLight: '#FF8FA3',
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
    tintSecondary: '#FF5C7A',
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
    accent: '#FF1B3D',
    accentLight: '#4A0015',
    danger: '#F87171',
    dangerLight: '#7F1D1D',
  },
};

export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

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
