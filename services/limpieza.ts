import { apiClientSafe } from '@/api/client-safe';
import { showToast } from '@/utils/toast-lazy';
import { ApiRes } from '@/types/api';

type UbicacionLimpieza = 'almacen' | 'bar' | 'caja' | 'local';
export const UBICACIONES_LIMPIEZA = ['almacen', 'bar', 'caja', 'local'] as const;

export type OperacionLimpieza =
  | { tipo: 'articulo'; nombre: string; unidad: 'unidad' | 'litro' | 'kilo' | 'paquete' | 'metro'; minimo?: number }
  | {
      tipo: 'ingreso';
      articulo_id: string;
      cantidad: number;
      proveedor?: string;
      costo_unitario?: number;
      nota?: string;
    }
  | {
      tipo: 'traspaso';
      articulo_id: string;
      cantidad: number;
      origen: UbicacionLimpieza;
      destino: UbicacionLimpieza;
      nota?: string;
    }
  | {
      tipo: 'consumo';
      articulo_id: string;
      cantidad: number;
      origen: UbicacionLimpieza;
      nota: string;
    }
  | { tipo: 'resolver'; id: string; accion: 'aceptar' | 'rechazar' };

export interface AccesoLimpieza {
  gestionar: boolean;
  ubicaciones: UbicacionLimpieza[];
}

export interface ArticuloLimpieza {
  id: string;
  nombre: string;
  unidad: string;
  minimo: number;
  stock: Record<string, number>;
  en_transito: number;
}

export interface ResumenLimpieza {
  articulos: ArticuloLimpieza[];
  movimientos: Array<{
    id: string;
    articulo: string;
    unidad: string;
    tipo: 'ingreso' | 'traspaso' | 'consumo';
    cantidad: number;
    origen: UbicacionLimpieza | null;
    destino: UbicacionLimpieza | null;
    estado: 'pendiente' | 'aceptado' | 'rechazado';
    nota: string;
    creado_por: string;
    recibido_por: string | null;
    creador_nombre?: string;
    receptor_nombre?: string | null;
    fecha: string;
    fecha_resolucion: string | null;
  }>;
  acceso: AccesoLimpieza;
}

interface RawResumenLimpieza {
  articulos: Array<{
    id: string;
    nombre: string;
    unidad: string;
    minimo: number;
    stock: Record<string, number>;
    en_transito: number;
  }>;
  movimientos: Array<{
    id: string;
    articulo: string;
    unidad: string;
    tipo: 'ingreso' | 'traspaso' | 'consumo';
    cantidad: number;
    origen: UbicacionLimpieza | null;
    destino: UbicacionLimpieza | null;
    estado: 'pendiente' | 'aceptado' | 'rechazado';
    nota: string;
    creado_por: string;
    recibido_por: string | null;
    creador_nombre?: string;
    receptor_nombre?: string | null;
    fecha: string;
    fecha_resolucion: string | null;
  }>;
  acceso: AccesoLimpieza;
}

const NOMBRES_UBICACION: Record<UbicacionLimpieza, string> = {
  almacen: 'Almacén',
  bar: 'Bar',
  caja: 'Caja',
  local: 'Local',
};

let _cached: RawResumenLimpieza | null = null;

export const limpiezaService = {
  getSummary: (signal?: AbortSignal): Promise<ApiRes<RawResumenLimpieza>> =>
    apiClientSafe<RawResumenLimpieza>('/cleaning', { signal }),

  operate: async (op: OperacionLimpieza, signal?: AbortSignal) => {
    const res = await apiClientSafe<{ success: boolean; data?: unknown; message?: string }>(
      '/cleaning',
      {
        method: 'POST',
        body: JSON.stringify(op),
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': op.tipo === 'resolver'
            ? `limpieza-resolver-${op.id}`
            : `limpieza-${crypto.randomUUID?.() ?? Math.random().toString(36)}`,
        },
        timeout: 120_000,
        signal,
      }
    );
    if (!res.success) {
      throw new Error(res.message || 'No se pudo registrar la operación');
    }
    showToast({type:'success',text1:'Operación registrada',text2:op.tipo==='resolver'?op.accion==='aceptar'?'Recepción aceptada':'Recepción rechazada':op.tipo==='ingreso'?'Ingreso registrado':op.tipo==='traspaso'?'Traspaso enviado':op.tipo==='consumo'?'Consumo registrado':'Artículo creado'});
    return res;
  },

  /** Carga en caché silencioso y reutiliza para los renders mientras no cambie. */
  refresh: async (signal?: AbortSignal): Promise<RawResumenLimpieza | null> => {
    try {
      const res = await apiClientSafe<RawResumenLimpieza>('/cleaning', { signal });
      if (res.success && res.data) {
        _cached = res.data;
        return _cached;
      }
      throw new Error(res.message || 'No se pudo cargar el inventario');
    } catch (error) {
      if (_cached) return _cached;
      throw error;
    }
  },

  /** Nombre legible de una ubicación para UI. */
  nombre: (ubicacion: UbicacionLimpieza) => NOMBRES_UBICACION[ubicacion],
};

