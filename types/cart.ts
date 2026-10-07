/**
 * Tipos de dominio del carrito del garzón.
 *
 * Vivían en `components/shared/ProductCard.tsx` y el store los importaba
 * desde ahí (capa store → components, invertida). Hogar canónico ahora;
 * ProductCard re-exporta para compatibilidad.
 */
export interface Product {
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
    max_anfitrionas?: number | null;
}

export interface CartItem {
    product: Product;
    quantity: number;
    selectedHostesses: number[];
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
