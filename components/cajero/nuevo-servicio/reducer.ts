import type { ServiceState, ServiceAction, MetodoPagoMonto } from './types';

export const initialServiceState: ServiceState = {
  loadingInitial: true,
  anfitrionas: [],
  habitaciones: [],
  clientes: [],
  cajaAbierta: null,
  selectedHostesses: [],
  selectedClients: [],
  selectedHabitacion: null,
  precioServicio: '0',
  metodoPago: 'efectivo',
  metodoPagoAdicional: '',
  pagosMixtos: [],
  submitting: false,
  hostessModalVisible: false,
  roomModalVisible: false,
  clientModalVisible: false,
  balanceModalVisible: false,
  balanceAmount: '',
  balanceSubmitting: false,
};

export function serviceReducer(state: ServiceState, action: ServiceAction): ServiceState {
  switch (action.type) {
    case 'SET_LOADING_INITIAL':
      return { ...state, loadingInitial: action.payload };
    case 'SET_INITIAL_DATA':
      return { ...state, ...action.payload };
    case 'SET_SELECTED_HOSTESSES':
      return { ...state, selectedHostesses: action.payload };
    case 'SET_SELECTED_CLIENTS':
      return { ...state, selectedClients: action.payload };
    case 'SET_SELECTED_HABITACION':
      return { ...state, selectedHabitacion: action.payload };
    case 'SET_PRECIO_SERVICIO':
      return { ...state, precioServicio: action.payload };
    case 'SET_METODO_PAGO':
      return { ...state, metodoPago: action.payload };
    case 'SET_METODO_PAGO_ADICIONAL':
      return { ...state, metodoPagoAdicional: action.payload };
    case 'SET_PAGOS_MIXTOS':
      return { ...state, pagosMixtos: action.payload };
    case 'ADD_PAGO_MIXTO':
      return { ...state, pagosMixtos: [...state.pagosMixtos, action.payload] };
    case 'UPDATE_PAGO_MIXTO': {
      const updatedPagos: MetodoPagoMonto[] = [...state.pagosMixtos];
      updatedPagos[action.index] = {
        ...updatedPagos[action.index],
        monto: action.monto,
        display: action.display ?? (action.monto > 0 ? String(action.monto) : ''),
      };
      return { ...state, pagosMixtos: updatedPagos };
    }
    case 'REMOVE_PAGO_MIXTO':
      return { ...state, pagosMixtos: state.pagosMixtos.filter((_, i) => i !== action.index) };
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.payload };
    case 'SET_MODAL_VISIBLE':
      if (action.modal === 'hostess') return { ...state, hostessModalVisible: action.visible };
      if (action.modal === 'room') return { ...state, roomModalVisible: action.visible };
      if (action.modal === 'client') return { ...state, clientModalVisible: action.visible };
      if (action.modal === 'balance') return { ...state, balanceModalVisible: action.visible };
      return state;
    case 'SET_BALANCE_AMOUNT':
      return { ...state, balanceAmount: action.payload };
    case 'SET_BALANCE_SUBMITTING':
      return { ...state, balanceSubmitting: action.payload };
    case 'UPDATE_CLIENT_SALDO':
      return {
        ...state,
        clientes: state.clientes.map((c) =>
          String(c.id_cliente || c.id) === String(action.payload.id)
            ? { ...c, saldo: action.payload.saldo }
            : c,
        ),
      };
    default:
      return state;
  }
}
