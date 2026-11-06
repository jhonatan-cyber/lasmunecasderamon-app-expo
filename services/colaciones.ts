import { apiClientSafe } from '@/api/client-safe';

/** Ml que se descuenta del bar al registrar la colación. */
export function mlDeColacion(producto: unknown) {
  const opcion = (producto as any)?.opciones_venta || [];
  const encontrado = opcion.find((o: any) => o.tipo === 'botella');
  if (encontrado?.ml_colacion) return Number(encontrado.ml_colacion);
  const mlBotella = Number((producto as any)?.ml_botella ?? 0);
  return Number.isFinite(mlBotella) && mlBotella > 0 ? mlBotella : 0;
}

/** Acompanamiento configurado en la transferencia de esa presentación. */
export function acompanamientoDeColacion(producto: unknown) {
  const opcion = (producto as any)?.opciones_venta || [];
  const encontrado = opcion.find((o: any) => o.tipo === 'botella');
  const propio =
    encontrado?.acompanamiento_colacion?.unidades ??
    encontrado?.acompanamiento?.unidades ??
    0;
  const unidades = Math.max(0, Math.floor(Number(propio)));
  const ml = Math.floor(Number(encontrado?.acompanamiento_colacion?.ml ?? 0));
  return { unidades, ml: ml > 0 ? ml : null };
}

export type CatalogoColacion = 'productos' | 'analcoholicas';

export interface DefinicionCatalogoColacion {
  parametroCatalogo: string;
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

export const colacionesService = {
  regla: (signal?: AbortSignal) =>
    apiClientSafe<ReglaColacionResponse>('/meals/rule', { signal }),
  catalogo: (
    regla: ReglaColacionResponse,
    catalogo: CatalogoColacion,
    signal?: AbortSignal,
  ) => apiClientSafe(urlCatalogoColacion(regla, catalogo), { signal }),
  acompanamientos: (signal?: AbortSignal) =>
    apiClientSafe('/bar?acompanamientos=1', { signal }),
  listar: (params: { fecha?: string; caja_id?: string }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    if (params.fecha) q.set('fecha', params.fecha);
    if (params.caja_id) q.set('caja_id', params.caja_id);
    return apiClientSafe(`/meals${q.toString() ? `?${q.toString()}` : ''}`, { signal });
  },
  registrar: (payload: {
    usuario_id: string;
    presentacion_id: string;
    ml_bebida: number;
    nombre_bebida: string;
    acompanamiento?: 'gaseosa' | 'soda' | null;
    acompanamiento_presentacion_id?: string | null;
  }) => apiClientSafe('/meals', { method: 'POST', body: JSON.stringify(payload) }),
};

export function reglaPorRol(
  regla: ReglaColacionResponse,
  rol?: string | null,
): ReglaColacion | null {
  return regla.roles[(rol ?? '').trim().toLowerCase()] ?? null;
}

export function urlCatalogoColacion(
  regla: ReglaColacionResponse,
  catalogo: CatalogoColacion,
): string {
  const { parametroCatalogo } = regla.catalogos[catalogo];
  return `${regla.endpointCatalogo}?${parametroCatalogo}=true`;
}
