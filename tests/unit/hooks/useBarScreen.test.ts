import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup, waitFor } from '@testing-library/react';
import { useBarScreen } from '@/hooks/useBarScreen';
import { barService } from '@/services/bar';
import {
  emitRefreshBar,
  emitResourceUpdatedEvents,
  REALTIME_EVENT_NAMES,
} from '@/utils/realtime';
import { eventBus } from '@/utils/eventBus';
import type { BarStockItem } from '@/hooks/useBarScreen';

vi.mock('@/services/bar', () => ({
  barService: {
    stock: vi.fn(),
    movements: vi.fn(),
    transfers: vi.fn(),
    pendingTransfers: vi.fn(),
    acceptTransfer: vi.fn(),
    rejectTransfer: vi.fn(),
    containers: vi.fn(),
    returnContainer: vi.fn(),
  },
}));

/**
 * Cadena `bar_shot_alert` (SSE del dashboard) → NotificationContext →
 * emitRefreshBar → useBarScreen. Aquí se cubre el último eslabón: la pantalla
 * Bar reacciona al evento y deja de escuchar al desmontar.
 */
afterEach(cleanup);

describe('useBarScreen — refresh en vivo por bar_shot_alert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(barService.stock).mockResolvedValue({
      success: true,
      data: [],
    } as never);
    vi.mocked(barService.pendingTransfers).mockResolvedValue({
      success: true,
      data: [],
    } as never);
    vi.mocked(barService.movements).mockResolvedValue({
      success: true,
      data: [],
    } as never);
    vi.mocked(barService.transfers).mockResolvedValue({
      success: true,
      data: { history: [] },
    });
  });

  it('refresca el stock cuando se emite refresh_bar', async () => {
    renderHook(() => useBarScreen());
    await waitFor(() => expect(barService.stock).toHaveBeenCalledTimes(1));

    act(() => {
      emitRefreshBar({ type: 'bar_shot_alert' });
    });

    await waitFor(() => expect(barService.stock).toHaveBeenCalledTimes(2));
  });

  it('refresca las transferencias pendientes cuando se crea un traspaso', async () => {
    renderHook(() => useBarScreen());
    await waitFor(() =>
      expect(barService.pendingTransfers).toHaveBeenCalledTimes(1),
    );

    act(() => {
      emitRefreshBar({
        type: 'transfers_updated',
        data: { action: 'created' },
      });
    });

    await waitFor(() =>
      expect(barService.pendingTransfers).toHaveBeenCalledTimes(2),
    );
  });

  it('products emite refresh_bar además de productos y categorías', () => {
    const payload = { type: 'resource_updated', data: { module: 'products' } };
    const listeners = [
      REALTIME_EVENT_NAMES.refreshProducts,
      REALTIME_EVENT_NAMES.refreshCategories,
      REALTIME_EVENT_NAMES.refreshBar,
    ].map((name) => {
      const listener = vi.fn();
      return { listener, subscription: eventBus.addListener(name, listener) };
    });
    try {
      emitResourceUpdatedEvents('PRODUCTS', payload);
      listeners.forEach(({ listener }) =>
        expect(listener).toHaveBeenCalledWith(payload),
      );
    } finally {
      listeners.forEach(({ subscription }) => subscription.remove());
    }
  });

  it('recarga precios y comisiones por products, sin conservar la respuesta anterior', async () => {
    const item: BarStockItem = {
      id: '1',
      producto_id: '1',
      producto_nombre: 'Bebida',
      nombre: 'Botella',
      codigo_barras: null,
      precio_venta: 100,
      comision: 10,
      stock: 1,
      stock_bar: 1,
    };
    vi.mocked(barService.stock).mockResolvedValueOnce({
      success: true,
      data: [item],
    });
    const { result } = renderHook(() => useBarScreen());
    await waitFor(() =>
      expect(result.current.stock[0]?.precio_venta).toBe(100),
    );
    const updated = { ...item, precio_venta: 250, comision: 25 };
    vi.mocked(barService.stock).mockResolvedValueOnce({
      success: true,
      data: [updated],
    });
    act(() =>
      emitResourceUpdatedEvents('products', {
        type: 'resource_updated',
        data: { module: 'products' },
      }),
    );
    await waitFor(() =>
      expect(result.current.stock[0]?.precio_venta).toBe(250),
    );
    expect(result.current.stock[0]?.comision).toBe(25);
    expect(barService.pendingTransfers).toHaveBeenCalledTimes(2);
    expect(barService.movements).toHaveBeenCalledTimes(1);
    expect(barService.transfers).toHaveBeenCalledTimes(1);
  });

  it('una carga inicial tardía no pisa los precios recargados por products', async () => {
    let finish!: (value: { success: boolean; data: BarStockItem[] }) => void;
    vi.mocked(barService.stock).mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const item: BarStockItem = {
      id: '1',
      producto_id: '1',
      producto_nombre: 'Bebida',
      nombre: 'Botella',
      codigo_barras: null,
      precio_venta: 250,
      comision: 25,
      stock: 1,
      stock_bar: 1,
    };
    const { result } = renderHook(() => useBarScreen());
    await waitFor(() => expect(barService.stock).toHaveBeenCalledTimes(1));
    vi.mocked(barService.stock).mockResolvedValueOnce({
      success: true,
      data: [item],
    });
    act(() =>
      emitResourceUpdatedEvents('products', { data: { module: 'products' } }),
    );
    await waitFor(() =>
      expect(result.current.allStock[0]?.precio_venta).toBe(250),
    );
    await act(async () => {
      finish({ success: true, data: [{ ...item, precio_venta: 100 }] });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stock[0]?.precio_venta).toBe(250);
  });

  it('aborta las consultas del evento al desmontar', async () => {
    const { unmount } = renderHook(() => useBarScreen());
    await waitFor(() => expect(barService.stock).toHaveBeenCalledTimes(1));
    act(() => emitRefreshBar({ type: 'bar_shot_alert' }));
    const signal = vi.mocked(barService.stock).mock.calls[1][0];
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('deja de escuchar refresh_bar al desmontar', async () => {
    const { unmount } = renderHook(() => useBarScreen());
    await waitFor(() => expect(barService.stock).toHaveBeenCalledTimes(1));

    unmount();
    act(() => {
      emitRefreshBar({ type: 'bar_shot_alert' });
    });

    // Sin oyentes: la emisión no vuelve a llamar al servicio.
    expect(barService.stock).toHaveBeenCalledTimes(1);
  });
});
