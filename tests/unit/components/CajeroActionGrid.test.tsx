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
  GarzonActionCard: ({ title, color, borderColor }: any) => (
    <div data-title={title} data-color={color} data-border-color={borderColor}>
      {title}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('CajeroActionGrid — tarjetas visibles según rol', () => {
  const TARJETAS_CAJERO = [
    'VENTAS',
    'CUENTAS',
    'SERVICIOS',
    'COLACIONES',
    'CAJA',
    'PEDIDOS',
    'CLIENTES',
    'ENTRADAS',
    'COVERS',
    'LIMPIEZA',
    'PERSONAL',
    'GRATIFICACIONES',
  ];

  const TARJETAS_ADMIN = [
    'ESTADO DE CAJA',
    'ASISTENCIA LOCAL',
    'VENTAS',
    'SERVICIOS',
    'COMPRAS',
    'PAGOS',
    'ANTICIPOS',
    'GRATIFICACIONES',
    'HORAS EXTRAS',
    'CONFIGURACIÓN',
  ];

  const TARJETAS_SOLO_CAJERO = [
    'CUENTAS',
    'COLACIONES',
    'CAJA',
    'PEDIDOS',
    'CLIENTES',
    'ENTRADAS',
    'COVERS',
    'LIMPIEZA',
    'PERSONAL',
  ];

  it('muestra los módulos de administración para un administrador', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);

    render(<CajeroActionGrid />);

    TARJETAS_ADMIN.forEach((titulo) => {
      expect(screen.getByText(titulo)).toBeDefined();
    });
    TARJETAS_SOLO_CAJERO.forEach((titulo) => {
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

  it('oculta las tarjetas FINANCIERO y ANALÍTICAS para el cajero', () => {
    vi.mocked(useIsAdmin).mockReturnValue(false);

    render(<CajeroActionGrid />);

    expect(screen.queryByText('FINANCIERO')).toBeNull();
    expect(screen.queryByText('ANALÍTICAS')).toBeNull();
  });

  it('usa iconos de distintos colores y el acento de la app como borde', () => {
    vi.mocked(useIsAdmin).mockReturnValue(false);

    render(<CajeroActionGrid />);

    const ventas = screen.getByText('VENTAS').closest('[data-title="VENTAS"]');
    const cuentas = screen.getByText('CUENTAS').closest('[data-title="CUENTAS"]');

    expect(ventas?.getAttribute('data-color')).toBe('#22C55E');
    expect(cuentas?.getAttribute('data-color')).toBe('#3B82F6');
    expect(ventas?.getAttribute('data-border-color')).toBe('#E11D48');
    expect(cuentas?.getAttribute('data-border-color')).toBe('#E11D48');
  });
});
