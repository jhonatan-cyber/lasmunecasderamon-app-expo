import { describe, expect, it, vi } from 'vitest';
import {
  colacionesService,
  reglaPorRol,
  urlCatalogoColacion,
  type ReglaColacionResponse,
} from '@/services/colaciones';

const { apiClientSafe } = vi.hoisted(() => ({ apiClientSafe: vi.fn() }));
vi.mock('@/api/client-safe', () => ({ apiClientSafe }));

const regla: ReglaColacionResponse = {
  endpointCatalogo: '/api/products/for-sale',
  categoriaBebidasAnalcoholicas: 'bebidas_analcoholicas',
  catalogos: {
    productos: { parametroCatalogo: 'solo_colaciones', categoriaSistema: null },
    analcoholicas: {
      parametroCatalogo: 'solo_colaciones_analcoholicas',
      categoriaSistema: 'bebidas_analcoholicas',
    },
  },
  roles: {
    anfitriona: {
      catalogo: 'productos',
      parametroCatalogo: 'solo_colaciones',
      categoriaSistema: null,
    },
    cajero: {
      catalogo: 'analcoholicas',
      parametroCatalogo: 'solo_colaciones_analcoholicas',
      categoriaSistema: 'bebidas_analcoholicas',
    },
    garzon: {
      catalogo: 'analcoholicas',
      parametroCatalogo: 'solo_colaciones_analcoholicas',
      categoriaSistema: 'bebidas_analcoholicas',
    },
    barman: {
      catalogo: 'analcoholicas',
      parametroCatalogo: 'solo_colaciones_analcoholicas',
      categoriaSistema: 'bebidas_analcoholicas',
    },
  },
};

describe('regla compartida de colación', () => {
  it('la consulta al endpoint del dashboard', async () => {
    apiClientSafe.mockResolvedValue({ success: true, data: regla });

    await expect(colacionesService.regla()).resolves.toEqual({ success: true, data: regla });
    expect(apiClientSafe).toHaveBeenCalledWith('/meals/rule', { signal: undefined });
  });

  it('resuelve el catálogo por rol sin repetir el mapeo en la app', () => {
    expect(reglaPorRol(regla, ' Anfitriona ')).toMatchObject({ catalogo: 'productos' });
    for (const rol of ['cajero', 'garzon', 'barman'])
      expect(reglaPorRol(regla, rol)).toMatchObject({ catalogo: 'analcoholicas' });
    expect(reglaPorRol(regla, 'supervisor')).toBeNull();
    expect(reglaPorRol(regla, null)).toBeNull();
  });

  it('construye la URL del catálogo con el parámetro que indica el servidor', () => {
    expect(urlCatalogoColacion(regla, 'productos')).toBe(
      '/api/products/for-sale?solo_colaciones=true',
    );
    expect(urlCatalogoColacion(regla, 'analcoholicas')).toBe(
      '/api/products/for-sale?solo_colaciones_analcoholicas=true',
    );
  });
});
