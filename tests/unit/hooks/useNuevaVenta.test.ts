import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

// Los toasts reales se capturan para poder afirmar QUÉ se avisa (paridad con
// el banner de caja cerrada del dashboard: ya no se usa el toast efímero).
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/utils/toast-lazy', () => ({ showToast: toastSpy }));

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
        return {
          success: true,
          data: [
            {
              id: `c${categoriasLlamada}`,
              name: `Cat ${categoriasLlamada}`,
              status: 1,
              total_products: 3,
            },
          ],
        };
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

describe('useNuevaVenta — catálogo de venta (paridad con el dashboard)', () => {
  beforeEach(() => {
    configValues.clear();
    configValues.set('propina_venta', '10');
    vi.clearAllMocks();
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (url === '/cashregister/status') {
        return { success: true, data: { hasOpenCaja: true } };
      }
      if (url === '/categories') {
        return {
          success: true,
          data: [
            { id: 'c1', name: 'Cerveza', status: 1, total_products: 2 },
            { id: 'c2', name: 'Tequila vacía', status: 1, total_products: 0 },
            { id: 'c3', name: 'Deshabilitada', status: 0, total_products: 5 },
          ],
        };
      }
      return { success: true, data: [] };
    });
  });

  it('solo muestra categorías activas con productos (estado === 1 && total_products > 0)', async () => {
    const { result } = renderSaleHook();

    await waitFor(() => expect(result.current.state.categories).toHaveLength(1));
    expect(result.current.state.categories[0].id).toBe('c1');
  });

  it('el payload envía producto_id, presentacion_id y tipo_venta botella', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    setCart(result, [
      {
        id: 'pres-1',
        presentacion_id: 'pres-1',
        producto_id: 'prod-1',
        id_producto: 'prod-1',
        nombre: 'Paceña 330 ml',
        precio: 5000,
        comision: 0,
        quantity: 2,
        anfitrionas: [],
      },
    ]);
    setMetodoPago(result, 'efectivo');

    vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: { id: 'v1' } } as any);

    await act(async () => {
      await result.current.handleSubmit();
    });

    const postCall = vi.mocked(apiClientSafe).mock.calls.find(
      (call: any) => call[0] === '/sales' && call[1]?.method === 'POST'
    );
    expect(postCall).toBeTruthy();

    const payload = JSON.parse((postCall as any)[1].body);
    expect(payload.detalles[0].producto_id).toBe('prod-1');
    expect(payload.detalles[0].presentacion_id).toBe('pres-1');
    expect(payload.detalles[0].tipo_venta).toBe('botella');
    expect(payload.detalles[0].precio).toBe(5000);
    expect(payload.detalles[0].sub_total).toBe(10000);
  });
});

describe('useNuevaVenta — búsqueda de productos con debounce (NewSaleSearch)', () => {
  const termCalls = () =>
    vi
      .mocked(apiClientSafe)
      .mock.calls.filter((call: any) => String(call[0]).includes('&term='));

  beforeEach(() => {
    configValues.clear();
    configValues.set('propina_venta', '10');
    vi.clearAllMocks();
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (url === '/cashregister/status') {
        return { success: true, data: { hasOpenCaja: true } };
      }
      if (String(url).startsWith('/products?for_sale=1&term=')) {
        return {
          success: true,
          data: [
            {
              presentacion_id: 'p355',
              presentacion_nombre: '355 ml',
              producto_id: 'prodcorona',
              producto_nombre: 'Corona',
              categoria_nombre: 'Cerveza',
              precio_venta: 7000,
              comision: 0,
              stock_bar: 5,
            },
          ],
        };
      }
      return { success: true, data: [] };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('espera 300 ms (debounce), pide for_sale=1&term= y mapea los resultados', async () => {
    const { result } = renderSaleHook();
    // La carga inicial (con el espejo del modo offline) se espera con reloj
    // real; los relojes falsos son solo para el debounce de la búsqueda.
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));

    vi.useFakeTimers();

    // Dos cambios seguidos: solo dispara una petición con el último término.
    act(() => {
      result.current.setSearchProducto('p');
    });
    expect(result.current.searchLoading).toBe(true);
    act(() => {
      result.current.setSearchProducto('pace');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(termCalls()).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(termCalls()).toHaveLength(1);
    expect(termCalls()[0][0]).toBe('/products?for_sale=1&term=pace');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.searchLoading).toBe(false);
    expect(result.current.searchResults).toHaveLength(1);
    // Mismo mapeo que mapForSaleToCartItem del dashboard.
    expect(result.current.searchResults[0]).toMatchObject({
      id: 'p355',
      presentacion_id: 'p355',
      producto_id: 'prodcorona',
      nombre: 'Corona 355 ml',
      precio: 7000,
      comision: 0,
      stock_bar: 5,
      tipo_venta: 'botella',
    });
  });

  it('handleClearSearch limpia texto, resultados y loading sin nueva petición', async () => {
    vi.useFakeTimers();
    const { result } = renderSaleHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    act(() => {
      result.current.setSearchProducto('pace');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(310);
    });
    expect(result.current.searchResults).toHaveLength(1);

    act(() => {
      result.current.handleClearSearch();
    });
    expect(result.current.searchProducto).toBe('');
    expect(result.current.searchResults).toHaveLength(0);
    expect(result.current.searchLoading).toBe(false);

    // Sin texto no se pide nada más.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(termCalls()).toHaveLength(1);
  });

  it('handleSearchNow (botón «Buscar») salta el debounce', async () => {
    vi.useFakeTimers();
    const { result } = renderSaleHook();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    act(() => {
      result.current.setSearchProducto('pace');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(termCalls()).toHaveLength(0);

    act(() => {
      result.current.handleSearchNow();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(termCalls()).toHaveLength(1);
    expect(result.current.searchResults).toHaveLength(1);

    // El timer pendiente quedó cancelado: no llega una segunda petición.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(termCalls()).toHaveLength(1);
  });
});

describe('useNuevaVenta — check de caja cerrada (banner, paridad con el dashboard)', () => {
  beforeEach(() => {
    configValues.clear();
    vi.clearAllMocks();
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (url === '/cashregister/status') {
        return { success: true, data: { hasOpenCaja: false } };
      }
      if (url === '/categories') {
        return {
          success: true,
          data: [{ id: 'c1', name: 'Cerveza', status: 1, total_products: 2 }],
        };
      }
      return { success: true, data: [] };
    });
  });

  it('expone cajaAbierta=false, ya no toastia «Caja Cerrada» y bloquea el envío', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(false));

    // El banner «No hay caja abierta.» se alimenta de este estado; el toast
    // efímero de antes quedó reemplazado.
    expect(
      toastSpy.mock.calls.some((call: any) => call[0]?.text1 === 'Caja Cerrada')
    ).toBe(false);

    setCart(result, [{ id: 'p1', precio: 10000, quantity: 1 }]);
    await act(async () => {
      await result.current.handleSubmit();
    });

    const postCall = vi.mocked(apiClientSafe).mock.calls.find(
      (call: any) => call[0] === '/sales' && call[1]?.method === 'POST'
    );
    expect(postCall).toBeUndefined(); // sin caja abierta no se puede vender
  });
});

describe('useNuevaVenta — refresh de caja al volver de la pantalla de Caja', () => {
  let openCaja = true;

  beforeEach(() => {
    configValues.clear();
    vi.clearAllMocks();
    openCaja = true;
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (url === '/cashregister/status') {
        return { success: true, data: { hasOpenCaja: openCaja } };
      }
      if (url === '/categories') {
        return {
          success: true,
          data: [{ id: 'c1', name: 'Cerveza', status: 1, total_products: 2 }],
        };
      }
      return { success: true, data: [] };
    });
  });

  it('refreshCajaStatus pide solo /cashregister/status y no toca catálogo ni carrito', async () => {
    const { result } = renderSaleHook();
    await waitFor(() => expect(result.current.state.cajaAbierta).toBe(true));
    setCart(result, [{ id: 'p1', precio: 10000, quantity: 1 }]);
    const categoriesBefore = result.current.state.categories;
    const callsBefore = vi.mocked(apiClientSafe).mock.calls.length;

    // El usuario cambia el estado en la pantalla de Caja y vuelve.
    openCaja = false;
    await act(async () => {
      await result.current.refreshCajaStatus();
    });

    const newCalls = vi.mocked(apiClientSafe).mock.calls.slice(callsBefore);
    expect(newCalls.map((call) => call[0])).toEqual(['/cashregister/status']);
    expect(result.current.state.cajaAbierta).toBe(false);
    expect(result.current.state.cart).toHaveLength(1); // carrito intacto
    // Misma referencia: el reducer solo mezcló `cajaAbierta`.
    expect(result.current.state.categories).toBe(categoriesBefore);
  });
});
