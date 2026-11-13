import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClientSafe } from '@/api/client';
import { useSolicitudesCheckout } from '@/hooks/solicitudes/useSolicitudesCheckout';
import type { PedidoItem } from '@/hooks/types/solicitudesTypes';
import type { PedidoDetalle } from '@/hooks/utils/solicitudesPayload';
import type { ApiRes } from '@/types/api';

vi.mock('@/utils/offlineGuard', () => ({ blockOffline: () => true }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const pedido = (id: string): PedidoItem => ({
  id_pedido: id,
  id_unificado: id,
  fecha_orden: 0,
  codigo: id,
  tipoItem: 'pedido',
});
const detalle = (id: string): PedidoDetalle[] => [
  { producto_id: id, cantidad: 1, precio: 100 },
];
const params = {
  cajaAbierta: true,
  propinaPct: 10,
  fetchSolicitudes: vi.fn(async () => {}),
  removeSolicitudLocally: vi.fn(),
  showToast: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClientSafe).mockReset();
});
afterEach(cleanup);

describe('useSolicitudesCheckout: detalle vigente', () => {
  it.each(['success', 'failure', 'rejection'])(
    'ignora A tardío (%s) después de cargar B',
    async (outcome) => {
      const a = deferred<ApiRes<PedidoDetalle[]>>();
      const b = deferred<ApiRes<PedidoDetalle[]>>();
      vi.mocked(apiClientSafe)
        .mockReturnValueOnce(a.promise)
        .mockReturnValueOnce(b.promise);
      const { result } = renderHook(() => useSolicitudesCheckout(params));
      let loadA!: Promise<void>;
      let loadB!: Promise<void>;
      act(() => {
        loadA = result.current.openPedidoCheckout(pedido('A'), 'A');
      });
      const signalA = vi.mocked(apiClientSafe).mock.calls[0][1]?.signal;
      act(() => {
        loadB = result.current.openPedidoCheckout(pedido('B'), 'B');
      });
      expect(signalA?.aborted).toBe(true);
      await act(async () => {
        b.resolve({ success: true, data: detalle('B') });
        await loadB;
      });
      await act(async () => {
        if (outcome === 'rejection') a.reject(new Error('A falló'));
        else a.resolve({ success: outcome === 'success', data: detalle('A') });
        await loadA;
      });
      expect(result.current.selectedPedido?.id_pedido).toBe('B');
      expect(result.current.pedidoDetails).toEqual(detalle('B'));
      expect(result.current.checkoutModalVisible).toBe(true);
      expect(result.current.loadingDetails).toBe(false);
      expect(params.showToast).not.toHaveBeenCalled();
    },
  );

  it('A no apaga loading mientras B sigue pendiente', async () => {
    const a = deferred<ApiRes<PedidoDetalle[]>>();
    const b = deferred<ApiRes<PedidoDetalle[]>>();
    vi.mocked(apiClientSafe)
      .mockReturnValueOnce(a.promise)
      .mockReturnValueOnce(b.promise);
    const { result } = renderHook(() => useSolicitudesCheckout(params));
    let loadA!: Promise<void>;
    let loadB!: Promise<void>;
    act(() => {
      loadA = result.current.openPedidoCheckout(pedido('A'), 'A');
      loadB = result.current.openPedidoCheckout(pedido('B'), 'B');
    });
    await act(async () => {
      a.resolve({ success: false, data: [] });
      await loadA;
    });
    expect(result.current.loadingDetails).toBe(true);
    expect(result.current.checkoutModalVisible).toBe(true);
    await act(async () => {
      b.resolve({ success: true, data: detalle('B') });
      await loadB;
    });
  });

  it('limpia detalle, cliente, pago y propina al abrir otro pedido', async () => {
    vi.mocked(apiClientSafe)
      .mockResolvedValueOnce({
        success: true,
        data: [{ ...detalle('A')[0], cliente_id: 'CA', propina: 10 }],
      })
      .mockResolvedValueOnce({
        success: true,
        data: { id: 'CA', name: 'Cliente A', saldo: 100 },
      });
    const { result } = renderHook(() => useSolicitudesCheckout(params));
    await act(async () => {
      await result.current.openPedidoCheckout(pedido('A'), 'A');
    });
    expect(result.current.selectedClient).not.toBeNull();
    expect(result.current.metodoPago).toBe('prepago');
    const b = deferred<ApiRes<PedidoDetalle[]>>();
    vi.mocked(apiClientSafe).mockReturnValueOnce(b.promise);
    let loadB!: Promise<void>;
    act(() => {
      loadB = result.current.openPedidoCheckout(pedido('B'), 'B');
    });
    expect(result.current.pedidoDetails).toEqual([]);
    expect(result.current.selectedClient).toBeNull();
    expect(result.current.metodoPago).toBe('');
    expect(result.current.agregarPropina).toBe(false);
    await act(async () => {
      b.resolve({ success: true, data: detalle('B') });
      await loadB;
    });
  });

  it('el cliente tardío de A no modifica cliente, pago ni propina de B', async () => {
    const clientA = deferred<ApiRes<unknown>>();
    vi.mocked(apiClientSafe)
      .mockResolvedValueOnce({
        success: true,
        data: [{ ...detalle('A')[0], cliente_id: 'CA', propina: 10 }],
      })
      .mockReturnValueOnce(clientA.promise);
    const { result } = renderHook(() => useSolicitudesCheckout(params));
    let loadA!: Promise<void>;
    await act(async () => {
      loadA = result.current.openPedidoCheckout(pedido('A'), 'A');
    });
    expect(apiClientSafe).toHaveBeenCalledTimes(2);
    const clientSignal = vi.mocked(apiClientSafe).mock.calls[1][1]?.signal;
    vi.mocked(apiClientSafe)
      .mockResolvedValueOnce({
        success: true,
        data: [{ ...detalle('B')[0], cliente_id: 'CB' }],
      })
      .mockResolvedValueOnce({
        success: true,
        data: { id: 'CB', name: 'Cliente B', saldo: 0 },
      });
    await act(async () => {
      await result.current.openPedidoCheckout(pedido('B'), 'B');
    });
    expect(clientSignal?.aborted).toBe(true);
    await act(async () => {
      clientA.resolve({
        success: true,
        data: { id: 'CA', name: 'Cliente A', saldo: 100 },
      });
      await loadA;
    });
    expect(result.current.selectedClient?.name).toBe('Cliente B');
    expect(result.current.metodoPago).toBe('');
    expect(result.current.agregarPropina).toBe(false);
    expect(result.current.pedidoDetails).toEqual([
      { ...detalle('B')[0], cliente_id: 'CB' },
    ]);
  });

  it.each(['close', 'hide', 'unmount'])(
    'cancela la carga al %s e ignora su respuesta',
    async (action) => {
      const response = deferred<ApiRes<PedidoDetalle[]>>();
      vi.mocked(apiClientSafe).mockReturnValueOnce(response.promise);
      const { result, unmount } = renderHook(() =>
        useSolicitudesCheckout(params),
      );
      let loading!: Promise<void>;
      act(() => {
        loading = result.current.openPedidoCheckout(pedido('A'), 'A');
      });
      const signal = vi.mocked(apiClientSafe).mock.calls[0][1]?.signal;
      act(() => {
        if (action === 'close') result.current.closeCheckout();
        else if (action === 'hide')
          result.current.setCheckoutModalVisible(false);
        else unmount();
      });
      expect(signal?.aborted).toBe(true);
      await act(async () => {
        response.resolve({ success: false, data: [] });
        await loading;
      });
      expect(params.showToast).not.toHaveBeenCalled();
      if (action !== 'unmount') {
        expect(result.current.pedidoDetails).toEqual([]);
        expect(result.current.selectedPedido).toBeNull();
        expect(result.current.loadingDetails).toBe(false);
      }
    },
  );
});
