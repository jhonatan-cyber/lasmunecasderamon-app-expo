import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { apiClientSafe } from '@/api/client';
import { useAsistencia } from '@/hooks/useAsistencia';
import { useAnticipos } from '@/hooks/useAnticipos';
import { useHorasExtras } from '@/hooks/useHorasExtras';
import { useFinancialEvents } from '@/hooks/useFinancialEvents';
import { usePropinasScreen } from '@/hooks/usePropinasScreen';
import { normalizeEmployeeRecords } from '@/utils/employeeRecords';
import { tipsService } from '@/services';
const state = vi.hoisted(() => ({ role: 'cajero' }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({ user: { id: 'u1', role: state.role } }),
}));
vi.mock('@/services', () => ({ tipsService: { userDetail: vi.fn() } }));
beforeEach(() => {
  state.role = 'cajero';
  vi.mocked(apiClientSafe).mockReset();
  vi.mocked(tipsService.userDetail).mockReset();
});
afterEach(cleanup);

it.each(['cajero', 'barman', 'garzon', 'anfitriona'])(
  'carga asistencias personales de %s y normaliza montos y estados',
  async (role) => {
    state.role = role;
    vi.mocked(apiClientSafe).mockImplementation(
      async (path: string) =>
        ({
          success: true,
          data:
            path === '/attendance/user'
              ? [{ descuento_total: '12000' }]
              : path.startsWith('/attendance/user?')
                ? [{ sueldo: '50000', aporte: '5000', estado: '1' }]
                : [],
        }) as any,
    );
    const { result } = renderHook(useAsistencia);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.asistencias[0]).toMatchObject({
      sueldo: 50000,
      aporte: 5000,
      estado: 1,
    });
    expect(result.current.error).toBe('');
    expect(apiClientSafe).toHaveBeenCalledWith(
      '/attendance/user?tipo=detalle',
      expect.anything(),
    );
  },
);

it('carga propinas propias para el garzón en lugar del listado general', async () => {
  vi.mocked(apiClientSafe).mockResolvedValue({
    success: true,
    data: [{ monto: '2000', estado: '1' }],
  } as any);
  const { result } = renderHook(() => useFinancialEvents('propinas'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(apiClientSafe).toHaveBeenCalledWith(
    '/tips/user?tipo=detalle',
    expect.anything(),
  );
  expect(result.current.data[0]).toMatchObject({ monto: 2000, estado: 1 });
});
it('conserva las comisiones de ventas y sus estados de anulación/pago', async () => {
  vi.mocked(apiClientSafe).mockResolvedValue({
    success: true,
    data: [
      { tipo: 'venta', comision: '2000', estado: '2' },
      { tipo: 'venta', comision: '1000', estado: '0' },
      { tipo: 'servicio', comision: '9000', estado: '1' },
    ],
  } as any);
  const { result } = renderHook(() => useFinancialEvents('comisiones'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toHaveLength(2);
  expect(result.current.data.map((row) => row.estado)).toEqual([2, 0]);
});
it('suma las propinas de cajero y barman sin concatenar importes', async () => {
  vi.mocked(tipsService.userDetail).mockResolvedValue({
    success: true,
    data: [
      { monto: '2000', estado: '1' },
      { monto: '3000', estado: '1' },
    ],
  } as any);
  const { result } = renderHook(usePropinasScreen);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.totalPendiente).toBe(5000);
});
it('normaliza los estados y montos de las horas extras propias', async () => {
  vi.mocked(apiClientSafe).mockResolvedValue({
    success: true,
    data: [{ hora: '2', total: '12000', monto: '6000', estado: '1' }],
  } as any);
  const { result } = renderHook(useHorasExtras);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data[0]).toMatchObject({
    total: 12000,
    monto: 6000,
    estado: 1,
  });
});
it('separa fallos de solicitudes de anticipos de un historial vacío y permite reintentar', async () => {
  let failed = true;
  vi.mocked(apiClientSafe).mockImplementation(async (path: string) =>
    path.endsWith('/max')
      ? ({ success: true, data: { monto_maximo: 10000 } } as any)
      : failed
        ? { success: false, message: 'Sin conexión', data: undefined }
        : { success: true, data: [] },
  );
  const { result } = renderHook(useAnticipos);
  await waitFor(() => expect(result.current.error).toBe('Sin conexión'));
  failed = false;
  await act(async () => {
    await result.current.fetchAnticipos();
  });
  expect(result.current.error).toBe('');
});
it('expone los errores de gratificaciones al abrir la pestaña correspondiente', async () => {
  vi.mocked(apiClientSafe).mockImplementation(async (path: string) =>
    path.includes('gratifications')
      ? { success: false, message: 'Fallo de gratificaciones', data: undefined }
      : { success: true, data: [] },
  );
  const { result } = renderHook(useAsistencia);
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setActiveTab('gratificaciones'));
  await waitFor(() =>
    expect(result.current.error).toBe('Fallo de gratificaciones'),
  );
});
it.each([undefined, {}, [{ monto: 'incorrecto' }]])(
  'rechaza un listado o importe inválido sin inventar ceros',
  (value) => {
    expect(() => normalizeEmployeeRecords(value, ['monto'])).toThrow();
  },
);

it('permite consultar por mes sin cambiar el historial completo por defecto', async () => {
  vi.mocked(apiClientSafe).mockResolvedValue({ success: true, data: [] });
  const { result } = renderHook(useAsistencia);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.allHistory).toBe(true);
  act(() => result.current.setAllHistory(false));
  act(() => result.current.onRefresh());
  await waitFor(() =>
    expect(apiClientSafe).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\/attendance\/user\?tipo=detalle&startDate=\d{4}-\d{2}-01&endDate=/,
      ),
      expect.anything(),
    ),
  );
});
