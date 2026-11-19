import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColacionProductsCarousel } from '@/components/colaciones/ColacionProductsCarousel';
import type { ColacionProducto } from '@/services/colaciones';

type Children = { children?: React.ReactNode };
vi.mock('@/api/client-safe', () => ({ apiClientSafe: vi.fn() }));
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityState,
  }: Children & {
    onPress?: () => void;
    accessibilityLabel?: string;
    accessibilityState?: { selected?: boolean };
  }) => (
    <button
      onClick={onPress}
      aria-label={accessibilityLabel}
      aria-pressed={accessibilityState?.selected}
    >
      {children}
    </button>
  ),
  Image: () => null,
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  ScrollView: ({ children }: Children) => <div>{children}</div>,
  Modal: ({ children, visible }: any) => (visible ? <div>{children}</div> : null),
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    bg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
  }),
}));

const producto = (
  presentacion_id: number,
  producto_nombre: string,
  presentacion_nombre: string,
  ml_colacion: number,
): ColacionProducto => ({
  producto_id: presentacion_id,
  producto_nombre,
  presentacion_id,
  presentacion_nombre,
  ml_botella: 750,
  ml_abierta: 500,
  ml_colacion,
  opciones_venta: [{ id: 1, tipo: 'botella', ml_colacion }],
});

afterEach(cleanup);

describe('ColacionProductsCarousel', () => {
  it('selecciona por presentacion_id, no por un id que el catálogo no trae', () => {
    const onSelect = vi.fn();
    const vodka = producto(11, 'Vodka', '750 ml', 60);
    const ron = producto(12, 'Ron', '700 ml', 45);

    render(
      <ColacionProductsCarousel
        products={[vodka, ron]}
        selectedId=""
        loading={false}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Vodka 750 ml, colación de 60 ml/ }));

    expect(onSelect).toHaveBeenCalledWith('11');
  });

  it('muestra el nombre del producto, la presentación y los ml de colación', () => {
    render(
      <ColacionProductsCarousel
        products={[producto(11, 'Vodka', '750 ml', 60)]}
        selectedId="11"
        loading={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Vodka')).toBeTruthy();
    expect(screen.getByText('750 ml')).toBeTruthy();
    expect(screen.getByText('Colación: 60 ml')).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: /Vodka 750 ml, colación de 60 ml/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('no muestra ml de colación cuando la bebida no los tiene configurados', () => {
    render(
      <ColacionProductsCarousel
        products={[{ ...producto(11, 'Vodka', '750 ml', 0), ml_botella: 0 }]}
        selectedId=""
        loading={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('750 ml')).toBeTruthy();
    expect(screen.queryByText(/Colación:/)).toBeNull();
  });
});
