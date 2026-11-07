export interface AcompanamientoBotellaItem {
  presentacion_id: string;
  unidades: number;
  nombre?: string;
  foto?: string;
}

export type AcompanamientoBotella =
  | AcompanamientoBotellaItem
  | AcompanamientoBotellaItem[];

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
  acompanamiento_corto?: {
    presentacion_id: string;
    unidades?: number;
    ml_por_corto?: number;
    nombre?: string;
    foto?: string;
  };
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
