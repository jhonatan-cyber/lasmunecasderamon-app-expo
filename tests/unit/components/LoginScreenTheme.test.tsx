import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginScreen from '@/app/(auth)/login';
import { DEFAULT_ACCENT_COLOR, useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { resolveThemePalette } from '@/utils/themePalette';

vi.mock('react-native', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ImageBackground: passthrough,
    KeyboardAvoidingView: passthrough,
    Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios ?? options.default },
    Pressable: passthrough,
    ScrollView: passthrough,
    StyleSheet: { absoluteFill: {}, create: (styles: unknown) => styles },
    View: passthrough,
    Appearance: {
      getColorScheme: () => 'dark',
      addChangeListener: () => ({ remove: vi.fn() }),
      setColorScheme: vi.fn(),
    },
  };
});

vi.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/components/auth/LoginForm', () => ({
  default: ({ accentColor }: { accentColor: string }) => (
    <div data-testid="login-form" data-accent-color={accentColor} />
  ),
}));
vi.mock('@/components/auth/LoginLandscapeLayout', () => ({ default: ({ children }: any) => children }));
vi.mock('@/components/auth/ResetPasswordModal', () => ({ default: () => null }));
vi.mock('@/components/shared/QRScannerModal', () => ({ QRScannerModal: () => null }));
vi.mock('@/components/ui/AnimatedScreen', () => ({ AnimatedScreen: ({ children }: any) => children }));
vi.mock('@/components/ui/PremiumAlert', () => ({ PremiumAlert: () => null }));
vi.mock('@/hooks/useLogin', () => ({
  default: () => ({
    username: '',
    setUsername: vi.fn(),
    password: '',
    setPassword: vi.fn(),
    resetRun: '',
    setResetRun: vi.fn(),
    showPassword: false,
    setShowPassword: vi.fn(),
    error: '',
    loading: false,
    showQRScanner: false,
    setShowQRScanner: vi.fn(),
    showResetPasswordModal: false,
    setShowResetPasswordModal: vi.fn(),
    passwordRef: { current: null },
    isBiometricSupported: false,
    isBiometricEnabled: false,
    rememberMe: false,
    setRememberMe: vi.fn(),
    alertConfig: { visible: false, title: '', message: '', type: 'info' },
    closeAlert: vi.fn(),
    onAlertConfirm: vi.fn(),
    handleResetPassword: vi.fn(),
    handleLogin: vi.fn(),
    handleQRScan: vi.fn(),
    handleBiometricLogin: vi.fn(),
    closeResetPasswordModal: vi.fn(),
  }),
}));
vi.mock('@/hooks/useResponsiveMetrics', () => ({ useResponsiveMetrics: () => ({ isLandscape: false }) }));

beforeEach(() => {
  useAuthStore.setState({ user: null });
  useThemeStore.setState({
    userColors: {
      previous: '#0095FF',
      mostRecent: '#00FFA6',
    },
  });
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null });
  useThemeStore.setState({ userColors: {} });
});

describe('LoginScreen: acento sin sesión', () => {
  it('no hereda el acento guardado más recientemente para otra cuenta', () => {
    render(<LoginScreen />);

    expect(screen.getByTestId('login-form').getAttribute('data-accent-color')).toBe(
      resolveThemePalette(DEFAULT_ACCENT_COLOR, true).primaryColor,
    );
  });
});