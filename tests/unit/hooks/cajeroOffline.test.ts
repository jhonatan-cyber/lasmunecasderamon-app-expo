import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClientSafe } from '@/api/client';
import { attachHttpDetails } from '@/api/errors';
import { setMirrorForTests } from '@/services/mirror';
import { createMirrorRepository } from '@/services/mirror/repository';
import { ensureMirrorSchema } from '@/services/mirror/schema';
import { setOutboxForTests } from '@/services/outbox';
import { createOutboxRepository } from '@/services/outbox/repository';
import { createOutboxService } from '@/services/outbox/service';
import { connectivity } from '@/services/connectivity';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';

const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/utils/toast-lazy', () => ({ showToast }));

import { useCuentasScreen } from '@/hooks/useCuentasScreen';
import { useCaja } from '@/hooks/useCaja';

const CUENTA = {
  id_cuenta: 'c1',
  codigo: 'CUENTA-1',
  cliente_id: 'cl1',
  cliente_nombre: 'Juan',
  cliente_apellido: 'Pérez',
  habitacion_id: 'h1',
  habitacion_nombre: 'VIP 1',
  estado: 1,
  sub_total: 10000,
  total: 10000,
  total_comision: 0,
  detalles: [
    {
      producto_id: 'p1',
      id: 'p1',
      precio: 10000,
      cantidad: 1,
      sub_total: 10000,
      comision: 0,
      hostess_id: null,
    },
  ],
  usuarios: [],
  pedido_id: null,
};

// Los cambios de conectividad se envuelven en `act`: el hook los lee con
// `useSyncExternalStore`, así que sin eso el re-render no llega antes de la
// aserción (detalle del arnés de tests, no del comportamiento de la app).
const goOffline = () =>
  act(() => {
    connectivity.handleNetworkState({ isConnected: false });
  });
const goOnline = () =>
  act(() => {
    connectivity.handleNetworkState({ isConnected: true, isInternetReachable: true });
  });

/**
 * El hook de caja habla por `cajaService` (que usa `@/api/client-safe`, no el
 * `apiClientSafe` mockeado global), así que su transporte se mockea aparte.
 */
const cajaServiceMock = vi.hoisted(() => ({
  status: vi.fn(),
  resumen: vi.fn(),
  stats: vi.fn(),
  open: vi.fn(),
  // Desde el teléfono no se cierra directo: se pide el cierre al administrador.
  solicitarCierre: vi.fn(),
  reenviarAvisoCierre: vi.fn(),
  retiros: vi.fn(),
}));

vi.mock('@/services', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services')>()),
  cajaService: cajaServiceMock,
}));

const cajaAbiertaResponse = {
  success: true,
  data: { hasOpenCaja: true, cajaInfo: { id_caja: 'caja1', fecha_apertura: '2026-09-28T20:00:00.000Z' } },
};

const responseFor = (url: string) => {
  if (String(url).startsWith('/cuentas?limit')) return { success: true, data: [CUENTA] };
  if (String(url).includes('tipo=resumen')) return { success: true, data: { total_por_cobrar: 10000 } };
  if (url === '/cashregister/status') {
    return { success: true, data: { hasOpenCaja: true, cajaInfo: { id_caja: 'caja1' } } };
  }
  if (String(url).startsWith('/cashregister')) {
    return {
      success: true,
      data: {
        hasOpenCaja: true,
        cajaInfo: { id_caja: 'caja1' },
        stats: { balance_total: 50000, total_ventas: 30000 },
      },
    };
  }
  return { success: true, data: [] };
};

describe('useCuentasScreen · modo offline', () => {
  let driver: MirrorDriver;

  beforeEach(() => {
    driver = createDriver();
    ensureMirrorSchema(driver, () => 1_700_000_000_000);
    setMirrorForTests(createMirrorRepository(driver));
    // La cola también corre sobre SQLite real: así se comprueba que la intención
    // queda guardada en el dispositivo y no sólo en memoria.
    setOutboxForTests(createOutboxService(createOutboxRepository(driver)));
    goOnline();
    showToast.mockReset();
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => responseFor(url) as never);
  });

  afterEach(() => {
    setOutboxForTests(null);
    setMirrorForTests(null);
    driver.close();
  });

  it('debe dejar las cuentas espejadas y mostrarlas sin red', async () => {
    const online = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(online.result.current.loading).toBe(false));
    expect(online.result.current.fromCache).toBe(false);
    expect(online.result.current.cuentas).toHaveLength(1);
    online.unmount();

    goOffline();
    vi.mocked(apiClientSafe).mockRejectedValue(new Error('Network request failed'));

    const { result } = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fromCache).toBe(true);
    expect(result.current.cuentas.map(c => c.codigo)).toEqual(['CUENTA-1']);
    expect(result.current.syncedAt).toBeGreaterThan(0);
    expect(result.current.isOffline).toBe(true);
  });

  it('sin red y sin nada guardado debe fallar en vez de mostrar una lista vacía', async () => {
    goOffline();
    vi.mocked(apiClientSafe).mockRejectedValue(new Error('Network request failed'));

    const { result } = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.cuentas).toEqual([]);
    expect(result.current.fromCache).toBe(false);
  });

  it('con red cobra por la misma cola: una sola ruta de código', async () => {
    const { result } = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    await act(async () => {
      result.current.handleCobrarCuenta(CUENTA as never);
    });

    vi.mocked(apiClientSafe).mockClear();

    await act(async () => {
      await result.current.handleConfirmarCobro();
    });

    // El cobro online no tiene camino aparte: se encola y se manda al toque.
    const urls = vi.mocked(apiClientSafe).mock.calls.map(c => String(c[0]));
    expect(urls).toContain('/cuentas/c1/cobrar-con-venta');
    expect(urls.some(u => u.includes('/cobrar') && !u.includes('cobrar-con-venta'))).toBe(false);
    expect(urls).not.toContain('/sales');

    const enSqlite = driver.getAll<{ status: string }>('SELECT status FROM outbox');
    expect(enSqlite).toHaveLength(1);
    expect(enSqlite[0].status).toBe('aplicada');

    expect(result.current.cobroModalVisible).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', text2: 'Cuenta cobrada correctamente' })
    );
  });

  it('debe encolar el cobro sin red y no hacer ningún request suelto', async () => {
    const { result } = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    await act(async () => {
      result.current.handleCobrarCuenta(CUENTA as never);
    });

    goOffline();
    vi.mocked(apiClientSafe).mockClear();

    await act(async () => {
      await result.current.handleConfirmarCobro();
    });

    // Ni el cobro ni la venta viajan como requests sueltos (los dos pasos ya
    // son uno solo en el servidor): van como UNA intención de la cola.
    const urls = vi.mocked(apiClientSafe).mock.calls.map(c => String(c[0]));
    expect(urls.some(u => u.includes('/cobrar'))).toBe(false);
    expect(urls).not.toContain('/sales');

    const enSqlite = driver.getAll<{ type: string; status: string }>(
      'SELECT type, status FROM outbox'
    );
    expect(enSqlite).toHaveLength(1);
    expect(enSqlite[0].type).toBe('account.checkout');
    expect(enSqlite[0].status).toBe('pendiente');

    // El modal se cierra y el cajero sabe que quedó guardado, no cobrado.
    expect(result.current.cobroModalVisible).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info', text1: 'Cobro guardado en el dispositivo' })
    );
  });

  it('no debe finalizar un temporizador ni pedir una anulación sin red', async () => {
    const { result } = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    goOffline();
    vi.mocked(apiClientSafe).mockClear();

    act(() => {
      result.current.handleFinalizarTemporizador(CUENTA as never);
    });
    act(() => {
      result.current.handleSolicitarAnulacion(CUENTA as never);
    });

    // La confirmación no se llega a abrir: el aviso reemplaza al modal muerto.
    expect(result.current.alertConfig.visible).toBe(false);
    expect(result.current.anulacionModalVisible).toBe(false);
    expect(vi.mocked(apiClientSafe).mock.calls).toHaveLength(0);
    expect(showToast).toHaveBeenCalledTimes(2);
  });

  it('debe abrir el detalle guardado de una cuenta sin red', async () => {
    const online = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(online.result.current.loading).toBe(false));

    // Se abre el detalle una vez con red para que quede espejado.
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) =>
      String(url).startsWith('/cuentas/c1') ? (CUENTA as never) : (responseFor(url) as never)
    );
    await act(async () => {
      await online.result.current.handleVerDetalles('c1');
    });
    expect(online.result.current.selectedCuenta?.codigo).toBe('CUENTA-1');
    online.unmount();

    goOffline();
    const { result } = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleVerDetalles('c1');
    });

    expect(result.current.selectedCuenta?.codigo).toBe('CUENTA-1');
    expect(result.current.modalVisible).toBe(true);
  });
});

describe('useCaja · modo offline', () => {
  let driver: MirrorDriver;

  beforeEach(() => {
    driver = createDriver();
    ensureMirrorSchema(driver, () => 1_700_000_000_000);
    setMirrorForTests(createMirrorRepository(driver));
    goOnline();
    showToast.mockReset();
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => responseFor(url) as never);
    cajaServiceMock.status.mockReset();
    cajaServiceMock.resumen.mockReset();
    cajaServiceMock.solicitarCierre.mockReset();
    cajaServiceMock.reenviarAvisoCierre.mockReset();
    cajaServiceMock.open.mockReset();
    cajaServiceMock.retiros.mockReset();
    cajaServiceMock.status.mockResolvedValue(cajaAbiertaResponse);
    cajaServiceMock.resumen.mockResolvedValue({
      success: true,
      data: { balance_total: 50000, total_ventas: 30000, cantidad_ventas: 4 },
    });
  });

  afterEach(() => {
    setMirrorForTests(null);
    driver.close();
  });

  it('debe seguir mostrando el estado de caja guardado cuando se corta la red', async () => {
    const online = renderHook(() => useCaja());
    await waitFor(() => expect(online.result.current.loading).toBe(false));
    expect(online.result.current.cajaAbierta).toBe(true);
    expect(online.result.current.fromCache).toBe(false);
    online.unmount();

    goOffline();
    cajaServiceMock.status.mockRejectedValue(new Error('Network request failed'));
    cajaServiceMock.resumen.mockRejectedValue(new Error('Network request failed'));

    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fromCache).toBe(true);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.cajaAbierta).toBe(true);
  });

  it('no debe cerrar la caja sin red y debe explicarlo', async () => {
    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    act(() => {
      result.current.dispatch({ type: 'OPEN_MODAL', payload: 'cerrar' });
    });

    goOffline();

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(cajaServiceMock.solicitarCierre).not.toHaveBeenCalled();
    expect(result.current.modalVisible).toBe(true);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text2: expect.stringContaining('cerrar la caja') })
    );
  });

  it('debe pedir el cierre y avisar que la caja sigue abierta hasta que el admin autorice', async () => {
    cajaServiceMock.solicitarCierre.mockResolvedValue({
      success: true,
      data: {
        estado: 'pendiente',
        token: 'token-1',
        monto_cierre_calculado: 38000,
        saldo_clientes_descontado: 12000,
        caja: { id_caja: 'caja1' },
      },
    });

    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    act(() => {
      result.current.dispatch({ type: 'OPEN_MODAL', payload: 'cerrar' });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(cajaServiceMock.solicitarCierre).toHaveBeenCalledWith({
      id_caja: 'caja1',
      motivo: 'Cierre de turno',
    });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', text2: expect.stringContaining('12.000') })
    );
    expect(result.current.modalVisible).toBe(false);
  });

  it('debe distinguir el cierre efectivo del administrador', async () => {
    cajaServiceMock.solicitarCierre.mockResolvedValue({
      success: true,
      data: {
        estado: 'cerrada',
        token: null,
        monto_cierre_calculado: 38000,
        saldo_clientes_descontado: 12000,
        caja: { id_caja: 'caja1' },
      },
    });

    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    act(() => {
      result.current.dispatch({ type: 'OPEN_MODAL', payload: 'cerrar' });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', text1: 'Turno Cerrado' })
    );
  });

  it('debe reenviar el aviso del cierre pendiente al administrador', async () => {
    cajaServiceMock.reenviarAvisoCierre.mockResolvedValue({
      success: true,
      data: { ultimo_aviso_en: '2026-09-28 16:35:00', esperar_segundos: 60 },
    });

    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    await act(async () => {
      await result.current.handleReenviarAviso();
    });

    expect(cajaServiceMock.reenviarAvisoCierre).toHaveBeenCalledWith({ id_caja: 'caja1' });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', text1: 'Aviso reenviado' })
    );
    expect(result.current.reenviandoAviso).toBe(false);
  });

  it('debe explicar el enfriamiento en vez de tratarlo como un error', async () => {
    cajaServiceMock.reenviarAvisoCierre.mockRejectedValue(
      attachHttpDetails(
        new Error('El aviso salió hace menos de un minuto. Podrás reenviarlo en 42 s.'),
        {
          status: 429,
          body: { message: 'El aviso salió hace menos de un minuto. Podrás reenviarlo en 42 s.' },
        }
      )
    );

    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    await act(async () => {
      await result.current.handleReenviarAviso();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        text1: 'Espera un momento',
        text2: expect.stringContaining('42 s'),
      })
    );
  });

  it('no debe reenviar el aviso sin red', async () => {
    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    goOffline();
    showToast.mockClear();

    await act(async () => {
      await result.current.handleReenviarAviso();
    });

    expect(cajaServiceMock.reenviarAvisoCierre).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text2: expect.stringContaining('servidor') })
    );
  });

  it('debe pedir el cierre de nuevo cuando el administrador no respondió', async () => {
    cajaServiceMock.solicitarCierre.mockResolvedValue({
      success: true,
      data: {
        estado: 'pendiente',
        token: 'token-2',
        monto_cierre_calculado: 38000,
        saldo_clientes_descontado: 12000,
        caja: { id_caja: 'caja1' },
      },
    });

    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    await act(async () => {
      await result.current.handleReabrirCierre();
    });

    // El segundo pedido es un cierre nuevo para el servidor: mismo endpoint, token nuevo.
    expect(cajaServiceMock.solicitarCierre).toHaveBeenCalledWith({
      id_caja: 'caja1',
      motivo: 'Segundo pedido de cierre',
    });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', text1: 'Cierre pedido de nuevo' })
    );
    expect(result.current.reabriendoCierre).toBe(false);
  });

  it('debe decir «todavía no» cuando el servidor frena el segundo pedido con 409', async () => {
    cajaServiceMock.solicitarCierre.mockRejectedValue(
      attachHttpDetails(
        new Error('Ya hay una solicitud de cierre de esta caja esperando autorización'),
        {
          status: 409,
          body: { message: 'Ya hay una solicitud de cierre de esta caja esperando autorización' },
        }
      )
    );

    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    await act(async () => {
      await result.current.handleReabrirCierre();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        text1: 'Todavía no',
        text2: expect.stringContaining('esperando autorización'),
      })
    );
  });

  it('no debe pedir el cierre de nuevo sin red', async () => {
    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    goOffline();
    showToast.mockClear();

    await act(async () => {
      await result.current.handleReabrirCierre();
    });

    expect(cajaServiceMock.solicitarCierre).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text2: expect.stringContaining('servidor') })
    );
  });

  it('no debe abrir la caja ni registrar retiros sin red', async () => {
    goOffline();
    const { result } = renderHook(() => useCaja());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.dispatch({ type: 'OPEN_MODAL', payload: 'abrir' });
      result.current.dispatch({ type: 'SET_MONTO', payload: '10.000' });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    act(() => {
      result.current.dispatch({ type: 'OPEN_MODAL', payload: 'retiro' });
      result.current.dispatch({ type: 'SET_MONTO', payload: '5.000' });
      result.current.dispatch({ type: 'SET_MOTIVO', payload: 'pago a proveedor' });
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(cajaServiceMock.open).not.toHaveBeenCalled();
    expect(cajaServiceMock.retiros).not.toHaveBeenCalled();
    // Un aviso por intento: la caja no se toca sin conexión.
    expect(showToast).toHaveBeenCalledTimes(2);
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────
// Los tests corren SQL real contra `node:sqlite` a travís del mismo driver de
// los tests del espejo, así que el esquema y las consultas se ejecutan de verdad.
type MirrorDriver = ReturnType<typeof createNodeSqliteMirrorDriver>;

const createDriver = (): MirrorDriver => createNodeSqliteMirrorDriver();
