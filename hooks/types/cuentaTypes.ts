export type CuentaState = {
  loadingInitial: boolean;
  refreshing: boolean;
  anfitrionas: any[];
  habitaciones: any[];
  categories: any[];
  cart: any[];
  selectedHabitacion: any;
  selectedTime: number;
  roomModalVisible: boolean;
  modalOpen: boolean;
  modalCategoria: any;
  modalProducts: any[];
  modalLoading: boolean;
  modalQuantities: { [key: number]: number };
  modalHostessSelections: { [key: number]: (string | number)[] };
  hostessSelectionTarget: { productId: number; isChampagne: boolean; max: number; product?: any } | null;
  hostessSubModalVisible: boolean;
  submitting: boolean;
  extraTiempo: number;
  timeModalVisible: boolean;
  cuentaDetalle: any;
};

export type CuentaAction =
  | { type: "SET_LOADING_INITIAL"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_INITIAL_DATA"; payload: any }
  | { type: "SET_CART"; payload: any[] }
  | { type: "SET_MODAL_VISIBLE"; modal: string; visible: boolean }
  | { type: "OPEN_CATEGORY_MODAL"; category: any; products: any[] }
  | { type: "SET_MODAL_LOADING"; payload: boolean }
  | { type: "SET_MODAL_QUANTITY"; productId: number; quantity: number }
  | { type: "SET_MODAL_HOSTESSES"; productId: number; hostesses: (string | number)[] }
  | { type: "SET_HOSTESS_TARGET"; target: any }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_SELECTED_HABITACION"; payload: any }
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
