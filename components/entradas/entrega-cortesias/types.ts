import type { EntradaPendiente } from '@/services/entradas';
import type { AcompanamientoBotellaItem } from '@/types/cart';

/** Grupo de entradas pendientes de un mismo cliente: se entrega una por persona. */
export interface GrupoEntrega {
  id: string;
  cliente: string;
  filas: EntradaPendiente[];
}

/** Fila cruda de `opciones_venta` tal como la devuelve el bar. */
export interface OpcionVenta {
  tipo?: string;
  precio?: number;
  precio_sin_anfitriona?: number;
  acompanamiento?: { unidades?: number };
}

/** Bebida del bar ya normalizada para la entrega de cortesías. */
export interface Bebida {
  presentacion_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  precio_venta: number;
  precio_sin_anfitriona: number;
  stock_bar: number;
  categoria_nombre: string | null;
  opciones_venta: OpcionVenta[];
}

/** Bebida analcohólica (cover) que puede repartirse como acompañamiento. */
export interface Acompanamiento {
  presentacion_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  stock_bar: number;
}

export type Formato = 'corte' | 'botella';

export interface LineaSeleccion {
  cantidad: number;
  reparto: AcompanamientoBotellaItem[];
  adicional: string;
}

export type Seleccion = Record<string, LineaSeleccion>;

/** Una línea de selección ya ligada a su bebida y formato. */
export interface LineaEntrega extends LineaSeleccion {
  clave: string;
  bebida: Bebida;
  formato: Formato;
}

/** Cálculo de reparto del acompañamiento de un producto seleccionado. */
export interface RepartoInfo {
  requerido: boolean;
  unidadesRequeridas: number;
  asignado: number;
  restante: number;
  opcionesCover: Acompanamiento[];
  opcionesParaAgregar: Acompanamiento[];
  maxDe: (sabor: AcompanamientoBotellaItem) => number;
  falta: boolean;
}

export interface EntregaCortesiasModalProps {
  visible: boolean;
  grupo: GrupoEntrega | null;
  tope: number;
  onClose: () => void;
  onEntregado: () => void | Promise<void>;
}
