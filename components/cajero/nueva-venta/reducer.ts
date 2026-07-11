import type { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';
import type { VentaState, VentaAction } from '@/components/cajero/nueva-venta/types';

export const initialVentaState: VentaState = {
  loadingInitial: true,
  refreshing: false,
  anfitrionas: [],
  habitaciones: [],
  clientes: [],
  cajaAbierta: null,
  cart: [],
  selectedCliente: null,
  selectedHabitacion: null,
  metodoPago: 'efectivo',
  pagosMixtos: [],
  enableTip: false,
  selectedTime: 5,
  timeModalVisible: false,
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
  submitting: false,
  loadModalVisible: false,
  loadingAmount: '',
  loadingTargetClient: null,
  loadSubmitting: false,
  loadMetodoPago: 'efectivo',
  metodoPagoAdicional: 'efectivo',
};

export function ventaReducer(state: VentaState, action: VentaAction): VentaState {
  switch (action.type) {
    case 'SET_LOADING_INITIAL':
      return { ...state, loadingInitial: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'SET_INITIAL_DATA':
      return { ...state, ...action.payload };
    case 'SET_CART':
      return { ...state, cart: action.payload };
    case 'SET_SELECTED_CLIENTE': {
      const client = action.payload;
      const hasSaldo = (client?.saldo || 0) > 0;
      return {
        ...state,
        selectedCliente: client,
        metodoPago: hasSaldo ? 'prepago' : 'efectivo',
        pagosMixtos: [],
        metodoPagoAdicional: 'efectivo',
      };
    }
    case 'SET_SELECTED_HABITACION':
      return { ...state, selectedHabitacion: action.payload };
    case 'SET_METODO_PAGO':
      return {
        ...state,
        metodoPago: action.payload,
        pagosMixtos:
          action.payload === 'mixto'
            ? Number(state.selectedCliente?.saldo || 0) > 0
              ? [
                  {
                    metodo: 'prepago' as PaymentMethod,
                    monto: Number(state.selectedCliente?.saldo || 0),
                    display: Number(state.selectedCliente?.saldo || 0).toLocaleString('es-CL'),
                  },
                ]
              : []
            : [],
      };
    case 'SET_PAGOS_MIXTOS':
      return { ...state, pagosMixtos: action.payload };
    case 'ADD_PAGO_MIXTO':
      return { ...state, pagosMixtos: [...state.pagosMixtos, action.payload] };
    case 'UPDATE_PAGO_MIXTO': {
      const updated = [...state.pagosMixtos];
      updated[action.index] = {
        ...updated[action.index],
        monto: action.monto,
        display: action.display ?? (action.monto > 0 ? String(action.monto) : ''),
      };
      return { ...state, pagosMixtos: updated };
    }
    case 'REMOVE_PAGO_MIXTO':
      return { ...state, pagosMixtos: state.pagosMixtos.filter((_, i) => i !== action.index) };
    case 'SET_METODO_PAGO_ADICIONAL':
      return { ...state, metodoPagoAdicional: action.payload };
    case 'SET_ENABLE_TIP':
      return { ...state, enableTip: action.payload };
    case 'SET_SELECTED_TIME':
      return { ...state, selectedTime: action.payload };
    case 'SET_MODAL_VISIBLE':
      return {
        ...state,
        [`${action.modal}ModalVisible`]: action.visible,
        modalOpen: action.modal === 'category' ? action.visible : state.modalOpen,
      };
    case 'OPEN_CATEGORY_MODAL':
      return {
        ...state,
        modalOpen: true,
        modalCategoria: action.category,
        modalProducts: action.products,
        modalQuantities: {},
        modalHostessSelections: {},
      };
    case 'SET_MODAL_LOADING':
      return { ...state, modalLoading: action.payload };
    case 'SET_MODAL_QUANTITY':
      return {
        ...state,
        modalQuantities: { ...state.modalQuantities, [action.productId]: action.quantity },
      };
    case 'SET_MODAL_HOSTESSES':
      return {
        ...state,
        modalHostessSelections: { ...state.modalHostessSelections, [action.productId]: action.hostesses },
      };
    case 'SET_HOSTESS_TARGET':
      return { ...state, hostessSelectionTarget: action.target, hostessSubModalVisible: !!action.target };
    case 'SET_ACTIVE_CART_IDX':
      return { ...state, activeCartIdx: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.payload };
    case 'SET_LOAD_MODAL':
      return { ...state, loadModalVisible: action.visible, loadingTargetClient: action.client || null, loadingAmount: '' };
    case 'SET_LOAD_AMOUNT':
      return { ...state, loadingAmount: action.payload };
    case 'SET_LOAD_SUBMITTING':
      return { ...state, loadSubmitting: action.payload };
    case 'SET_LOAD_METODO_PAGO':
      return { ...state, loadMetodoPago: action.payload };
    default:
      return state;
  }
}
