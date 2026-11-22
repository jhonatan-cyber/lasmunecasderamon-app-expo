import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CajeroActionGrid } from '@/components/cajero/CajeroActionGrid';
import { useIsAdmin } from '@/hooks/useIsAdmin';

vi.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <div>{children}</div>,
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

vi.mock('@/components/shared/DashboardActionCard', () => ({
  DashboardActionCard: ({ title, color, borderColor, badge }: any) => (
    <div
      data-title={title}
      data-color={color}
      data-border-color={borderColor}
      data-badge={badge}
    >
      {title}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('CajeroActionGrid — tarjetas visibles según rol', () => {
  const TARJETAS_CAJERO = [
    'RESUMEN',
    'VENTAS',
    'SERVICIOS',
    'CAJA',
    'PEDIDOS',
    'CLIENTES',
  ];

  const TARJETAS_ADMIN = [
    'ESTADO DE CAJA',
    'RESUMEN',
    'ASISTENCIA LOCAL',
    'VENTAS',
    'SERVICIOS',
    'COMPRAS',
    'PAGOS',
    'ANTICIPOS',
    'HORAS EXTRAS',
    'CONFIGURACIÓN',
  ];

  const TARJETAS_SOLO_CAJERO = [
    'CAJA',
    'PEDIDOS',
    'CLIENTES',
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
    // El cajero no cobra entradas en la puerta: esa tarjeta es del garzón.
    expect(screen.queryByText('ENTRADAS')).toBeNull();
  });

  it('oculta las tarjetas FINANCIERO y ANALÍTICAS para el cajero', () => {
    vi.mocked(useIsAdmin).mockReturnValue(false);

    render(<CajeroActionGrid />);

    expect(screen.queryByText('FINANCIERO')).toBeNull();
    expect(screen.queryByText('ANALÍTICAS')).toBeNull();
  });

  it('usa iconos de distintos colores', () => {
    vi.mocked(useIsAdmin).mockReturnValue(false);

    render(<CajeroActionGrid />);

    const ventas = screen.getByText('VENTAS').closest('[data-title="VENTAS"]');
    const servicios = screen.getByText('SERVICIOS').closest('[data-title="SERVICIOS"]');

    expect(ventas?.getAttribute('data-color')).toBe('#22C55E');
    expect(servicios?.getAttribute('data-color')).toBe('#F97316');
  });

  it('no repite en PEDIDOS el contador que ya muestra la campana del encabezado', () => {
    vi.mocked(useIsAdmin).mockReturnValue(false);

    render(<CajeroActionGrid pendingCount={3} />);

    const pedidos = screen.getByText('PEDIDOS').closest('[data-title="PEDIDOS"]');

    expect(pedidos?.getAttribute('data-badge')).toBeNull();
  });

  it('muestra el contador de anticipos por entregar al administrador', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);

    render(<CajeroActionGrid pendingAdvances={2} />);

    const anticipos = screen
      .getByText('ANTICIPOS')
      .closest('[data-title="ANTICIPOS"]');

    expect(anticipos?.getAttribute('data-badge')).toBe('2');
  });
});
