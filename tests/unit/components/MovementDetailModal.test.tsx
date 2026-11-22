import React, { type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MovementDetailModal } from '@/components/barman/bar/MovementDetailModal';
import type { BarMovement } from '@/hooks/useBarScreen';

type Children = { children?: ReactNode };

vi.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({ children }: Children) => <button>{children}</button>,
  ScrollView: ({ children }: Children) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1, absoluteFill: {} }
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@/api/client', () => ({ BASE_URL: 'http://test' }));
vi.mock('@/components/ui/AppModal', () => ({
  AppModal: ({ visible, children }: { visible: boolean; children?: ReactNode }) =>
    visible ? <div>{children}</div> : null
}));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    accentText: '#fff',
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
  precio_venta: 30000,
  comision: 0,
  fecha_crea: '2026-11-18T12:00:00.000Z',
  producto_nombre: 'Johnnie Walker',
  presentacion_nombre: 'Botella 750 ml',
  usuario_nombre: 'Jefa de barra',
  usuario_nick: null,
  ...overrides
});

const renderModal = (movement: BarMovement) =>
  render(
    <MovementDetailModal visible movement={movement} onClose={() => {}} />
  );

describe('MovementDetailModal precios del historial', () => {
  it('lista los precios configurados con y sin anfitriona, con comisión solo si existe', () => {
    renderModal(
      movimiento({
        opciones_venta: [
          {
            tipo: 'botella',
            precio: 30000,
            comision: 5000,
            precio_sin_anfitriona: 18000
          }
        ]
      })
    );

    expect(screen.getByText('PRECIOS CONFIGURADOS EN EL TRASPASO')).toBeTruthy();
    expect(screen.getByText('Con anfitriona')).toBeTruthy();
    expect(screen.getByText('$30.000 · comisión $5.000')).toBeTruthy();
    expect(screen.getByText('Botella sin anfitriona')).toBeTruthy();
    expect(screen.getByText('$18.000')).toBeTruthy();
    expect(screen.queryByText('Comisión')).toBeNull();
    expect(screen.queryByText('Ml shot cliente')).toBeNull();
  });

  it('con la venta con anfitriona desactivada solo muestra la botella sin anfitriona', () => {
    renderModal(
      movimiento({
        precio_venta: 18000,
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
    );

    expect(screen.getByText('Botella sin anfitriona')).toBeTruthy();
    expect(screen.queryByText('Con anfitriona')).toBeNull();
    expect(screen.queryByText(/comisión/)).toBeNull();
  });

  it('una venta sin opciones conserva el precio del movimiento y oculta la comisión en cero', () => {
    renderModal(
      movimiento({ tipo: 'venta', opciones_venta: null, precio_venta: 9000, comision: 0 })
    );

    expect(screen.queryByText('PRECIOS CONFIGURADOS EN EL TRASPASO')).toBeNull();
    expect(screen.getByText('Precio unitario')).toBeTruthy();
    expect(screen.getByText('$9.000')).toBeTruthy();
    expect(screen.queryByText('Comisión')).toBeNull();
  });

  it('muestra la comisión del movimiento cuando es mayor a cero', () => {
    renderModal(
      movimiento({ tipo: 'venta', opciones_venta: null, precio_venta: 9000, comision: 1000 })
    );

    expect(screen.getByText('Comisión')).toBeTruthy();
    expect(screen.getByText('$1.000')).toBeTruthy();
  });
});
