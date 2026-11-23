export interface AcompanamientoBotellaItem {
  presentacion_id: string;
  unidades: number;
  nombre?: string;
  foto?: string;
  /** Precio unitario de esta presentación de acompañamiento (del catálogo de productos). */
  precio?: number;
  /** ML de la botella de esta presentación de acompañamiento. */
  ml_botella?: number;
}

export type AcompanamientoBotella =
  | AcompanamientoBotellaItem
  | AcompanamientoBotellaItem[];

export interface AcompanamientoCorto {
  presentacion_id: string;
  unidades?: number;
  ml_por_corto?: number;
  nombre?: string;
  foto?: string;
  /** Precio unitario de la bebida elegida (del catálogo de productos). */
  precio?: number;
}

export interface Product {
  producto_id?: string;
  presentacion_id?: string;
  stock_bar?: number;
  tipo_venta?: "botella" | "shot";
  shot_anfitriona?: boolean;
  botella_anfitriona?: boolean;
  opciones_venta?: unknown;
  unidades_acompanamiento?: number;
  acompanamiento_botella?: AcompanamientoBotella;
  acompanamiento_corto?: AcompanamientoCorto;
  id: string;
  code: string;
  name: string;
  category_id: string;
  price: number;
  commission: number;
  description: string;
  status: number;
  foto: string;
  categoria: string;
  producto_nombre?: string;
  presentacion_nombre?: string;
  ml_abierta?: number;
  ml_shot?: number;
  ml_shot_anfitriona?: number;
  max_anfitrionas?: number | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedHostesses: (string | number)[];
  selectedRoom: string | null;
  /**
   * Bebida elegida para cada unidad de corto. El dashboard permite una bebida
   * distinta por corto; al separar el pedido cada unidad toma su propio mixer.
   * Ausente en items antiguos: se usa `product.acompanamiento_corto` para todas.
   */
  shortMixers?: (AcompanamientoCorto | undefined)[];
}

export type MetodoPagoPedido = "efectivo" | "tarjeta" | "transferencia";

export interface Anfitriona {
  id: string;
  nick: string;
  name?: string;
  lastName?: string;
  foto?: string;
}

export interface Room {
  id: string;
  name: string;
  price?: number;
  time?: number;
  status?: number;
}
