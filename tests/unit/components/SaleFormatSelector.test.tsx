import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaleFormatSelector } from '@/components/cajero/nueva-venta/SaleFormatSelector';
import type {
  OpcionVentaProducto,
  SaleChoice,
} from '@/hooks/utils/saleChoice';

type Children = {
  children?: ReactNode;
  accessibilityLabel?: string;
  accessibilityState?: { disabled?: boolean };
};
vi.mock('react-native', () => ({
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Platform: { select: () => ({}) },
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
  }: Children & { onPress?: () => void }) => (
    <button onClick={onPress} aria-label={accessibilityLabel}>
      {children}
    </button>
  ),
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));

afterEach(cleanup);

const theme = {
  accentColor: '#933333',
  textPrimary: '#111',
  textSecondary: '#555',
  borderColor: '#777',
  cardBg: '#fff',
};
const product = { id: 'p1', stock_bar: 5 };
const props = {
  product,
  shotMl: 30,
  cart: [] as unknown[],
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  ...theme,
};
/** Mismo formato que el componente (`toLocaleString()` sin locale). */
const money = (monto: number) => `$${monto.toLocaleString()}`;
const option = (
  value: SaleChoice,
  precio: number,
  comision: number,
  esShot = false,
): OpcionVentaProducto => ({ value, nombre: 'Botella', precio, comision, esShot });

describe('SaleFormatSelector', () => {
  it('no muestra comisiones en 0 aunque otra opción del producto sí tenga comisión', () => {
    render(
      <SaleFormatSelector
        {...props}
        options={[
          option('botella', 30000, 5000),
          option('shot', 3000, 0, true),
        ]}
      />,
    );

    expect(
      screen.getByText(`${money(30000)} · comisión ${money(5000)}`),
    ).toBeTruthy();
    expect(screen.getByText(money(3000))).toBeTruthy();
    expect(
      screen.queryByText(`${money(3000)} · comisión ${money(0)}`),
    ).toBeNull();
    expect(screen.queryByText(/comisión \$0/)).toBeNull();
    // La comisión solo se menciona en la opción que sí la tiene.
    expect(document.body.textContent?.match(/comisión/gi)).toHaveLength(1);
  });

  it('agrega y quita del carrito con el contador del carrito', () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const { rerender } = render(
      <SaleFormatSelector
        {...props}
        options={[option('botella', 30000, 5000)]}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByLabelText('Botella: agregar al carrito'));
    expect(onAdd).toHaveBeenCalledWith('botella', 1);

    rerender(
      <SaleFormatSelector
        {...props}
        options={[option('botella', 30000, 5000)]}
        cart={[{ id: 'p1', tipo_venta: 'botella', quantity: 2 }]}
        onAdd={onAdd}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText('2')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Botella: quitar del carrito'));
    expect(onRemove).toHaveBeenCalledWith('botella');
  });
});
