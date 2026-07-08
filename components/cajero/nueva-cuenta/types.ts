import type {
  Habitacion,
  Anfitriona,
  Cliente,
  Producto,
  Categoria,
  CartItem,
} from "@lasmunecasderamon/types";

export interface HostessSelectionTarget {
  productId: number;
  isChampagne: boolean;
  max: number;
  product?: Producto;
}

export interface CuentaState {
  loadingInitial: boolean;
  refreshing: boolean;
  anfitrionas: Anfitriona[];
  habitaciones: Habitacion[];
  clientes: Cliente[];
  cajaAbierta: boolean | null;
  cart: CartItem[];
  selectedCliente: Cliente | null;
  selectedHabitacion: Habitacion | null;
  categories: Categoria[];
  modalOpen: boolean;
  modalCategoria: Categoria | null;
  modalProducts: Producto[];
  modalLoading: boolean;
  modalQuantities: { [key: number]: number };
  modalHostessSelections: { [key: number]: (string | number)[] };
  hostessSelectionTarget: HostessSelectionTarget | null;
  hostessSubModalVisible: boolean;
  hostessModalVisible: boolean;
  roomModalVisible: boolean;
  clientModalVisible: boolean;
  activeCartIdx: number | null;
  selectedTime: number;
  timeModalVisible: boolean;
  submitting: boolean;
}

export type CuentaAction =
  | { type: "SET_LOADING_INITIAL"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_INITIAL_DATA"; payload: Partial<CuentaState> }
  | { type: "SET_CART"; payload: CartItem[] }
  | { type: "SET_SELECTED_CLIENTE"; payload: Cliente | null }
  | { type: "SET_SELECTED_HABITACION"; payload: Habitacion | null }
  | { type: "SET_MODAL_VISIBLE"; modal: string; visible: boolean }
  | { type: "OPEN_CATEGORY_MODAL"; category: Categoria; products: Producto[] }
  | { type: "SET_MODAL_LOADING"; payload: boolean }
  | { type: "SET_MODAL_QUANTITY"; productId: number; quantity: number }
  | {
      type: "SET_MODAL_HOSTESSES";
      productId: number;
      hostesses: (string | number)[];
    }
  | { type: "SET_HOSTESS_TARGET"; target: HostessSelectionTarget | null }
  | { type: "SET_ACTIVE_CART_IDX"; payload: number | null }
  | { type: "SET_SELECTED_TIME"; payload: number }
  | { type: "SET_SUBMITTING"; payload: boolean };

export const initialCuentaState: CuentaState = {
  loadingInitial: true,
  refreshing: false,
  anfitrionas: [],
  habitaciones: [],
  clientes: [],
  cajaAbierta: null,
  cart: [],
  selectedCliente: null,
  selectedHabitacion: null,
  categories: [],
  modalOpen: false,
  modalCategoria: null,
  modalProducts: [],
  modalLoading: false,
  modalQuantities: {},
  modalHostessSelections: {},
  hostessSelectionTarget: null,
  hostessSubModalVisible: false,
  hostessModalVisible: false,
  roomModalVisible: false,
  clientModalVisible: false,
  activeCartIdx: null,
  selectedTime: 5,
  timeModalVisible: false,
  submitting: false,
};
