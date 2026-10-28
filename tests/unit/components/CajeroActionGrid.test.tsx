import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CajeroActionGrid } from '@/components/cajero/CajeroActionGrid';
import { useIsAdmin } from '@/hooks/useIsAdmin';

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: any) => <div>{children}</div>,
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({ accentColor: '#E11D48' }),
}));

vi.mock('@/hooks/useCajaAbierta', () => ({
  useCajaAbierta: () => ({ bloqueado: false }),
}));

vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: vi.fn() }));

vi.mock('@/components/shared/BloqueoPorCaja', () => ({
  BloqueoPorCaja: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/garzon/GarzonActionCard', () => ({
  GarzonActionCard: ({ title }: any) => <div>{title}</div>,
}));

afterEach(() => {
  cleanup();
});

describe('CajeroActionGrid — tarjetas visibles según rol', () => {
  const TARJETAS_CAJERO = [
    'VENTAS',
    'CUENTAS',
    'SERVICIOS',
    'CAJA',
    'PEDIDOS',
    'CLIENTES',
    'CORTESÍAS',
    'PERSONAL',
    'GRATIFICACIONES',
    'FINANCIERO',
    'ANALÍTICAS',
  ];

  it('muestra sólo la tarjeta de CONFIGURACIÓN para un administrador', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);

    render(<CajeroActionGrid />);

    expect(screen.getByText('CONFIGURACIÓN')).toBeDefined();
    TARJETAS_CAJERO.forEach((titulo) => {
      expect(screen.queryByText(titulo)).toBeNull();
    });
  });

  it('muestra todas las tarjetas del cajero (sin CONFIGURACIÓN) para un no administrador', () => {
    vi.mocked(useIsAdmin).mockReturnValue(false);

    render(<CajeroActionGrid />);

    TARJETAS_CAJERO.forEach((titulo) => {
      expect(screen.getByText(titulo)).toBeDefined();
    });
    expect(screen.queryByText('CONFIGURACIÓN')).toBeNull();
  });
});
