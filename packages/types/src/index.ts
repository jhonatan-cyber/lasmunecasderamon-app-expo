export type UserRole =
  | 'admin'
  | 'administrador'
  | 'manager'
  | 'cajero'
  | 'garzon'
  | 'mesero'
  | 'anfitriona';

export type MetodoPago =
  | ''
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'prepago'
  | 'mixto'
  | 'qr';

// ─── Entity Types ───────────────────────────────────────────────

/** Normalized Room/Habitacion entity from API */
export interface Habitacion {
  id: number | string;
  id_habitacion?: number | string;
  nombre: string;
  name?: string;
  numero?: string;
  precio: number;
  price?: number;
  tiempo: number;
  time?: number;
  estado: number;
  status?: number;
  comision_anfitriona?: number;
}

/** Normalized Hostess/Anfitriona entity from API */
export interface Anfitriona {
  id: number | string;
  id_usuario?: number | string;
  nick: string;
  name?: string;
  nombre?: string;
  foto?: string;
  estado_servicio?: number;
  status?: number;
}

/** Normalized Client/Cliente entity from API */
export interface Cliente {
  id: number | string;
  id_cliente?: number | string;
  run?: string;
  name?: string;
  nombre?: string;
  lastName?: string;
  apellido?: string;
  last_name?: string;
  phone?: string;
  saldo: number;
  deuda: number;
  status?: number;
}

/** Normalized Product/Producto entity from API */
export interface Producto {
  id: string | number;
  id_producto?: string | number;
  name?: string;
  nombre?: string;
  code?: string;
  categoria?: string;
  category_id?: string | number;
  price?: number;
  precio?: number;
  commission?: number;
  comision?: number;
  max_anfitrionas?: number | null;
  description?: string;
  status?: number;
  foto?: string;
}

/** Product Category */
export interface Categoria {
  id: number;
  name: string;
  nombre?: string;
  description?: string;
  icon?: string;
  image?: string;
  status?: number;
}

/** Cart Item used in new account and new sale flows */
export interface CartItem {
  id?: string | number;
  id_producto: string | number;
  nombre: string;
  precio: number;
  comision: number;
  cantidad: number;
  subtotal: number;
  selectedHostesses: number[];
  hostessNames: string | null;
  isChampagne: boolean;
}

/** Cart Item for venta flow (uses different field names) */
export interface CartItemVenta {
  id?: string | number;
  id_producto?: string | number;
  name?: string;
  nombre?: string;
  precio?: number;
  price?: number;
  comision?: number;
  commission?: number;
  quantity: number;
  cantidad?: number;
  sub_total?: number;
  anfitrionas: number[];
  hostessNames: string | null;
  selectedHostesses?: number[];
  isChampagne?: boolean;
  categoria?: string;
}

/** Hostess commission distribution entry */
export interface HostessDist {
  id: string;
  name: string;
  amount: number;
}

/** Commission preview result */
export interface CommissionPreview {
  totalCommission: number;
  assignedCommission: number;
  hostessDistribution: HostessDist[];
}

/** Category with loaded products (used in modal) */
export interface CategoriaConProductos extends Categoria {
  products?: Producto[];
}
