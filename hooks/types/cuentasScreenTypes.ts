import { PaymentMethod } from "@/components/cajero/forms/PaymentMethodSelect";

export type CuentasState = {
  loading: boolean;
  refreshing: boolean;
  cuentas: any[];
  resumen: any;
  selectedCuenta: any;
  loadingDetail: boolean;
  modalVisible: boolean;
  actionSheetVisible: boolean;
  activeCuenta: any;
  activeTab: "historial" | "pendientes";
  search: string;
  cobroModalVisible: boolean;
  cobroMetodoPago: PaymentMethod;
  cobroEnableTip: boolean;
  cobroSubmitting: boolean;
  alertConfig: {
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    onCancel?: () => void;
  };
};

export type CuentasAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_DATA"; payload: Partial<Pick<CuentasState, "cuentas" | "resumen">> }
  | { type: "SET_ACTIVE_TAB"; payload: "historial" | "pendientes" }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_LOADING_DETAIL"; payload: boolean }
  | { type: "SET_SELECTED_CUENTA"; payload: any }
  | { type: "SET_ACTION_SHEET"; visible: boolean; cuenta?: any }
  | { type: "SET_COBRO_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_COBRO_METODO_PAGO"; payload: PaymentMethod }
  | { type: "SET_COBRO_ENABLE_TIP"; payload: boolean }
  | { type: "SET_COBRO_SUBMITTING"; payload: boolean }
  | { type: "SET_ALERT_VISIBLE"; payload: boolean }
  | { type: "SET_ALERT"; payload: CuentasState["alertConfig"] };

export const initialCuentasState = (tab: "historial" | "pendientes"): CuentasState => ({
  loading: true,
  refreshing: false,
  cuentas: [],
  resumen: null,
  selectedCuenta: null,
  loadingDetail: false,
  modalVisible: false,
  actionSheetVisible: false,
  activeCuenta: null,
  activeTab: tab,
  search: "",
  cobroModalVisible: false,
  cobroMetodoPago: "efectivo",
  cobroEnableTip: false,
  cobroSubmitting: false,
  alertConfig: { visible: false, title: "", message: "", type: "info" },
});

export function cuentasReducer(state: CuentasState, action: CuentasAction): CuentasState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_REFRESHING":
      return { ...state, refreshing: action.payload };
    case "SET_DATA":
      return { ...state, ...action.payload };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_MODAL_VISIBLE":
      return { ...state, modalVisible: action.payload };
    case "SET_LOADING_DETAIL":
      return { ...state, loadingDetail: action.payload };
    case "SET_SELECTED_CUENTA":
      return { ...state, selectedCuenta: action.payload };
    case "SET_ACTION_SHEET":
      return { ...state, actionSheetVisible: action.visible, activeCuenta: action.cuenta || null };
    case "SET_COBRO_MODAL_VISIBLE":
      return { ...state, cobroModalVisible: action.payload };
    case "SET_COBRO_METODO_PAGO":
      return { ...state, cobroMetodoPago: action.payload };
    case "SET_COBRO_ENABLE_TIP":
      return { ...state, cobroEnableTip: action.payload };
    case "SET_COBRO_SUBMITTING":
      return { ...state, cobroSubmitting: action.payload };
    case "SET_ALERT_VISIBLE":
      return { ...state, alertConfig: { ...state.alertConfig, visible: action.payload } };
    case "SET_ALERT":
      return { ...state, alertConfig: action.payload };
    default:
      return state;
  }
}
