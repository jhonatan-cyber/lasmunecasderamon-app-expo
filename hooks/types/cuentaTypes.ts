import type {
  Habitacion,
  Anfitriona,
  Cliente,
  Producto,
  Categoria,
  CartItem,
} from "@lasmunecasderamon/types";

// ── Cuenta detail sub-types ──────────────────────────────────────────

export interface RoomHistoryEntry {
  roomId: string | number;
  roomName?: string;
  assignedMinutes?: number;
  consumedMinutes?: number;
  remainingMinutes?: number;
  startedAt?: string;
  endedAt?: string;
  isActive?: boolean;
  carriedFromPrevious?: boolean;
}

export interface CuentaDetalleItem {
  id?: string | number;
  producto?: string;
  producto_id?: string | number;
  nombre?: string;
  cantidad: number;
  precio: number;
  sub_total: number;
  comision?: number;
  hostess_nick?: string;
  hostess_id?: string | number;
  added_by?: string;
  added_by_foto?: string;
  isChampagne?: boolean;
  fecha_crea?: string;
  estado?: string | number;
}

export interface CuentaUsuario {
  usuario_id?: string | number;
  id_usuario?: string | number;
  nick?: string;
  nombre?: string;
}

export interface CuentaResumenFinanciero {
  total_original?: number;
  total_actual?: number;
  total_anulado_aprobado?: number;
  total_anulacion_pendiente?: number;
}

export interface SolicitudAnulacion {
  id?: string | number;
  monto?: number;
  estado?: string;
  motivo?: string;
  fecha_crea?: string;
  fecha_mod?: string;
}

export interface CuentaDetalle {
  id_cuenta: string | number;
  codigo: string;
  estado: number;

  // Client
  cliente_id?: string | number | null;
  cliente_nombre?: string;
  cliente_apellido?: string;
  cliente_saldo?: number;

  // Room
  habitacion_id?: string | number | null;
  habitacion_nombre?: string;
  habitacion_numero?: string;

  // Time
  tiempo?: number;
  tiempo_total?: number;
  tiempo_activo?: number;
  habitaciones_historial_data?: RoomHistoryEntry[];

  // Totals
  total?: number;
  sub_total?: number;
  total_comision?: number;

  // Staff
  nombre_cajero?: string;
  foto_cajero?: string;
  nombre_cobrador?: string;
  foto_cobrador?: string;

  // Financial breakdown
  resumen_financiero?: CuentaResumenFinanciero;
  solicitudes_anulacion?: SolicitudAnulacion[];

  // Line items & hostesses
  detalles?: CuentaDetalleItem[];
  usuarios?: CuentaUsuario[];

  // Payment & counts
  metodo_pago?: string;
  total_detalles?: number;
  creador_nombre?: string;

  // Metadata
  pedido_id?: string | number | null;
  fecha_crea?: string;
  fecha_mod?: string;
}

export interface CuentaResumen {
  total_por_cobrar?: number;
  total_cuentas?: number;
}

/** Original account data passed to useAgregarCuenta */
export interface CuentaOriginal {
  id_cuenta: string | number;
  habitacion_id?: string | number | null;
  total?: number;
  codigo?: string;
  cliente_nombre?: string;
}

export interface HostessSelectionTarget {
  productId: number;
  isChampagne: boolean;
  max: number;
  product?: Producto;
}

export type CuentaState = {
  loadingInitial: boolean;
  refreshing: boolean;
  anfitrionas: Anfitriona[];
  habitaciones: Habitacion[];
  categories: Categoria[];
  cart: CartItem[];
  selectedHabitacion: Habitacion | null;
  selectedTime: number;
  roomModalVisible: boolean;
  modalOpen: boolean;
  modalCategoria: Categoria | null;
  modalProducts: Producto[];
  modalLoading: boolean;
  modalQuantities: { [key: number]: number };
  modalHostessSelections: { [key: number]: (string | number)[] };
  hostessSelectionTarget: HostessSelectionTarget | null;
  hostessSubModalVisible: boolean;
  submitting: boolean;
  extraTiempo: number;
  timeModalVisible: boolean;
  cuentaDetalle: CuentaDetalle | null;
};

export type CuentaAction =
  | { type: "SET_LOADING_INITIAL"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_INITIAL_DATA"; payload: Partial<CuentaState> }
  | { type: "SET_CART"; payload: CartItem[] }
  | { type: "SET_MODAL_VISIBLE"; modal: string; visible: boolean }
  | { type: "OPEN_CATEGORY_MODAL"; category: Categoria; products: Producto[] }
  | { type: "SET_MODAL_LOADING"; payload: boolean }
  | { type: "SET_MODAL_QUANTITY"; productId: number; quantity: number }
  | { type: "SET_MODAL_HOSTESSES"; productId: number; hostesses: (string | number)[] }
  | { type: "SET_HOSTESS_TARGET"; target: HostessSelectionTarget | null }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_SELECTED_HABITACION"; payload: Habitacion | null }
  | { type: "SET_SELECTED_TIME"; payload: number }
  | { type: "SET_ROOM_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_EXTRA_TIEMPO"; payload: number }
  | { type: "SET_TIME_MODAL_VISIBLE"; payload: boolean };

export const initialCuentaState: CuentaState = {
  loadingInitial: true,
  refreshing: false,
  anfitrionas: [],
  habitaciones: [],
  categories: [],
  cart: [],
  selectedHabitacion: null,
  selectedTime: 5,
  roomModalVisible: false,
  modalOpen: false,
  modalCategoria: null,
  modalProducts: [],
  modalLoading: false,
  modalQuantities: {},
  modalHostessSelections: {},
  hostessSelectionTarget: null,
  hostessSubModalVisible: false,
  submitting: false,
  extraTiempo: 0,
  timeModalVisible: false,
  cuentaDetalle: null,
};

export function cuentaReducer(state: CuentaState, action: CuentaAction): CuentaState {
  switch (action.type) {
    case "SET_LOADING_INITIAL":
      return { ...state, loadingInitial: action.payload };
    case "SET_REFRESHING":
      return { ...state, refreshing: action.payload };
    case "SET_INITIAL_DATA":
      return { ...state, ...action.payload };
    case "SET_CART":
      return { ...state, cart: action.payload };
    case "SET_MODAL_VISIBLE":
      return { ...state, modalOpen: action.visible };
    case "OPEN_CATEGORY_MODAL":
      return {
        ...state,
        modalOpen: true,
        modalCategoria: action.category,
        modalProducts: action.products,
        modalQuantities: {},
        modalHostessSelections: {},
      };
    case "SET_MODAL_LOADING":
      return { ...state, modalLoading: action.payload };
    case "SET_MODAL_QUANTITY":
      return {
        ...state,
        modalQuantities: { ...state.modalQuantities, [action.productId]: action.quantity },
      };
    case "SET_MODAL_HOSTESSES":
      return {
        ...state,
        modalHostessSelections: { ...state.modalHostessSelections, [action.productId]: action.hostesses },
      };
    case "SET_HOSTESS_TARGET":
      return {
        ...state,
        hostessSelectionTarget: action.target,
        hostessSubModalVisible: !!action.target,
      };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.payload };
    case "SET_SELECTED_HABITACION":
      return { ...state, selectedHabitacion: action.payload };
    case "SET_SELECTED_TIME":
      return { ...state, selectedTime: action.payload };
    case "SET_ROOM_MODAL_VISIBLE":
      return { ...state, roomModalVisible: action.payload };
    case "SET_EXTRA_TIEMPO":
      return { ...state, extraTiempo: action.payload };
    case "SET_TIME_MODAL_VISIBLE":
      return { ...state, timeModalVisible: action.payload };
    default:
      return state;
  }
}
