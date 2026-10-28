import { apiClientSafe } from '@/api/client-safe';

export type CatalogoColacion = 'productos' | 'analcoholicas';

export interface DefinicionCatalogoColacion {
  /** Parámetro de query que entiende el endpoint de catálogo. */
  parametroCatalogo: string;
  /** Categoría protegida exigida; null = cualquier producto habilitado. */
  categoriaSistema: string | null;
}

export interface ReglaColacion {
  catalogo: CatalogoColacion;
  parametroCatalogo: string;
  categoriaSistema: string | null;
}

export interface ReglaColacionResponse {
  endpointCatalogo: string;
  categoriaBebidasAnalcoholicas: string;
  catalogos: Record<CatalogoColacion, DefinicionCatalogoColacion>;
  roles: Record<string, ReglaColacion>;
}

/**
 * Regla compartida de colación servida por el dashboard. La app no repite el
 * mapeo rol → catálogo ni la categoría protegida: los consume de acá.
 */
export const colacionesService = {
  regla: (signal?: AbortSignal) =>
    apiClientSafe<ReglaColacionResponse>('/meals/rule', { signal }),
};

/** Regla del rol (case-insensitive), o null si ese rol no recibe colación. */
export function reglaPorRol(
  regla: ReglaColacionResponse,
  rol?: string | null,
): ReglaColacion | null {
  return regla.roles[(rol ?? '').trim().toLowerCase()] ?? null;
}

/** URL del catálogo de colación con el parámetro que indica el servidor. */
export function urlCatalogoColacion(
  regla: ReglaColacionResponse,
  catalogo: CatalogoColacion,
): string {
  const { parametroCatalogo } = regla.catalogos[catalogo];
  return `${regla.endpointCatalogo}?${parametroCatalogo}=true`;
}
