import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentSummaryCard } from '@/components/cajero/nueva-venta/PaymentSummaryCard';

vi.mock('@/components/cajero/forms/TipCheckbox', () => ({
  TipCheckbox: () => <div>Propina</div>,
}));

vi.mock('@/hooks/utils/individualShorts', () => ({
  individualShorts: vi.fn((cart: unknown[]) => cart),
}));

vi.mock('@/hooks/utils/cuentaUtils', () => ({
  getCardSplit: vi.fn(() => ({ venta: 0, propina: 0 })),
}));

afterEach(() => {
  cleanup();
});

const baseProps = {
  cart: [{ id: '1', nombre: 'Botella', quantity: 1, tipo_venta: 'botella' }],
  totals: { subtotal: 1000, tip: 100, total: 1100, recargoAcompanamiento: 0 },
  enableTip: false,
  metodoPago: 'efectivo',
  cajaAbierta: true,
  baucherFoto: null,
  isDark: true,
  splitVentaPct: 51,
  splitPropinaPct: 49,
  cardBg: '#111111',
  borderColor: '#333333',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  accentColor: '#E11D48',
  spacing: 16,
  borderRadius: 24,
  onToggleTip: vi.fn(),
  onDispatchCart: vi.fn(),
};

describe('PaymentSummaryCard — un solo CTA de cobro', () => {
  it('muestra los totales sin repetir el botón de finalizar', () => {
    render(<PaymentSummaryCard {...baseProps} />);

    expect(screen.getByText('Subtotal')).toBeDefined();
    expect(screen.getByText('TOTAL')).toBeDefined();
    expect(screen.queryByText('Finalizar Venta')).toBeNull();
    expect(screen.queryByLabelText('Finalizar venta')).toBeNull();
  });
});
