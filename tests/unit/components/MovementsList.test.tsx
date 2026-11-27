import React, { type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MovementsList } from '@/components/barman/bar/MovementsList';
import type { BarMovement } from '@/hooks/useBarScreen';

type Children = { children?: ReactNode };
const list = vi.hoisted(() => ({ contentContainerStyle: undefined as unknown }));

vi.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({ children }: Children) => <button>{children}</button>,
  RefreshControl: () => null,
  FlatList: ({
    data,
    renderItem,
    ListEmptyComponent,
    contentContainerStyle,
  }: {
    data: unknown[];
    renderItem: (info: { item: unknown }) => ReactNode;
    ListEmptyComponent?: ReactNode;
    contentContainerStyle?: unknown;
  }) => {
    list.contentContainerStyle = contentContainerStyle;
    return (
      <div>
        {data.length > 0
          ? data.map((item, index) => <div key={index}>{renderItem({ item })}</div>)
          : ListEmptyComponent}
      </div>
    );
  },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 }
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 16 }),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/components/ui/SkeletonLoader', () => ({ SkeletonLoader: () => null }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777'
  })
}));
afterEach(cleanup);

const movimiento = (overrides: Partial<BarMovement>): BarMovement => ({
  id: 'm1',
  tipo: 'traspaso',
  estado: 'aceptada',
  cantidad: 1,
  ml: null,
  precio_venta: 0,
  comision: 0,
  fecha_crea: '2026-11-18T12:00:00.000Z',
  producto_nombre: 'Johnnie Walker',
  presentacion_nombre: 'Botella 750 ml',
  usuario_nombre: 'Jefa de barra',
  usuario_nick: null,
  ...overrides
});

const renderLista = (items: BarMovement[]) =>
  render(
    <MovementsList
      items={items}
      loading={false}
      refreshing={false}
      onRefresh={() => {}}
      onPressItem={() => {}}
    />
  );

describe('MovementsList precios del historial', () => {
  it('reserva el inset inferior debajo del último card', () => {
    renderLista([movimiento({})]);

    expect(list.contentContainerStyle).toEqual([
      { paddingHorizontal: 16 },
      { paddingBottom: 40 },
    ]);
  });

  it('muestra cada forma de venta configurada con su comisión', () => {
    renderLista([
      movimiento({
        opciones_venta: [
          {
            tipo: 'botella',
            precio: 30000,
            comision: 5000,
            precio_sin_anfitriona: 18000
          },
          { tipo: 'shot', precio: 3000, comision: 0 }
        ]
      })
    ]);

    expect(screen.getByText('Con anfitriona')).toBeTruthy();
    expect(screen.getByText('$30.000 · Comisión $5.000')).toBeTruthy();
    expect(screen.getByText('Botella sin anfitriona')).toBeTruthy();
    expect(screen.getByText('$18.000')).toBeTruthy();
    expect(screen.getByText('Corto')).toBeTruthy();
    expect(screen.getByText('$3.000')).toBeTruthy();
  });

  it('no muestra comisiones en 0 aunque otra opción del movimiento sí tenga comisión', () => {
    renderLista([
      movimiento({
        opciones_venta: [
          { tipo: 'botella', precio: 30000, comision: 5000 },
          { tipo: 'shot', precio: 3000, comision: 0 }
        ]
      })
    ]);

    expect(screen.getByText('$30.000 · Comisión $5.000')).toBeTruthy();
    expect(screen.getByText('$3.000')).toBeTruthy();
    expect(screen.getAllByText(/Comisión/)).toHaveLength(1);
    expect(screen.queryByText(/Comisión \$0/)).toBeNull();
  });

  it('sin venta con anfitriona solo lista la botella sin anfitriona y sin comisión', () => {
    renderLista([
      movimiento({
        opciones_venta: [
          {
            tipo: 'botella',
            precio: 0,
            comision: 0,
            precio_sin_anfitriona: 18000,
            vender_con_anfitriona: false
          }
        ]
      })
    ]);

    expect(screen.getByText('Botella sin anfitriona')).toBeTruthy();
    expect(screen.getByText('$18.000')).toBeTruthy();
    expect(screen.queryByText('Con anfitriona')).toBeNull();
    expect(screen.queryByText(/Comisión/)).toBeNull();
  });

  it('una venta sin opciones conserva precio y comisión del movimiento', () => {
    renderLista([
      movimiento({ tipo: 'venta', opciones_venta: null, precio_venta: 9000, comision: 1000 })
    ]);

    expect(screen.getByText('$9.000')).toBeTruthy();
    expect(screen.getByText('Comisión $1.000')).toBeTruthy();
  });

  it('una venta sin comisión no muestra la etiqueta de comisión', () => {
    renderLista([
      movimiento({ tipo: 'venta', opciones_venta: null, precio_venta: 9000, comision: 0 })
    ]);

    expect(screen.getByText('$9.000')).toBeTruthy();
    expect(screen.queryByText(/Comisión/)).toBeNull();
  });
});
