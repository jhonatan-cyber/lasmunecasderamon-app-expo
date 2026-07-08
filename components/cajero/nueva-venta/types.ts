import type { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';
import type {
  Anfitriona,
  Habitacion,
  Cliente,
  Producto,
  Categoria,
} from '@lasmunecasderamon/types';

export type PagoMixto = {
  metodo: PaymentMethod;
  monto: number;
  display: string;
};

/** Product item in the sales cart (uses both ES and EN field names for backward compat) */
export type VentaCartItem = Producto & {
  quantity: number;
  cantidad?: number;
  anfitrionas?: (string | number)[];
  hostessNames?: string | null;
};

/** Hostess selection target for commission products */
export type VentaHostessTarget = {
  productId: string | number;
  isChampagne: boolean;
  max: number;
  product?: Producto;
};

export type VentaState = {
  loadingInitial: boolean;
  refreshing: boolean;
  anfitrionas: Anfitriona[];
  habitaciones: Habitacion[];
  clientes: Cliente[];
  cajaAbierta: boolean | null;
  cart: VentaCartItem[];
  selectedCliente: Cliente | null;
  selectedHabitacion: Habitacion | null;
  metodoPago: PaymentMethod;
  pagosMixtos: PagoMixto[];
  enableTip: boolean;
  selectedTime: number;
  timeModalVisible: boolean;
  categories: Categoria[];
  modalOpen: boolean;
  modalCategoria: Categoria | null;
  modalProducts: Producto[];
  modalLoading: boolean;
  modalQuantities: { [key: string]: number };
  modalHostessSelections: { [key: string]: string[] };
  hostessSelectionTarget: VentaHostessTarget | null;
  hostessSubModalVisible: boolean;
  hostessModalVisible: boolean;
  roomModalVisible: boolean;
  clientModalVisible: boolean;
  activeCartIdx: number | null;
  submitting: boolean;
  loadModalVisible: boolean;
  loadingAmount: string;
  loadingTargetClient: Cliente | null;
  loadSubmitting: boolean;
  loadMetodoPago: PaymentMethod;
  metodoPagoAdicional: PaymentMethod;
};

export type VentaAction =
  | { type: 'SET_LOADING_INITIAL'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_INITIAL_DATA'; payload: Partial<VentaState> }
  | { type: 'SET_CART'; payload: VentaCartItem[] }
  | { type: 'SET_SELECTED_CLIENTE'; payload: Cliente | null }
  | { type: 'SET_SELECTED_HABITACION'; payload: Habitacion | null }
  | { type: 'SET_METODO_PAGO'; payload: PaymentMethod }
  | { type: 'SET_PAGOS_MIXTOS'; payload: PagoMixto[] }
  | { type: 'ADD_PAGO_MIXTO'; payload: PagoMixto }
  | { type: 'UPDATE_PAGO_MIXTO'; index: number; monto: number; display?: string }
  | { type: 'REMOVE_PAGO_MIXTO'; index: number }
  | { type: 'SET_ENABLE_TIP'; payload: boolean }
  | { type: 'SET_SELECTED_TIME'; payload: number }
  | { type: 'SET_MODAL_VISIBLE'; modal: string; visible: boolean }
  | { type: 'OPEN_CATEGORY_MODAL'; category: Categoria; products: Producto[] }
  | { type: 'SET_MODAL_LOADING'; payload: boolean }
  | { type: 'SET_MODAL_QUANTITY'; productId: string; quantity: number }
  | { type: 'SET_MODAL_HOSTESSES'; productId: string; hostesses: string[] }
  | { type: 'SET_HOSTESS_TARGET'; target: VentaHostessTarget | null }
  | { type: 'SET_ACTIVE_CART_IDX'; payload: number | null }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_LOAD_MODAL'; visible: boolean; client?: Cliente }
  | { type: 'SET_LOAD_AMOUNT'; payload: string }
  | { type: 'SET_LOAD_SUBMITTING'; payload: boolean }
  | { type: 'SET_LOAD_METODO_PAGO'; payload: PaymentMethod }
  | { type: 'SET_METODO_PAGO_ADICIONAL'; payload: PaymentMethod };
