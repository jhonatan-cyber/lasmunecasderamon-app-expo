import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DashboardActionCard } from '@/components/shared/DashboardActionCard';

vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/AnimatedButton', () => ({
  AnimatedButton: ({
    children,
    onPress,
    disabled,
    accessibilityLabel,
    accessibilityState,
  }: any) => (
    <button
      onClick={onPress}
      disabled={disabled}
      aria-label={accessibilityLabel}
      aria-disabled={accessibilityState?.disabled ? 'true' : undefined}
      type="button"
    >
      {children}
    </button>
  ),
}));

vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    isDark: true,
    cardBg: '#111111',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    borderColor: 'rgba(255,255,255,0.18)',
  }),
}));

vi.mock('@/hooks/useResponsiveMetrics', () => ({
  useResponsiveMetrics: () => ({ isTablet: false, isLandscape: false }),
}));

const baseProps = {
  title: 'SERVICIOS',
  description: 'Gestión de privados',
  icon: 'bed' as const,
  color: '#F97316',
  onPress: vi.fn(),
};

afterEach(() => {
  cleanup();
});

describe('DashboardActionCard — cuadro del dashboard', () => {
  it('muestra el título y la descripción del módulo', () => {
    render(<DashboardActionCard {...baseProps} />);

    expect(screen.getByText('SERVICIOS')).toBeDefined();
    expect(screen.getByText('Gestión de privados')).toBeDefined();
  });

  it('dibuja el contador cuando hay trabajo pendiente', () => {
    render(<DashboardActionCard {...baseProps} badge={3} />);

    expect(screen.getByText('3')).toBeDefined();
  });

  it('oculta el contador cuando no hay nada pendiente', () => {
    const { rerender } = render(<DashboardActionCard {...baseProps} badge={0} />);

    expect(screen.queryByText('0')).toBeNull();

    rerender(<DashboardActionCard {...baseProps} />);

    expect(screen.queryByText('0')).toBeNull();
  });

  it('acota el contador a 99+ cuando el número es grande', () => {
    render(<DashboardActionCard {...baseProps} badge={250} />);

    expect(screen.getByText('99+')).toBeDefined();
  });

  it('anuncia el contador a los lectores de pantalla', () => {
    render(
      <DashboardActionCard
        {...baseProps}
        badge={4}
        badgeLabel="solicitudes pendientes"
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'SERVICIOS: Gestión de privados. 4 solicitudes pendientes',
      }),
    ).toBeDefined();
  });

  it('no anuncia el contador cuando no hay nada pendiente', () => {
    render(<DashboardActionCard {...baseProps} badge={0} />);

    expect(
      screen.getByRole('button', { name: 'SERVICIOS: Gestión de privados' }),
    ).toBeDefined();
  });

  it('respeta el estado deshabilitado', () => {
    render(<DashboardActionCard {...baseProps} disabled />);

    expect(
      screen.getByRole('button', { name: 'SERVICIOS: Gestión de privados' }),
    ).toHaveProperty('disabled', true);
  });
});

describe('DashboardActionCard — variante fila', () => {
  it('mantiene la fila compacta sin contador', () => {
    render(<DashboardActionCard {...baseProps} variant="row" badge={3} />);

    expect(screen.getByText('SERVICIOS')).toBeDefined();
    expect(screen.queryByText('3')).toBeNull();
  });
});

describe('DashboardActionCard — módulo bloqueado', () => {
  it('anuncia que hace falta una caja abierta', () => {
    render(<DashboardActionCard {...baseProps} bloqueado />);

    expect(
      screen.getByRole('button', {
        name: 'SERVICIOS: Gestión de privados. Requiere una caja abierta',
      }),
    ).toBeDefined();
  });

  it('queda marcado como deshabilitado', () => {
    render(<DashboardActionCard {...baseProps} bloqueado />);

    const boton = screen.getByRole('button', { name: /Requiere una caja abierta/ });

    expect(boton).toHaveProperty('disabled', false);
    expect(boton.getAttribute('aria-disabled')).toBe('true');
  });

  it('mantiene el texto legible y oculta el contador', () => {
    render(<DashboardActionCard {...baseProps} bloqueado badge={3} />);

    expect(screen.getByText('SERVICIOS')).toBeDefined();
    expect(screen.getByText('Gestión de privados')).toBeDefined();
    // Bloqueado el módulo no se puede abrir: el contador se oculta y solo
    // queda el candado.
    expect(screen.queryByText('3')).toBeNull();
  });

  it('sin contador, el candado va solo', () => {
    render(<DashboardActionCard {...baseProps} bloqueado />);

    expect(screen.getByText('SERVICIOS')).toBeDefined();
    expect(screen.queryByText('3')).toBeNull();
  });
});
