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

/** Regla compartida de colación servida por el dashboard. La app no repite el
 * mapeo rol → catálogo ni la categoría protegida: los consume de acá.
 */
export const colacionesService = {
  regla: (signal?: AbortSignal) =>
    apiClientSafe<ReglaColacionResponse>('/meals/rule', { signal }),
  /** Anfitriona (`productos`) o barman/cajero/garzón (`analcoholicas`). */
  catalogo: (
    regla: ReglaColacionResponse,
    catalogo: CatalogoColacion,
    signal?: AbortSignal,
  ) => apiClientSafe(urlCatalogoColacion(regla, catalogo), { signal }),
  acompanamientos: (signal?: AbortSignal) =>
    apiClientSafe<AcompanamientoOpcion[]>('/bar?acompanamientos=1', { signal }),
  listar: (params: { fecha?: string; caja_id?: string }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    if (params.fecha) q.set('fecha', params.fecha);
    if (params.caja_id) q.set('caja_id', params.caja_id);
    return apiClientSafe<ColacionRegistro[]>(
      `/meals${q.toString() ? `?${q.toString()}` : ''}`,
      { signal },
    );
  },
  registrar: (payload: {
    usuario_id: string;
    presentacion_id: string;
    ml_bebida: number;
    nombre_bebida: string;
    acompanamiento?: 'gaseosa' | 'soda' | null;
    acompanamiento_presentacion_id?: string | null;
  }) =>
    apiClientSafe<ColacionRegistro>('/meals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
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

/** Ml que se descuenta del bar al registrar la colación. */
export function mlDeColacion(producto: ColacionProducto) {
  const opcion = (producto.opciones_venta || []).find((o) => o.tipo === 'botella');
  if (opcion?.ml_colacion) return Number(opcion.ml_colacion);
  const mlBotella = Number(producto.ml_botella ?? 0);
  return Number.isFinite(mlBotella) && mlBotella > 0 ? mlBotella : 0;
}

/** Acompanamiento configurado en la transferencia de esa presentación. */
export function acompanamientoDeColacion(producto: ColacionProducto) {
  const opcion = (producto.opciones_venta || []).find((o) => o.tipo === 'botella');
  const propio =
    opcion?.acompanamiento_colacion?.unidades ??
    opcion?.acompanamiento?.unidades ??
    0;
  const unidades = Math.max(0, Math.floor(Number(propio)));
  const ml = Math.floor(Number(opcion?.acompanamiento_colacion?.ml ?? 0));
  return { unidades, ml: ml > 0 ? ml : null };
}

export interface ColacionProducto {
  id: number;
  producto_id: number;
  producto_nombre: string;
  presentacion_id: number;
  presentacion_nombre: string;
  ml_botella: number;
  ml_abierta: number;
  ml_colacion: number;
  precio?: number;
  costo?: number;
  stock?: number;
  opciones_venta?: Array<{
    id: number;
    tipo: string;
    ml_colacion?: number;
    acompanamiento?: { unidades: number; ml: number };
    acompanamiento_colacion?: { unidades: number; ml: number };
  }>;
  unidades?: number;
  stock_pendiente?: number;
  categoria_id?: number;
  categoria_nombre?: string;
  producto_categoria?: string;
  producto_categoria_nombre?: string;
  categoria?: string;
  presentacion_compartida?: boolean;
  precio_compartido?: number;
  cantidad?: number;
  stock_minimo?: number;
  stock_maximo?: number;
  precio_unitario?: number;
  acompanamiento?: {
    unidades: number;
    ml: number;
  };
  acompanamiento_colacion?: {
    unidades: number;
    ml: number;
  };
}

export interface AcompanamientoOpcion {
  id: number;
  nombre: string;
  presentacion_id: number;
  presentacion_nombre: string;
  ml: number;
  cantidad?: number;
  cantidad_servir?: number;
  disponible?: boolean;
  stock?: number;
  stock_minimo?: number;
  stock_maximo?: number;
}

export interface ColacionRegistro {
  id: number;
  usuario_id?: string;
  usuario_nombre?: string;
  nick?: string;
  presentacion_id?: number;
  presentacion_nombre?: string;
  producto_nombre?: string;
  ml_bebida?: number;
  acompanamiento?: 'gaseosa' | 'soda' | null;
  acompanamiento_presentacion_id?: string | null;
  acompanamiento_nombre?: string | null;
  registrado_por_nombre: string;
  fecha: string;
  fecha_crea: string;
  fecha_resolucion?: string | null;
  id_caja?: string | null;
}
