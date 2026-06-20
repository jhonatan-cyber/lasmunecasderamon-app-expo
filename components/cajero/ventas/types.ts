export type AlertConfig = {
  visible: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "danger";
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  confirmText?: string;
};

export type VentasState = {
  loading: boolean;
  refreshing: boolean;
  ventas: any[];
  resumen: any | null;
  loadingSales: boolean;
  selectedVenta: any | null;
  loadingDetail: boolean;
  modalVisible: boolean;
  actionSheetVisible: boolean;
  activeVenta: any | null;
  anulacionModalVisible: boolean;
  motivoAnulacion: string;
  montoAnulacion: string;
  anulandoVenta: boolean;
  activeTab: "historial" | "proceso";
  alertConfig: AlertConfig;
};

export type VentasAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_VENTAS"; payload: any[] }
  | { type: "SET_RESUMEN"; payload: any }
  | { type: "SET_LOADING_SALES"; payload: boolean }
  | { type: "SET_SELECTED_VENTA"; payload: any | null }
  | { type: "SET_LOADING_DETAIL"; payload: boolean }
  | { type: "SET_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_ACTION_SHEET_VISIBLE"; payload: boolean }
  | { type: "SET_ACTIVE_VENTA"; payload: any | null }
  | { type: "SET_ANULACION_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_MOTIVO_ANULACION"; payload: string }
  | { type: "SET_MONTO_ANULACION"; payload: string }
  | { type: "SET_ANULANDO_VENTA"; payload: boolean }
  | { type: "SET_ACTIVE_TAB"; payload: "historial" | "proceso" }
  | { type: "SET_ALERT_CONFIG"; payload: AlertConfig }
  | { type: "RESET_ANULACION" }
  | { type: "ALERT_DISMISS" };

export const initialVentasState: VentasState = {
  loading: true,
  refreshing: false,
  ventas: [],
  resumen: null,
  loadingSales: false,
  selectedVenta: null,
  loadingDetail: false,
  modalVisible: false,
  actionSheetVisible: false,
  activeVenta: null,
  anulacionModalVisible: false,
  motivoAnulacion: "",
  montoAnulacion: "",
  anulandoVenta: false,
  activeTab: "historial",
  alertConfig: {
    visible: false,
    title: "",
    message: "",
    type: "info",
    showCancel: true,
  },
};

export function ventasReducer(state: VentasState, action: VentasAction): VentasState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_REFRESHING":
      return { ...state, refreshing: action.payload };
    case "SET_VENTAS":
      return { ...state, ventas: action.payload };
    case "SET_RESUMEN":
      return { ...state, resumen: action.payload };
    case "SET_LOADING_SALES":
      return { ...state, loadingSales: action.payload };
    case "SET_SELECTED_VENTA":
      return { ...state, selectedVenta: action.payload };
    case "SET_LOADING_DETAIL":
      return { ...state, loadingDetail: action.payload };
    case "SET_MODAL_VISIBLE":
      return { ...state, modalVisible: action.payload };
    case "SET_ACTION_SHEET_VISIBLE":
      return { ...state, actionSheetVisible: action.payload };
    case "SET_ACTIVE_VENTA":
      return { ...state, activeVenta: action.payload };
    case "SET_ANULACION_MODAL_VISIBLE":
      return { ...state, anulacionModalVisible: action.payload };
    case "SET_MOTIVO_ANULACION":
      return { ...state, motivoAnulacion: action.payload };
    case "SET_MONTO_ANULACION":
      return { ...state, montoAnulacion: action.payload };
    case "SET_ANULANDO_VENTA":
      return { ...state, anulandoVenta: action.payload };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_ALERT_CONFIG":
      return { ...state, alertConfig: action.payload };
    case "RESET_ANULACION":
      return {
        ...state,
        anulacionModalVisible: false,
        motivoAnulacion: "",
        montoAnulacion: "",
      };
    case "ALERT_DISMISS":
      return {
        ...state,
        alertConfig: { ...state.alertConfig, visible: false },
      };
    default:
      return state;
  }
}


export interface Venta {
  id: string | number;
  codigo: string;
  cliente_id: string | number | null;
  cliente_nombre?: string | null;
  habitacion_id: string | number | null;
  habitacion_nombre?: string | null;
  habitacion_numero?: string | null;
  metodo_pago: string;
  propina: number;
  sub_total: number;
  total: number;
  fecha_crea: string;
  estado: number;
  tiempo?: number | null;
  anfitrionas_nicks?: string | null;
  item_count?: number;
  usuarios_nicks?: string | null;
  id_venta?: string | number;
}

export interface VentaDetalle {
  id?: string | number;
  venta_id?: string | number;
  producto_id?: string | number;
  precio: number;
  comision: number;
  cantidad: number;
  sub_total: number;
  producto_nombre?: string;
  producto_foto?: string | null;
  hostess_id?: string | number | null;
  hostess_nick?: string | null;
}

export interface ComisionDetalle {
  foto?: string | null;
  nick: string;
  monto: number;
}

export interface PropinaDetalle {
  foto?: string | null;
  nick: string;
  monto: number;
}

export interface VentaDetail extends Venta {
  detalles: VentaDetalle[];
  comisiones_detalle: ComisionDetalle[];
  propinas_detalle: PropinaDetalle[];
  total_comision: number;
  pedido_id?: string | number | null;
  garzon_nombre?: string | null;
  garzon_nick?: string | null;
  cajero_nombre?: string | null;
  cajero_nick?: string | null;
  vendedor_nombre?: string | null;
  usuarios_nicks?: string | null;
}

export interface VentaResumen {
  total_ventas: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_propinas: number;
  total_comisiones: number;
  ventas_hoy: number;
  ventas_mes: number;
  promedio_venta: number;
}

export type TabType = "historial" | "proceso";
