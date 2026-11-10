import { apiClientSafe } from '@/api/client-safe';

export interface CompraDetalle {
  id: number | string;
  producto_nombre?: string;
  presentacion_nombre?: string;
  cantidad: number;
  precio_compra: number;
  subtotal: number;
  fecha_vencimiento?: string | null;
}

export interface Compra {
  id: number | string;
  folio: string;
  total: number;
  proveedor?: string | null;
  telefono?: string | null;
  observaciones?: string | null;
  metodo_pago?: string | null;
  usuario_nombre?: string | null;
  fecha_crea: string;
  detalles: CompraDetalle[];
}

export const comprasService = {
  list: (signal?: AbortSignal) => apiClientSafe<Compra[]>('/purchases', { signal }),
};
