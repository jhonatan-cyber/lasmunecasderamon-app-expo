import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNuevaVenta } from '@/hooks/useNuevaVenta';
import { apiClientSafe } from '@/api/client';
import { emitRefreshCategories } from '@/utils/realtime';

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

describe('useNuevaVenta totals (propina / total)', () => {
  beforeEach(() => {
    configValues.clear();
    configValues.set('propina_venta', '10');
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
      total: 0
    });
  });

  it('sin propina el total es el subtotal (con cualquier método de pago)', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    setCart(result, [{ id: 'p1', precio: 10000, quantity: 1 }]);
    setMetodoPago(result, 'tarjeta');

    expect(result.current.totals).toEqual({
      subtotal: 10000,
      tip: 0,
      total: 10000
    });
  });

  it('con efectivo y propina activa el total es subtotal + propina', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    setCart(result, [{ id: 'p1', precio: 10000, quantity: 1 }]);
    setMetodoPago(result, 'efectivo');
    setEnableTip(result, true);

    expect(result.current.totals).toEqual({
      subtotal: 10000,
      tip: 1000,
      total: 11000
    });
  });

  it('la propina usa el porcentaje configurado de propina_venta', async () => {
    configValues.set('propina_venta', '8');
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    setCart(result, [{ id: 'p1', precio: 20000, quantity: 1 }]);
    setEnableTip(result, true);

    expect(result.current.totals.tip).toBe(1600); // 8% de 20000
    expect(result.current.totals.total).toBe(21600); // 20000 + 1600
  });

  it('el payload de la venta envía la propina (reparto) y el total sin cargo extra', async () => {
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
    expect(payload.total).toBe(11000); // subtotal + propina
    expect(payload.metodo_pago).toBe('tarjeta');
    expect(payload.cargo_tarjeta).toBeUndefined(); // el cargo por tarjeta ya no existe
  });
});

describe('useNuevaVenta — refresh del catálogo por SSE (categories_updated)', () => {
  beforeEach(() => {
    configValues.clear();
    vi.clearAllMocks();
  });

  it('refresca solo la lista de categorías y no toca el carrito', async () => {
    let categoriasLlamada = 0;
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (url === '/cashregister/status') {
        return { success: true, data: { hasOpenCaja: true } };
      }
      if (url === '/categories') {
        categoriasLlamada++;
        return { success: true, data: [{ id: `c${categoriasLlamada}`, name: `Cat ${categoriasLlamada}` }] };
      }
      return { success: true, data: [] };
    });

    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.categories).toHaveLength(1));
    expect(result.current.state.categories[0].id).toBe('c1');

    setCart(result, [{ id: 'p1', precio: 10000, quantity: 1 }]);

    // NotificationContext convierte categories_updated en este evento de bus.
    act(() => {
      emitRefreshCategories({ type: 'categories_updated' });
    });

    await waitFor(() => expect(result.current.state.categories[0].id).toBe('c2'));
    // El carrito y la selección sobreviven al refresco del catálogo.
    expect(result.current.state.cart).toHaveLength(1);
  });
});
