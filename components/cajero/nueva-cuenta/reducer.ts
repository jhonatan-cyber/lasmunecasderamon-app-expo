import type { CuentaState, CuentaAction } from "./types";

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
    case "SET_SELECTED_CLIENTE":
      return { ...state, selectedCliente: action.payload };
    case "SET_SELECTED_HABITACION":
      return { ...state, selectedHabitacion: action.payload };
    case "SET_MODAL_VISIBLE":
      return {
        ...state,
        [`${action.modal}ModalVisible`]: action.visible,
        modalOpen: action.modal === "category" ? action.visible : state.modalOpen,
      };
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
      return { ...state, hostessSelectionTarget: action.target, hostessSubModalVisible: !!action.target };
    case "SET_ACTIVE_CART_IDX":
      return { ...state, activeCartIdx: action.payload };
    case "SET_SELECTED_TIME":
      return { ...state, selectedTime: action.payload };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.payload };
    default:
      return state;
  }
}
