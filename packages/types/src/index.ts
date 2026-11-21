export type UserRole =
  | 'admin'
  | 'administrador'
  | 'manager'
  | 'cajero'
  | 'garzon'
  | 'mesero'
  | 'anfitriona'
  | 'barman';

export type MetodoPago =
  | ''
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'prepago'
  | 'mixto';

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

/** Service states as stored in `servicios.estado` */
export type ServicioEstado = 0 | 1 | 2 | 3 | 4;

/**
 * Normalized Service entity used by the app.
 *
 * `/services` already ships totals and commissions from the server; `/services/user`
 * ships per-user commission. `mapServicio` unifies both shapes into this one.
 */
export interface Servicio {
  id_servicio: number;
  codigo: string;
  estado: ServicioEstado | number;
  pago_estado?: number;
  tiempo: number;
  fecha_crea: string;
  fecha_mod?: string | null;
  precio_servicio: number;
  precio_habitacion: number;
  iva: number;
  sub_total: number;
  total: number;
  metodo_pago: MetodoPago;
  /** Comisión que le corresponde al usuario que consulta (`/services/user`). */
  comision_usuario: number;
  comision_individual: number;
  total_comision: number;
  total_usuarios: number;
  habitacion: string;
  habitacion_id?: number | string | null;
  habitacion_comision: number;
  /** Nombres de las anfitrionas separados por coma (formato de la API). */
  anfitriona: string;
  anfitrionas_ids: string[];
  anfitrionas_fotos: string[];
  cliente: string;
  cliente_id?: number | string | null;
  creado_por?: string | null;
  waiter_name?: string | null;
  waiter_foto?: string | null;
  solicitante_name?: string | null;
  solicitante_foto?: string | null;
  es_temporal?: boolean;
  servicio_original_id?: string | null;
  pagos_mixtos?: unknown[];
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
