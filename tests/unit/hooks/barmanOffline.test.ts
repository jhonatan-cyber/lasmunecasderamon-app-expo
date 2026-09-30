import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBarScreen } from '@/hooks/useBarScreen';
import { useEnvasesScreen, type EnvaseDevolucion } from '@/hooks/useEnvasesScreen';
import { barService } from '@/services/bar';
import { connectivity } from '@/services/connectivity';
import { setMirrorForTests } from '@/services/mirror';
import { createMirrorRepository } from '@/services/mirror/repository';
import { ensureMirrorSchema } from '@/services/mirror/schema';
import { OFFLINE_BLOCKED_ACTIONS } from '@/utils/offlineGuard';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';

const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/utils/toast-lazy', () => ({ showToast }));

vi.mock('@/services/bar', () => ({
  barService: {
    stock: vi.fn(),
    movements: vi.fn(),
    pendingTransfers: vi.fn(),
    acceptTransfer: vi.fn(),
    rejectTransfer: vi.fn(),
    containers: vi.fn(),
    returnContainer: vi.fn(),
  },
}));

const STOCK_ITEM = {
  id: 'u1',
  producto_id: 'p1',
  producto_nombre: 'Ron Santa Lucía',
  nombre: 'Ron Santa Lucía 750ml',
  codigo_barras: '7801234567890',
  precio_venta: 25000,
  comision: 0,
  stock: 6,
  stock_bar: 4,
};

const TRANSFER = {
  id: 't1',
  estado: 'pendiente',
  producto_nombre: 'Vino Blanco',
  presentacion_nombre: 'Botella 750ml',
  cantidad: 6,
  fecha_crea: '2026-09-28 10:00:00',
  usuario_nombre: 'Almacén',
  precio_venta: 12000,
  comision: 0,
};

const DEVOLUCION = {
  id: 'u1',
  codigo: 'LM-000042',
  codigo_barras: '2912345678901',
  estado: 'vendida',
  fecha_devolucion: '2026-09-25 10:00:00',
  fecha_confirmacion: null,
  producto_nombre: 'Vino Blanco',
  presentacion_nombre: 'Botella 750ml',
  compra_folio: 'F-001',
  usuario_nombre: 'Damo',
  usuario_apellido: null,
  usuario_nick: 'Damo',
  confirmado_nombre: null,
  confirmado_apellido: null,
  confirmado_nick: null,
  pendiente_confirmacion: true,
} as EnvaseDevolucion;

const goOnline = () =>
  act(() => {
    connectivity.handleNetworkState({ isConnected: true, isInternetReachable: true });
  });

const goOffline = () =>
  act(() => {
    connectivity.handleNetworkState({ isConnected: false });
  });

let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;

beforeEach(() => {
  vi.clearAllMocks();
  driver = createNodeSqliteMirrorDriver();
  ensureMirrorSchema(driver, () => 1_700_000_000_000);
  setMirrorForTests(createMirrorRepository(driver));
  connectivity.handleNetworkState({});
  showToast.mockClear();
});

afterEach(() => {
  setMirrorForTests(null);
  driver.close();
  connectivity.handleNetworkState({});
});

describe('useBarScreen — sin red', () => {
  it('sirve el stock y las transferencias guardados cuando se corta la conexión', async () => {
    vi.mocked(barService.stock).mockResolvedValue({ success: true, data: [STOCK_ITEM] } as never);
    vi.mocked(barService.pendingTransfers).mockResolvedValue({
      success: true,
      data: [TRANSFER],
    } as never);
    vi.mocked(barService.movements).mockResolvedValue({ success: true, data: [] } as never);

    goOnline();
    const { result } = renderHook(() => useBarScreen());
    await waitFor(() => expect(result.current.allStock).toHaveLength(1));

    goOffline();
    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.allStock).toHaveLength(1);
    expect(result.current.transfers).toHaveLength(1);
    expect(result.current.error).toBeNull();
    // La refrescada no volvió a tocar la red: el espejo ya tenía el turno.
    expect(barService.stock).toHaveBeenCalledTimes(1);
    expect(barService.pendingTransfers).toHaveBeenCalledTimes(1);
    expect(barService.movements).not.toHaveBeenCalled();
  });

  it('sin red y sin nada guardado avisa en vez de mostrar una lista vacía', async () => {
    goOffline();

    const { result } = renderHook(() => useBarScreen());

    await waitFor(() =>
      expect(result.current.error).toBe('Sin conexión y sin datos guardados para esta sección.')
    );
    expect(result.current.allStock).toHaveLength(0);
    expect(barService.stock).not.toHaveBeenCalled();
    expect(barService.pendingTransfers).not.toHaveBeenCalled();
  });

  it('sin red no acepta ni rechaza una transferencia', async () => {
    goOffline();

    const { result } = renderHook(() => useBarScreen());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    await act(async () => {
      await result.current.resolver('t1', 'aprobar');
    });

    expect(barService.acceptTransfer).not.toHaveBeenCalled();
    expect(barService.rejectTransfer).not.toHaveBeenCalled();
    expect(result.current.resolvingId).toBeNull();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text2: OFFLINE_BLOCKED_ACTIONS.transferencia.message,
      })
    );
  });

  it('con red confirmada sí resuelve la transferencia', async () => {
    vi.mocked(barService.stock).mockResolvedValue({ success: true, data: [] } as never);
    vi.mocked(barService.pendingTransfers).mockResolvedValue({ success: true, data: [] } as never);
    vi.mocked(barService.movements).mockResolvedValue({ success: true, data: [] } as never);
    vi.mocked(barService.acceptTransfer).mockResolvedValue({ success: true } as never);

    goOnline();
    const { result } = renderHook(() => useBarScreen());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.resolver('t1', 'aprobar');
    });

    expect(barService.acceptTransfer).toHaveBeenCalledWith('t1');
  });
});

describe('useEnvasesScreen — sin red', () => {
  it('sirve el historial de envases guardado cuando se corta la conexión', async () => {
    vi.mocked(barService.containers).mockResolvedValue({
      success: true,
      data: [DEVOLUCION],
    } as never);

    goOnline();
    const { result } = renderHook(() => useEnvasesScreen());
    await act(async () => {
      await result.current.fetchDevoluciones();
    });
    expect(result.current.devoluciones).toHaveLength(1);

    goOffline();
    await act(async () => {
      await result.current.fetchDevoluciones();
    });

    expect(result.current.devoluciones).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(barService.containers).toHaveBeenCalledTimes(1);
  });

  it('sin red el escaneo no se envía y explica por qué', async () => {
    goOffline();

    const { result } = renderHook(() => useEnvasesScreen());

    let veredicto: unknown = 'pendiente';
    await act(async () => {
      veredicto = await result.current.enviarEscaneo('LM-000042');
    });

    expect(veredicto).toBeNull();
    expect(barService.returnContainer).not.toHaveBeenCalled();
    expect(result.current.sesion).toHaveLength(0);
    expect(result.current.verificando).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text2: OFFLINE_BLOCKED_ACTIONS.envase.message,
      })
    );
  });
});
