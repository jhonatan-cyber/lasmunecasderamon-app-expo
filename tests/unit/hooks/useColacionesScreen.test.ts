import { useEffect } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useColacionesScreen } from '@/hooks/useColacionesScreen';
import { colacionesService } from '@/services/colaciones-helpers';

vi.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => useEffect(callback, [callback]) }));
vi.mock('@/services/colaciones-helpers', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/colaciones-helpers')>(),
  colacionesService: { regla: vi.fn(), catalogo: vi.fn(), listar: vi.fn(), registrar: vi.fn() },
}));
vi.mock('@/services', () => ({ usersService: { list: vi.fn(async () => ({ success: true, data: [] })) } }));
vi.mock('@/utils/toast-lazy', () => ({ showToast: vi.fn() }));
afterEach(cleanup);

describe('useColacionesScreen', () => {
  it('carga cada catálogo una vez sin volver a consultar las reglas en bucle', async () => {
    vi.mocked(colacionesService.regla).mockResolvedValue({
      success: true,
      data: {
        endpointCatalogo: '/products/for-sale',
        categoriaBebidasAnalcoholicas: 'Bebidas analcoholicas',
        catalogos: {
          productos: { parametroCatalogo: 'solo_colacion', categoriaSistema: null },
          analcoholicas: { parametroCatalogo: 'solo_analcoholicas', categoriaSistema: 'Bebidas analcoholicas' },
        },
        roles: {},
      },
    });
    vi.mocked(colacionesService.catalogo).mockResolvedValue({ success: true, data: [] });
    vi.mocked(colacionesService.listar).mockResolvedValue({ success: true, data: [] });
    const { result, rerender } = renderHook(() => useColacionesScreen());
    await waitFor(() => expect(result.current.ruleLoading).toBe(false));
    await waitFor(() => expect(colacionesService.catalogo).toHaveBeenCalledTimes(2));
    rerender();
    expect(colacionesService.regla).toHaveBeenCalledTimes(1);
    expect(colacionesService.catalogo).toHaveBeenCalledTimes(2);
  });
});
