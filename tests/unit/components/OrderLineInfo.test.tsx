import React, { type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderLineInfo } from '@/components/garzon/productos/OrderLineInfo';
import type { CartItem, Product } from '@/types/cart';

vi.mock('react-native', () => ({
  Dimensions: { get: () => ({ width: 360, height: 780, scale: 2, fontScale: 1 }) },
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({ textPrimary: '#111', textSecondary: '#555', accentOnSurface: '#7a2020' }),
}));
vi.mock('@/hooks/useConfigValue', () => ({
  useConfigValue: () => '50',
}));
vi.mock('@/components/shared/OrderProductPhoto', () => ({
  OrderProductPhoto: () => null,
}));
afterEach(cleanup);

const producto = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    code: 'JW-750',
    name: 'Johnnie Walker',
    producto_nombre: 'Johnnie Walker',
    presentacion_nombre: 'Botella 750 ml',
    category_id: 'c1',
    categoria: 'Whisky',
    price: 30000,
    tipo_venta: 'botella',
    ...overrides,
  }) as Product;

const item = (product: Product): CartItem => ({
  product,
  quantity: 1,
  selectedHostesses: [],
  selectedRoom: null,
});

describe('OrderLineInfo acompañamientos de botella', () => {
  it('ignora los sabores con 0 unidades en la lista y en el total por botella', () => {
    render(
      <OrderLineInfo
        item={item(
          producto({
            acompanamiento_botella: [
              { presentacion_id: 'coca', unidades: 2, nombre: 'Coca-Cola' },
              { presentacion_id: 'sprite', unidades: 0, nombre: 'Sprite' },
            ],
          }),
        )}
      />,
    );

    expect(screen.getByText('Coca-Cola')).toBeTruthy();
    expect(screen.getByText(/2 unidades por botella · total/)).toBeTruthy();
    // El sabor sin unidades no aparece ni suma al encabezado del acompañamiento.
    expect(screen.queryByText('Sprite')).toBeNull();
    expect(screen.queryByText(/0 unidades por botella/)).toBeNull();
    // El encabezado suma solo los sabores mostrados: 2, no 2 + 0.
    expect(screen.getByText(/^Acompañamiento por botella \(2 unidades/)).toBeTruthy();
  });

  it('sin ningún sabor con unidades no muestra el bloque de acompañamiento', () => {
    render(
      <OrderLineInfo
        item={item(
          producto({
            acompanamiento_botella: [
              { presentacion_id: 'coca', unidades: 0, nombre: 'Coca-Cola' },
            ],
          }),
        )}
      />,
    );

    expect(screen.queryByText(/Acompañamiento por botella/)).toBeNull();
    expect(screen.queryByText('Coca-Cola')).toBeNull();
  });
});
