import { useEffect } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useColacionesScreen } from '@/hooks/useColacionesScreen';
import { usersService } from '@/services';
import { colacionesService, type ReglaColacionResponse } from '@/services/colaciones';

vi.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => useEffect(callback, [callback]) }));
vi.mock('@/services/colaciones', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/colaciones')>(),
  colacionesService: { regla: vi.fn(), catalogo: vi.fn(), listar: vi.fn(), registrar: vi.fn() },
}));
vi.mock('@/services', () => ({ usersService: { list: vi.fn(async () => ({ success: true, data: [] })) } }));
vi.mock('@/utils/toast-lazy', () => ({ showToast: vi.fn() }));
afterEach(cleanup);

const regla: ReglaColacionResponse = {
  endpointCatalogo: '/products/for-sale',
  categoriaBebidasAnalcoholicas: 'Bebidas analcoholicas',
  catalogos: {
    productos: { parametroCatalogo: 'solo_colacion', categoriaSistema: null },
    analcoholicas: { parametroCatalogo: 'solo_analcoholicas', categoriaSistema: 'Bebidas analcoholicas' },
  },
  roles: {},
};

describe('useColacionesScreen', () => {
  it('carga cada catálogo una vez sin volver a consultar las reglas en bucle', async () => {
    vi.mocked(colacionesService.regla).mockResolvedValue({ success: true, data: regla });
    vi.mocked(colacionesService.catalogo).mockResolvedValue({ success: true, data: [] });
    vi.mocked(colacionesService.listar).mockResolvedValue({ success: true, data: [] });
    const { result, rerender } = renderHook(() => useColacionesScreen());
    await waitFor(() => expect(result.current.ruleLoading).toBe(false));
    await waitFor(() => expect(colacionesService.catalogo).toHaveBeenCalledTimes(2));
    rerender();
    expect(colacionesService.regla).toHaveBeenCalledTimes(1);
    expect(colacionesService.catalogo).toHaveBeenCalledTimes(2);
  });

  it('pide el turno por caja y deja la fecha al servidor', async () => {
    vi.mocked(colacionesService.regla).mockResolvedValue({ success: true, data: regla });
    vi.mocked(colacionesService.catalogo).mockResolvedValue({ success: true, data: [] });
    vi.mocked(colacionesService.listar).mockClear().mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useColacionesScreen());
    await waitFor(() => expect(result.current.registrosLoading).toBe(false));

    // Sin caja abierta no se manda fecha: el servidor usa su fecha de negocio.
    expect(colacionesService.listar).toHaveBeenCalledWith({}, undefined);
    expect(result.current.recepcionesPorTrabajador).toEqual({});
  });

  it('cuenta las colaciones recibidas por trabajador en el turno', async () => {
    const registro = (id: number, usuario_id: string) => ({
      id,
      usuario_id,
      registrado_por_nombre: 'Barman',
      fecha: '2026-11-01',
      fecha_crea: '2026-11-01T12:00:00Z',
    });
    vi.mocked(colacionesService.regla).mockResolvedValue({ success: true, data: regla });
    vi.mocked(colacionesService.catalogo).mockResolvedValue({ success: true, data: [] });
    vi.mocked(colacionesService.listar).mockResolvedValue({
      success: true,
      data: [registro(1, 'u1'), registro(2, 'u1'), registro(3, 'u2')],
    });

    const { result } = renderHook(() => useColacionesScreen());
    await waitFor(() => expect(result.current.registrosLoading).toBe(false));

    expect(result.current.recepcionesPorTrabajador).toEqual({ u1: 2, u2: 1 });
  });

  it('conserva el rol_id de cada trabajador para consultar el tope asignado', async () => {
    vi.mocked(usersService.list).mockResolvedValueOnce({
      success: true,
      data: [{ id: 12, name: 'Ana', lastName: 'Pérez', role: 'anfitriona', rol_id: 10, status: 1 }],
    } as any);
    vi.mocked(colacionesService.regla).mockResolvedValue({ success: true, data: regla });
    vi.mocked(colacionesService.catalogo).mockResolvedValue({ success: true, data: [] });
    vi.mocked(colacionesService.listar).mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(() => useColacionesScreen());

    await waitFor(() => expect(result.current.trabajadores).toHaveLength(1));

    expect(result.current.trabajadores[0]).toMatchObject({ id: '12', roleId: '10' });
  });
});
