import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCuentasScreen } from '@/hooks/useCuentasScreen';
import { apiClientSafe } from '@/api/client';

/**
 * Check de caja cerrada en el cobro de cuentas (paridad con dashboard y
 * nueva venta): el cobro registra una venta y escribe en caja, así que
 * `cajaAbierta === false` deshabilita el botón del modal, muestra el banner
 * y el guard de `handleConfirmarCobro` bloquea el POST.
 *
 * El estado llega por dos vías: el fetch inicial (`fetchCuentas` incluye
 * `/cashregister/status` en su Promise.all) y la revalidación al abrir el
 * modal (`handleCobrarCuenta`).
 */
describe('useCuentasScreen — check de caja para el cobro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCuenta = {
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
      { producto_id: 'p1', id: 'p1', precio: 10000, cantidad: 1, sub_total: 10000, comision: 0, hostess_id: null },
    ],
    usuarios: [],
    pedido_id: null,
  };

  const mockCuentas = { success: true, data: [mockCuenta] };
  const mockResumen = { success: true, data: { total_por_cobrar: 10000 } };

  const mockCajaCerrada = { success: true, data: { hasOpenCaja: false, cajaInfo: null } };
  const mockCajaAbierta = { success: true, data: { hasOpenCaja: true, cajaInfo: { id_caja: 'caja1' } } };

  it('con caja cerrada, el guard bloquea handleConfirmarCobro sin POST a /sales ni /cobrar', async () => {
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (String(url).startsWith('/cuentas?limit')) return mockCuentas;
      if (String(url).includes('tipo=resumen')) return mockResumen;
      if (url === '/cashregister/status') return mockCajaCerrada;
      return { success: true, data: [] };
    });

    const { result } = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(false));

    // Abre el modal de cobro (dispara además la revalidación de caja).
    await act(async () => {
      result.current.handleCobrarCuenta(mockCuenta as any);
    });
    expect(result.current.cobroModalVisible).toBe(true);

    // Intento de cobro: el guard corta antes de cualquier escritura.
    await act(async () => {
      await result.current.handleConfirmarCobro();
    });

    const urlsLlamadas = vi.mocked(apiClientSafe).mock.calls.map((c) => c[0]);
    expect(urlsLlamadas.some((u) => String(u).startsWith('/cuentas/c1/cobrar'))).toBe(false);
    expect(urlsLlamadas.some((u) => String(u) === '/sales')).toBe(false);
    expect(result.current.cobroModalVisible).toBe(true); // el modal sigue abierto
  });

  it('revalida el estado de caja al abrir el modal de cobro', async () => {
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (String(url).startsWith('/cuentas?limit')) return mockCuentas;
      if (String(url).includes('tipo=resumen')) return mockResumen;
      if (url === '/cashregister/status') return mockCajaAbierta;
      return { success: true, data: [] };
    });

    const { result } = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

    const llamadasAntes = vi
      .mocked(apiClientSafe)
      .mock.calls.filter((c) => c[0] === '/cashregister/status').length;
    expect(llamadasAntes).toBeGreaterThanOrEqual(1);

    await act(async () => {
      result.current.handleCobrarCuenta(mockCuenta as any);
    });

    const llamadasDespues = vi
      .mocked(apiClientSafe)
      .mock.calls.filter((c) => c[0] === '/cashregister/status').length;
    // La revalidación al abrir el modal añade exactamente una consulta más.
    expect(llamadasDespues).toBe(llamadasAntes + 1);
    expect(result.current.cobroModalVisible).toBe(true);
  });

  it('una respuesta de caja fallida no pisa el último estado conocido', async () => {
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (String(url).startsWith('/cuentas?limit')) return mockCuentas;
      if (String(url).includes('tipo=resumen')) return mockResumen;
      if (url === '/cashregister/status') return mockCajaCerrada;
      return { success: true, data: [] };
    });

    const { result } = renderHook(() => useCuentasScreen());
    await waitFor(() => expect(result.current.cajaAbierta).toBe(false));

    // La revalidación falla: debe conservarse `false`, no convertirse en null.
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (url === '/cashregister/status') throw new Error('network down');
      if (String(url).startsWith('/cuentas?limit')) return mockCuentas;
      if (String(url).includes('tipo=resumen')) return mockResumen;
      return { success: true, data: [] };
    });

    await act(async () => {
      result.current.handleCobrarCuenta(mockCuenta as any);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.cajaAbierta).toBe(false);
  });
});
