import type { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';

export type PagoMixto = {
  metodo: PaymentMethod;
  monto: number;
  display: string;
};

export type VentaState = {
  loadingInitial: boolean;
  refreshing: boolean;
  anfitrionas: any[];
  habitaciones: any[];
  clientes: any[];
  cajaAbierta: boolean | null;
  cart: any[];
  selectedCliente: any;
  selectedHabitacion: any;
  metodoPago: PaymentMethod;
  pagosMixtos: PagoMixto[];
  enableTip: boolean;
  selectedTime: number;
  timeModalVisible: boolean;
  categories: any[];
  modalOpen: boolean;
  modalCategoria: any;
  modalProducts: any[];
  modalLoading: boolean;
  modalQuantities: { [key: string]: number };
  modalHostessSelections: { [key: string]: string[] };
  hostessSelectionTarget: { productId: string; isChampagne: boolean; max: number; product?: any } | null;
  hostessSubModalVisible: boolean;
  hostessModalVisible: boolean;
  roomModalVisible: boolean;
  clientModalVisible: boolean;
  activeCartIdx: number | null;
  submitting: boolean;
  loadModalVisible: boolean;
  loadingAmount: string;
  loadingTargetClient: any | null;
  loadSubmitting: boolean;
  loadMetodoPago: PaymentMethod;
  metodoPagoAdicional: PaymentMethod;
};

export type VentaAction =
  | { type: 'SET_LOADING_INITIAL'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_INITIAL_DATA'; payload: any }
  | { type: 'SET_CART'; payload: any[] }
  | { type: 'SET_SELECTED_CLIENTE'; payload: any }
  | { type: 'SET_SELECTED_HABITACION'; payload: any }
  | { type: 'SET_METODO_PAGO'; payload: PaymentMethod }
  | { type: 'SET_PAGOS_MIXTOS'; payload: PagoMixto[] }
  | { type: 'ADD_PAGO_MIXTO'; payload: PagoMixto }
  | { type: 'UPDATE_PAGO_MIXTO'; index: number; monto: number; display?: string }
  | { type: 'REMOVE_PAGO_MIXTO'; index: number }
  | { type: 'SET_ENABLE_TIP'; payload: boolean }
  | { type: 'SET_SELECTED_TIME'; payload: number }
  | { type: 'SET_MODAL_VISIBLE'; modal: string; visible: boolean }
  | { type: 'OPEN_CATEGORY_MODAL'; category: any; products: any[] }
  | { type: 'SET_MODAL_LOADING'; payload: boolean }
  | { type: 'SET_MODAL_QUANTITY'; productId: string; quantity: number }
  | { type: 'SET_MODAL_HOSTESSES'; productId: string; hostesses: string[] }
  | { type: 'SET_HOSTESS_TARGET'; target: any }
  | { type: 'SET_ACTIVE_CART_IDX'; payload: number | null }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_LOAD_MODAL'; visible: boolean; client?: any }
  | { type: 'SET_LOAD_AMOUNT'; payload: string }
  | { type: 'SET_LOAD_SUBMITTING'; payload: boolean }
  | { type: 'SET_LOAD_METODO_PAGO'; payload: PaymentMethod }
  | { type: 'SET_METODO_PAGO_ADICIONAL'; payload: PaymentMethod };
