export interface CuentaState {
  loadingInitial: boolean;
  refreshing: boolean;
  anfitrionas: any[];
  habitaciones: any[];
  clientes: any[];
  cajaAbierta: boolean | null;
  cart: any[];
  selectedCliente: any;
  selectedHabitacion: any;
  categories: any[];
  modalOpen: boolean;
  modalCategoria: any;
  modalProducts: any[];
  modalLoading: boolean;
  modalQuantities: { [key: number]: number };
  modalHostessSelections: { [key: number]: (string | number)[] };
  hostessSelectionTarget: {
    productId: number;
    isChampagne: boolean;
    max: number;
    product?: any;
  } | null;
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
  | { type: "SET_INITIAL_DATA"; payload: any }
  | { type: "SET_CART"; payload: any[] }
  | { type: "SET_SELECTED_CLIENTE"; payload: any }
  | { type: "SET_SELECTED_HABITACION"; payload: any }
  | { type: "SET_MODAL_VISIBLE"; modal: string; visible: boolean }
  | { type: "OPEN_CATEGORY_MODAL"; category: any; products: any[] }
  | { type: "SET_MODAL_LOADING"; payload: boolean }
  | { type: "SET_MODAL_QUANTITY"; productId: number; quantity: number }
  | {
      type: "SET_MODAL_HOSTESSES";
      productId: number;
      hostesses: (string | number)[];
    }
  | { type: "SET_HOSTESS_TARGET"; target: any }
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
