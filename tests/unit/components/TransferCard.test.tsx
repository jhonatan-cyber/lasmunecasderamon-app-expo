import React, { type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransferCard } from '@/components/barman/bar/TransferCard';
import type { BarTransfer } from '@/hooks/useBarScreen';

vi.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Pressable: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
    <button onClick={onPress}>{children}</button>
  ),
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777',
  }),
}));
afterEach(cleanup);

const traspaso = (overrides: Partial<BarTransfer>): BarTransfer => ({
  id: 't1',
  estado: 'pendiente',
  producto_nombre: 'Johnnie Walker',
  presentacion_nombre: 'Botella 750 ml',
  cantidad: 1,
  fecha_crea: '2026-11-18T12:00:00.000Z',
  usuario_nombre: 'Jefa de barra',
  precio_venta: 0,
  comision: 0,
  ...overrides,
});

describe('TransferCard', () => {
  it('muestra ambos precios con su comisión cuando la botella se vende con y sin anfitriona', () => {
    render(
      <TransferCard
        item={traspaso({
          opciones_venta: [
            {
              tipo: 'botella',
              precio: 30000,
              comision: 5000,
              precio_sin_anfitriona: 18000,
              vender_con_anfitriona: true,
            },
          ],
        })}
        onPress={vi.fn()}
      />,
    );

    expect(screen.getByText('Botella con anfitriona')).toBeTruthy();
    expect(screen.getByText('$30.000 · Comisión $5.000')).toBeTruthy();
    expect(screen.getByText('Botella sin anfitriona')).toBeTruthy();
    expect(screen.getByText('$18.000')).toBeTruthy();
  });

  it('sin venta con anfitriona muestra solo el precio de botella sin anfitriona', () => {
    render(
      <TransferCard
        item={traspaso({
          opciones_venta: [
            {
              tipo: 'botella',
              precio: 0,
              comision: 0,
              precio_sin_anfitriona: 18000,
              vender_con_anfitriona: false,
            },
          ],
        })}
        onPress={vi.fn()}
      />,
    );

    expect(screen.getByText('Botella sin anfitriona')).toBeTruthy();
    expect(screen.getByText('$18.000')).toBeTruthy();
    expect(screen.queryByText('Botella con anfitriona')).toBeNull();
    expect(screen.queryByText(/Comisión/)).toBeNull();
  });

  it('sin comisión configurada no muestra la etiqueta de comisión', () => {
    render(
      <TransferCard
        item={traspaso({
          opciones_venta: [{ tipo: 'botella', precio: 12000, comision: 0 }],
        })}
        onPress={vi.fn()}
      />,
    );

    expect(screen.getByText('Botella')).toBeTruthy();
    expect(screen.getByText('$12.000')).toBeTruthy();
    expect(screen.queryByText(/Comisión/)).toBeNull();
  });

  it('los traspasos antiguos sin opciones guardadas conservan el precio del movimiento', () => {
    render(
      <TransferCard
        item={traspaso({ opciones_venta: null, precio_venta: 9000, comision: 1000 })}
        onPress={vi.fn()}
      />,
    );

    expect(screen.getByText('Botella')).toBeTruthy();
    expect(screen.getByText('$9.000 · Comisión $1.000')).toBeTruthy();
  });
});
