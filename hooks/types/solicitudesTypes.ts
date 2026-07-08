export type PendingAutoOpen = { id: string; type: string } | null;

/** Base fields shared across all solicitud item types.
 * Fields are optional when they may not exist on every variant,
 * making them safely accessible on the SolicitudItem union. */
export interface SolicitudItemBase {
  id_unificado: string;
  fecha_orden: number;
  codigo: string;
  /** Discriminator — each variant sets this to a literal */
  tipoItem: 'solicitud' | 'pedido' | 'anticipo';
  /** Common ID fields (each variant has one of these) */
  id_solicitud?: string;
  id_pedido?: string;
  id_anticipo?: string;
  /** Common client references */
  id_cliente?: string | null;
  cliente_id?: string | null;
  /** Common payment & amount fields */
  metodo_pago?: string;
  monto?: number;
  total?: number;
  estado?: number;
  /** Anticipo-specific field also referenced generically */
  usuario?: string;
  /** Solicitud-specific field also referenced generically */
  habitacion_nombre?: string;
}

/** A service request solicitud (from /solicitudes-servicios) */
export interface SolicitudSolicitud extends SolicitudItemBase {
  tipoItem: 'solicitud';
  fecha_solicitud?: string;
  habitacion_nombre?: string;
  solicitado_por_nombre?: string;
}

/** An order/pedido (from /orders) */
export interface PedidoItem extends SolicitudItemBase {
  tipoItem: 'pedido';
  fecha_crea?: string;
  mesero_nick?: string;
  mesero_nombre?: string;
  garzon?: string;
  propina?: number;
  subtotal?: number;
}

/** An anticipo/advance (from /anticipos) */
export interface AnticipoItem extends SolicitudItemBase {
  tipoItem: 'anticipo';
  fecha_crea?: string;
  fecha_mod?: string;
  motivo?: string;
}

export type SolicitudItem = SolicitudSolicitud | PedidoItem | AnticipoItem;

export interface UseSolicitudesActionsParams {
  solicitudes: SolicitudItem[];
  cajaAbierta: boolean;
  fetchSolicitudes: (isManual?: boolean) => Promise<void>;
  removeSolicitudLocally: (id: string, tipo: "pedido" | "solicitud" | "anticipo") => void;
  pendingAutoOpen: PendingAutoOpen;
  setPendingAutoOpen: (value: PendingAutoOpen) => void;
  openId?: string | string[];
  queryType?: string | string[];
}

export type AlertType = "info" | "success" | "warning" | "danger";

export interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
  onConfirm?: () => void;
}
