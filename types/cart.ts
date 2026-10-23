/**
 * Tipos de dominio del carrito del garzón.
 *
 * Vivían en `components/shared/ProductCard.tsx` y el store los importaba
 * desde ahí (capa store → components, invertida). Hogar canónico ahora;
 * ProductCard re-exporta para compatibilidad.
 */
export interface Product {
  producto_id?: string;
  presentacion_id?: string;
  stock_bar?: number;
  tipo_venta?: "botella" | "shot";
  shot_anfitriona?: boolean;
  opciones_venta?: unknown;
  unidades_acompanamiento?: number;
  acompanamiento_botella?: {
    presentacion_id: string;
    unidades: number;
    nombre?: string;
    foto?: string;
  };
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
