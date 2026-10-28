import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CajeroStats } from '@/components/cajero/CajeroStats';

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/AnimatedView', () => ({
  AnimatedView: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#E11D48',
    isDark: false,
    cardBg: '#FFFFFF',
    textPrimary: '#111111',
    textSecondary: '#666666',
  }),
}));

const stats = {
  balance_total: 1000,
  monto_apertura: 200,
  total_servicios: 300,
  total_ventas: 400,
};

afterEach(() => {
  cleanup();
});

describe('CajeroStats — tarjeta de ancho completo', () => {
  it('muestra la tarjeta "Balance Total" por defecto', () => {
    render(<CajeroStats stats={stats} fullWidth />);

    expect(screen.getByText('Balance Total')).toBeDefined();
    expect(screen.getByText('Servicios')).toBeDefined();
    expect(screen.getByText('Ventas')).toBeDefined();
  });

  it('oculta la tarjeta de ancho completo cuando hideFullWidth es true', () => {
    render(<CajeroStats stats={stats} fullWidth hideFullWidth />);

    expect(screen.queryByText('Balance Total')).toBeNull();
    expect(screen.getByText('Servicios')).toBeDefined();
    expect(screen.getByText('Ventas')).toBeDefined();
  });
});
