import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClientSafe } from '@/api/client';
import { useVentaSearch } from '@/hooks/useVentaSearch';

vi.mock('@/api/client', () => ({
  apiClientSafe: vi.fn(),
}));

describe('useVentaSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(apiClientSafe).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('busca todas las categorías, normaliza productos y limpia resultados anteriores', async () => {
    vi.mocked(apiClientSafe).mockResolvedValue({
      success: true,
      data: [{
        presentacion_id: 'pres-corona-210',
        producto_id: 'prod-corona',
        producto_nombre: 'Corona',
        presentacion_nombre: '210 ml',
        categoria_nombre: 'Cervezas',
        category_id: 'cat-cervezas',
        precio_venta: 4000,
        stock_bar: 3,
      }],
    } as never);
    const { result } = renderHook(() => useVentaSearch());

    act(() => result.current.setSearchProducto('Corona'));
    expect(result.current.searchResults).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(apiClientSafe).toHaveBeenCalledWith(
      '/products?for_sale=1&term=Corona',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.searchResults[0]).toMatchObject({
      name: 'Corona 210 ml',
      category_id: 'cat-cervezas',
    });
    expect(result.current.searchError).toBe('');
  });

  it('distingue un fallo de búsqueda de una respuesta sin coincidencias', async () => {
    vi.mocked(apiClientSafe).mockResolvedValue({
      success: false,
      message: 'Servicio no disponible',
    } as never);
    const { result } = renderHook(() => useVentaSearch());

    act(() => result.current.setSearchProducto('Corona'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.searchError).toBe('Servicio no disponible');
  });
});