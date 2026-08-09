import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNuevaVenta } from '@/hooks/useNuevaVenta';
import { apiClientSafe } from '@/api/client';

// ── Mocks ────────────────────────────────────────────────────────────────
const configValues = vi.hoisted(() => new Map<string, string>());

vi.mock('@/hooks/useConfigValue', () => ({
  useConfigValue: (_category: string, key: string, fallback: string) =>
    configValues.get(key) ?? fallback
}));

vi.mock('@/context/SalesContext', () => ({
  useSales: () => ({ refreshVentas: vi.fn() })
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() })
}));

// ── Helpers ──────────────────────────────────────────────────────────────
const renderSaleHook = () => {
  const rendered = renderHook(() => useNuevaVenta());
  return rendered;
};

const setMetodoPago = (result: any, metodo: string) => {
  act(() => {
    result.current.dispatch({ type: 'SET_METODO_PAGO', payload: metodo as any });
  });
};

const setEnableTip = (result: any, enabled: boolean) => {
  act(() => {
    result.current.dispatch({ type: 'SET_ENABLE_TIP', payload: enabled });
  });
};

const setCart = (result: any, items: any[]) => {
  act(() => {
    result.current.dispatch({ type: 'SET_CART', payload: items as any });
  });
};

describe('useNuevaVenta totals (cargo tarjeta / propina)', () => {
  beforeEach(() => {
    configValues.clear();
    configValues.set('propina_venta', '10');
    configValues.set('impuesto_propina', '10');
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (url === '/cashregister/status') {
        return { success: true, data: { hasOpenCaja: true } };
      }
      return { success: true, data: [] };
    });
  });

  it('sin productos todos los conceptos son 0', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    expect(result.current.totals).toEqual({
      subtotal: 0,
      tip: 0,
      cargoTarjeta: 0,
      total: 0
    });
  });

  it('con tarjeta suma el cargo por tarjeta al total sin mezclarlo con la propina', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    setCart(result, [{ id: 'p1', precio: 10000, quantity: 1 }]);
    setMetodoPago(result, 'tarjeta');

    expect(result.current.totals).toEqual({
      subtotal: 10000,
      tip: 0,
      cargoTarjeta: 1000,
      total: 11000
    });
  });

  it('con efectivo no aplica cargo por tarjeta', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    setCart(result, [{ id: 'p1', precio: 10000, quantity: 1 }]);
    setMetodoPago(result, 'efectivo');

    expect(result.current.totals).toEqual({
      subtotal: 10000,
      tip: 0,
      cargoTarjeta: 0,
      total: 10000
    });
  });

  it('con tarjeta y propina activa los tres conceptos van separados y el total cuadra', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    setCart(result, [{ id: 'p1', precio: 10000, quantity: 1 }]);
    setMetodoPago(result, 'tarjeta');
    setEnableTip(result, true);

    expect(result.current.totals).toEqual({
      subtotal: 10000,
      tip: 1000,
      cargoTarjeta: 1000,
      total: 12000
    });
  });

  it('el cargo usa impuesto_propina y la propina usa propina_venta (no se mezclan)', async () => {
    configValues.set('propina_venta', '8');
    configValues.set('impuesto_propina', '5');
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    setCart(result, [{ id: 'p1', precio: 20000, quantity: 1 }]);
    setMetodoPago(result, 'tarjeta');
    setEnableTip(result, true);

    expect(result.current.totals.tip).toBe(1600); // 8% de 20000
    expect(result.current.totals.cargoTarjeta).toBe(1000); // 5% de 20000
    expect(result.current.totals.total).toBe(22600); // 20000 + 1600 + 1000
  });

  it('el payload de la venta envía solo la propina al reparto y el total incluye el cargo', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    setCart(result, [{ id: 'p1', precio: 10000, quantity: 1 }]);
    setMetodoPago(result, 'tarjeta');
    setEnableTip(result, true);

    vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: { id: 'v1' } });

    await act(async () => {
      await result.current.handleSubmit();
    });

    const postCall = vi.mocked(apiClientSafe).mock.calls.find(
      (call: any) => call[0] === '/sales' && call[1]?.method === 'POST'
    );
    expect(postCall).toBeTruthy();

    const payload = JSON.parse((postCall as any)[1].body);
    expect(payload.sub_total).toBe(10000);
    expect(payload.propina).toBe(1000); // solo la propina de venta se reparte
    expect(payload.total).toBe(12000); // subtotal + propina + cargo tarjeta
    expect(payload.metodo_pago).toBe('tarjeta');
  });
});
