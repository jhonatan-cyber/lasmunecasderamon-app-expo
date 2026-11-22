import React, { type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransferDetailModal } from '@/components/barman/bar/TransferDetailModal';
import type { BarTransfer } from '@/hooks/useBarScreen';
import type { SaleOption } from '@/hooks/utils/saleChoice';

type Children = { children?: ReactNode };

vi.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({ children }: Children) => <button>{children}</button>,
  ScrollView: ({ children }: Children) => <div>{children}</div>,
  StyleSheet: {
    create: (styles: unknown) => styles,
    hairlineWidth: 1,
    absoluteFill: {},
  },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/components/ui/AppModal', () => ({
  AppModal: ({ visible, children }: { visible: boolean; children?: ReactNode }) =>
    visible ? <div>{children}</div> : null,
}));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    accentText: '#fff',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777',
  }),
}));
vi.mock('@/components/barman/bar/TransferCard', () => ({
  TransferActions: () => null,
}));
afterEach(cleanup);

const transfer = (opciones: SaleOption[]): BarTransfer => ({
  id: 't1',
  estado: 'pendiente',
  producto_nombre: 'Coca-Cola',
  presentacion_nombre: '1.5 L',
  cantidad: 2,
  fecha_crea: '2026-11-18T20:00:00',
  usuario_nombre: 'bodega',
  precio_venta: 15000,
  comision: 0,
  opciones_venta: opciones,
  // El servidor puede traer el ml del producto o el global; sin corto no debe verse.
  ml_shot: 50,
  ml_shot_anfitriona: 50,
});

const renderModal = (item: BarTransfer) =>
  render(
    <TransferDetailModal
      visible
      item={item}
      resolving={false}
      onClose={() => {}}
      onAccept={() => {}}
      onReject={() => {}}
    />,
  );

describe('TransferDetailModal volumen por corto', () => {
  it('oculta el volumen por corto cuando el traspaso solo vende botella', () => {
    renderModal(transfer([{ tipo: 'botella', precio: 15000, comision: 0 }]));

    expect(screen.queryByText('VOLUMEN POR CORTO')).toBeNull();
  });

  it('muestra el volumen por corto cuando el traspaso incluye el corto', () => {
    renderModal(
      transfer([
        { tipo: 'botella', precio: 15000, comision: 0 },
        { tipo: 'shot', precio: 3000, comision: 0 },
      ]),
    );

    expect(screen.getByText('VOLUMEN POR CORTO')).toBeTruthy();
    expect(screen.getAllByText('50 ml')).toHaveLength(2);
  });
});
