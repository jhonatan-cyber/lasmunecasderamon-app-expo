import type { ServiceCreateType } from '@lasmunecasderamon/validations';
import type { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';


export type ServicePayload = ServiceCreateType & {
  codigo: string;
  fecha_crea: string;
  pagos_mixtos?: MetodoPagoMonto[];
  metodo_pago_adicional?: string;
  monto_prepago?: number;
};


export interface MetodoPagoMonto {
  metodo: PaymentMethod;
  monto: number;
  display: string;
}

export type ServiceState = {
  loadingInitial: boolean;
  anfitrionas: any[];
  habitaciones: any[];
  clientes: any[];
  cajaAbierta: boolean | null;
  selectedHostesses: (number | string)[];
  selectedClients: (number | string)[];
  selectedHabitacion: any;
  precioServicio: string;
  metodoPago: PaymentMethod;
  metodoPagoAdicional: PaymentMethod | '';
  pagosMixtos: MetodoPagoMonto[];
  submitting: boolean;
  hostessModalVisible: boolean;
  roomModalVisible: boolean;
  clientModalVisible: boolean;
  balanceModalVisible: boolean;
  balanceAmount: string;
  balanceSubmitting: boolean;
};

export type ServiceAction =
  | { type: 'SET_LOADING_INITIAL'; payload: boolean }
  | { type: 'SET_INITIAL_DATA'; payload: { anfitrionas: any[]; habitaciones: any[]; clientes: any[]; cajaAbierta: boolean } }
  | { type: 'SET_SELECTED_HOSTESSES'; payload: (number | string)[] }
  | { type: 'SET_SELECTED_CLIENTS'; payload: (number | string)[] }
  | { type: 'SET_SELECTED_HABITACION'; payload: any }
  | { type: 'SET_PRECIO_SERVICIO'; payload: string }
  | { type: 'SET_METODO_PAGO'; payload: PaymentMethod }
  | { type: 'SET_METODO_PAGO_ADICIONAL'; payload: PaymentMethod | '' }
  | { type: 'SET_PAGOS_MIXTOS'; payload: MetodoPagoMonto[] }
  | { type: 'ADD_PAGO_MIXTO'; payload: MetodoPagoMonto }
  | { type: 'UPDATE_PAGO_MIXTO'; index: number; monto: number; display?: string }
  | { type: 'REMOVE_PAGO_MIXTO'; index: number }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_MODAL_VISIBLE'; modal: 'hostess' | 'room' | 'client' | 'balance'; visible: boolean }
  | { type: 'SET_BALANCE_AMOUNT'; payload: string }
  | { type: 'SET_BALANCE_SUBMITTING'; payload: boolean }
  | { type: 'UPDATE_CLIENT_SALDO'; payload: { id: string | number; saldo: number } };
