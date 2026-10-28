import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PremiumHeaderActions } from '@/components/ui/PremiumHeaderActions';
import { useAuthStore } from '@/store/authStore';

vi.mock('react-native', () => ({
  Appearance: { setColorScheme: vi.fn() },
  Pressable: ({ children, onPress }: any) => (
    <button onClick={onPress}>{children}</button>
  ),
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: ({ name }: any) => <span>{name}</span>,
}));

vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({ isDark: false }),
}));

vi.mock('@/components/shared/BiometricEnrollmentModal', () => ({
  BiometricEnrollmentModal: () => null,
}));

const renderHeader = () =>
  render(
    <PremiumHeaderActions
      showAlert={vi.fn()}
      profilePath="/cajero/perfil"
      onQRScannerPress={vi.fn()}
      onPersonalPress={vi.fn()}
    />,
  );

const setSession = (role: string) => {
  useAuthStore.setState({
    user: { id: 1, role } as any,
    biometricoFacialEnrolled: false,
  });
};

afterEach(() => {
  cleanup();
  useAuthStore.setState({ user: null });
});

describe('PremiumHeaderActions — acciones del header según rol', () => {
  it('oculta campana, asistencia (QR), personal y enrolar para un administrador', () => {
    setSession('administrador');

    renderHeader();

    expect(screen.queryByText('notifications-outline')).toBeNull();
    expect(screen.queryByText('qr-code')).toBeNull();
    expect(screen.queryByText('people')).toBeNull();
    expect(screen.queryByText('finger-print')).toBeNull();
  });

  it('mantiene campana, personal y enrolar para un cajero', () => {
    setSession('cajero');

    renderHeader();

    expect(screen.getByText('notifications-outline')).toBeDefined();
    expect(screen.getByText('people')).toBeDefined();
    expect(screen.getByText('finger-print')).toBeDefined();
  });

  it('mantiene el escáner de asistencia (QR) para roles no administradores', () => {
    setSession('anfitriona');

    renderHeader();

    expect(screen.getByText('qr-code')).toBeDefined();
  });
});
