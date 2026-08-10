import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { eventBus } from "@/utils/eventBus";
import { showToast as showToastLazy } from '@/utils/toast-lazy';

import { apiClientSafe } from "@/api/client";
import { useConfigValue } from "@/hooks/useConfigValue";
import { calcularPropina } from '@lasmunecasderamon/sale-totals';
import { PaymentMethod } from "@/components/cajero/forms/PaymentMethodSelect";
import { useTimer } from "@/context/TimerContext";
import { formatAmountInput, parseAmountInput } from "@/utils/money";
import logger from "@/utils/logger";
import type { CuentaDetalle, CuentaResumen } from "@/hooks/types/cuentaTypes";

type CuentasState = {
  loading: boolean;
  refreshing: boolean;
  cuentas: CuentaDetalle[];
  resumen: CuentaResumen | null;
  selectedCuenta: CuentaDetalle | null;
  loadingDetail: boolean;
  modalVisible: boolean;
  actionSheetVisible: boolean;
  activeCuenta: CuentaDetalle | null;
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

type CuentasAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_DATA"; payload: Partial<Pick<CuentasState, "cuentas" | "resumen">> }
  | { type: "SET_ACTIVE_TAB"; payload: "historial" | "pendientes" }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_LOADING_DETAIL"; payload: boolean }
  | { type: "SET_SELECTED_CUENTA"; payload: CuentaDetalle | null }
  | { type: "SET_ACTION_SHEET"; visible: boolean; cuenta?: CuentaDetalle }
  | { type: "SET_COBRO_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_COBRO_METODO_PAGO"; payload: PaymentMethod }
  | { type: "SET_COBRO_ENABLE_TIP"; payload: boolean }
  | { type: "SET_COBRO_SUBMITTING"; payload: boolean }
  | { type: "SET_ALERT_VISIBLE"; payload: boolean }
  | { type: "SET_ALERT"; payload: CuentasState["alertConfig"] };

const initialCuentasState = (tab: "historial" | "pendientes"): CuentasState => ({
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

function cuentasReducer(state: CuentasState, action: CuentasAction): CuentasState {
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
      return {
        ...state,
        actionSheetVisible: action.visible,
        activeCuenta: action.cuenta || null,
      };
    case "SET_COBRO_MODAL_VISIBLE":
      return { ...state, cobroModalVisible: action.payload };
    case "SET_COBRO_METODO_PAGO":
      return { ...state, cobroMetodoPago: action.payload };
    case "SET_COBRO_ENABLE_TIP":
      return { ...state, cobroEnableTip: action.payload };
    case "SET_COBRO_SUBMITTING":
      return { ...state, cobroSubmitting: action.payload };
    case "SET_ALERT_VISIBLE":
      return {
        ...state,
        alertConfig: { ...state.alertConfig, visible: action.payload },
      };
    case "SET_ALERT":
      return { ...state, alertConfig: action.payload };
    default:
      return state;
  }
}

const showToast = (
  title: string,
  message: string,
  type: "success" | "error" | "info" = "error",
) => {
  showToastLazy({ type: type as any, text1: title, text2: message, visibilityTime: 4000 });
};

export const useCuentasScreen = () => {
  const params = useLocalSearchParams();
  const dataRef = useRef<string>("");
  const { timers, serverOffset, refreshTimers } = useTimer();
  const [anulacionModalVisible, setAnulacionModalVisible] = useState(false);
  const [anulacionCuenta, setAnulacionCuenta] = useState<CuentaDetalle | null>(null);
  const [anulacionMotivo, setAnulacionMotivo] = useState("");
  const [anulacionMonto, setAnulacionMonto] = useState("");
  const [anulacionSubmitting, setAnulacionSubmitting] = useState(false);

  const [state, dispatch] = useReducer(
    cuentasReducer,
    initialCuentasState(params.tab as string === "pendientes" ? "pendientes" : "historial"),
  );

  const {
    loading,
    refreshing,
    cuentas,
    resumen,
    selectedCuenta,
    loadingDetail,
    modalVisible,
    actionSheetVisible,
    activeCuenta,
    activeTab,
    search,
    cobroModalVisible,
    cobroMetodoPago,
    cobroEnableTip,
    cobroSubmitting,
    alertConfig,
  } = state;

  const fetchCuentas = useCallback(
    async (isManual = false, signal?: AbortSignal) => {
      try {
        if (isManual && !refreshing) {
          dispatch({ type: "SET_LOADING", payload: true });
        }

        const timestamp = Date.now();
        const [resCuentas, resResumen] = await Promise.all([
          apiClientSafe(`/cuentas?limit=50&_t=${timestamp}`, { signal }),
          apiClientSafe(`/cuentas?tipo=resumen&_t=${timestamp}`, { signal }),
        ]);

        const actualCuentas: CuentaDetalle[] = Array.isArray(resCuentas.data)
          ? (resCuentas.data as CuentaDetalle[])
          : Array.isArray(resCuentas)
            ? (resCuentas as unknown as CuentaDetalle[])
            : [];
        const actualResumen: CuentaResumen | null =
          (resResumen.data as CuentaResumen | null) ||
          ("total_por_cobrar" in resResumen
            ? (resResumen as unknown as CuentaResumen)
            : null);

        const newData = { cuentas: actualCuentas, resumen: actualResumen };
        const serialized = JSON.stringify(newData);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;

        dispatch({
          type: "SET_DATA",
          payload: {
            cuentas: actualCuentas,
            resumen: actualResumen,
          },
        });

        if (isManual) {
          showToast(
            hasChanges ? "Éxito" : "Información",
            hasChanges ? "Datos actualizados" : "Sin cambios",
            hasChanges ? "success" : "info",
          );
        }
      } catch (error) {
        logger.captureException(error, { context: "Cuentas:fetchCuentas" });
        if (isManual) showToast("Error", "No se pudo actualizar");
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({ type: "SET_REFRESHING", payload: false });
      }
    },
    [refreshing],
  );

  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));

  const cobroTotals = useMemo(() => {
    if (!selectedCuenta) return { subtotal: 0, tip: 0, total: 0 };
    const subtotal = selectedCuenta.total || 0;
    const tip = calcularPropina(subtotal, propinaPct, cobroEnableTip);
    return { subtotal, tip, total: subtotal + tip };
  }, [selectedCuenta, cobroEnableTip, propinaPct]);

  const cobroClienteNombreCompleto = useMemo(() => {
    const nombre = String(selectedCuenta?.cliente_nombre || "").trim();
    const apellido = String(selectedCuenta?.cliente_apellido || "").trim();
    return [nombre, apellido].filter(Boolean).join(" ").trim() || "Sin registrar";
  }, [selectedCuenta?.cliente_apellido, selectedCuenta?.cliente_nombre]);

  const cobroClienteSaldo = Number(selectedCuenta?.cliente_saldo || 0);
  const showPrepagoCobro = !!selectedCuenta?.cliente_id && cobroClienteSaldo > 0;

  useEffect(() => {
    if (cobroModalVisible && !showPrepagoCobro && cobroMetodoPago === "prepago") {
      dispatch({ type: "SET_COBRO_METODO_PAGO", payload: "efectivo" });
    }
  }, [cobroMetodoPago, cobroModalVisible, showPrepagoCobro]);

  useFocusEffect(
    useCallback(() => {
      const ac = new AbortController();
      fetchCuentas(false, ac.signal);
      refreshTimers?.();
      return () => ac.abort();
    }, [fetchCuentas, refreshTimers]),
  );

  useEffect(() => {
    const sub = eventBus.addListener("refresh_cuentas", () => {
      fetchCuentas();
    });
    return () => sub.remove();
  }, [fetchCuentas]);

  const onRefresh = useCallback(() => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    void Promise.all([fetchCuentas(true), refreshTimers?.()]);
  }, [fetchCuentas, refreshTimers]);

  const handleCobrarCuenta = useCallback((cuenta: CuentaDetalle) => {
    dispatch({ type: "SET_ACTION_SHEET", visible: false });
    dispatch({ type: "SET_SELECTED_CUENTA", payload: cuenta });
    dispatch({ type: "SET_COBRO_MODAL_VISIBLE", payload: true });
    dispatch({ type: "SET_COBRO_METODO_PAGO", payload: "efectivo" });
    dispatch({ type: "SET_COBRO_ENABLE_TIP", payload: false });
  }, []);

  const fetchCuentaCompleta = useCallback(async (cuentaId: string | number) => {
    const timestamp = Date.now();
    const res = await apiClientSafe(`/cuentas/${cuentaId}?_t=${timestamp}`);
    if (!res || res.error) {
      throw new Error(res?.message || "No se pudo obtener el detalle completo de la cuenta");
    }
    return res as unknown as CuentaDetalle;
  }, []);

  const registrarVentaDesdeCuenta = useCallback(
    async (cuenta: CuentaDetalle) => {
      const ventaPayload = {
        origen: "cuenta",
        skip_client_prepago: true,
        cliente_id: cuenta?.cliente_id != null ? String(cuenta.cliente_id) : null,
        pedido_id: cuenta?.pedido_id != null ? String(cuenta.pedido_id) : null,
        metodo_pago: cobroMetodoPago,
        propina: cobroTotals.tip,
        sub_total: Number(cuenta?.sub_total ?? 0),
        total: Number(cobroTotals.total ?? cuenta?.total ?? 0),
        total_comision: Number(cuenta?.total_comision ?? 0),
        codigo: cuenta?.codigo,
        detalles:
          cuenta?.detalles?.map((d) => ({
            producto_id: String(d.producto_id ?? d.id),
            precio: Number(d.precio ?? 0),
            cantidad: Number(d.cantidad ?? 1),
            sub_total: Number(d.sub_total ?? 0),
            comision: Number(d.comision ?? 0),
            hostess_id: d.hostess_id != null ? String(d.hostess_id) : null,
          })) || [],
        usuarios: cuenta?.usuarios?.map((u) => String(u.usuario_id ?? u.id_usuario ?? u)) || [],
      };

      return await apiClientSafe("/sales", {
        method: "POST",
        body: JSON.stringify(ventaPayload),
      });
    },
    [cobroMetodoPago, cobroTotals.tip, cobroTotals.total],
  );

  const handleConfirmarCobro = useCallback(async () => {
    if (!selectedCuenta) return;

    if (cobroMetodoPago === "prepago") {
      const saldo = Number(selectedCuenta.cliente_saldo || 0);
      if (saldo < cobroTotals.total) {
        showToast("Saldo Insuficiente", "El saldo del cliente es menor al total de la cuenta", "error");
        return;
      }
    }

    dispatch({ type: "SET_COBRO_SUBMITTING", payload: true });
    try {
      const payload = {
        cuenta_id: selectedCuenta.id_cuenta,
        metodo_pago: cobroMetodoPago,
        propina: cobroTotals.tip,
        // Base de la cuenta: la propina va por separado (el backend la suma al
        // bucket correspondiente; evita duplicarla en la caja).
        total_cobrado: cobroTotals.subtotal,
        habitacion_id: selectedCuenta.habitacion_id || null,
      };

      const res = await apiClientSafe(`/cuentas/${selectedCuenta.id_cuenta}/cobrar`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        const cuentaCompleta = await fetchCuentaCompleta(selectedCuenta.id_cuenta);
        const ventaRes = await registrarVentaDesdeCuenta(cuentaCompleta);
        if (!ventaRes.success) {
          showToast(
            "Error",
            ventaRes.message || "La cuenta se cobró, pero no se pudo registrar la venta",
            "error",
          );
          return;
        }
        dispatch({ type: "SET_COBRO_MODAL_VISIBLE", payload: false });
        showToast("Éxito", "Cuenta cobrada correctamente", "success");
        fetchCuentas();
      } else {
        showToast("Error", res.message || "Error al cobrar");
      }
    } catch {
      showToast("Error", "Error de conexión al procesar el cobro");
    } finally {
      dispatch({ type: "SET_COBRO_SUBMITTING", payload: false });
    }
  }, [
    cobroMetodoPago,
    cobroTotals.tip,
    cobroTotals.total,
    fetchCuentas,
    fetchCuentaCompleta,
    registrarVentaDesdeCuenta,
    selectedCuenta,
  ]);

  const handleFinalizarTemporizador = useCallback(
    (cuenta: CuentaDetalle) => {
      dispatch({
        type: "SET_ALERT",
        payload: {
          visible: true,
          title: "Finalizar temporizador",
          message: `Se finalizará el temporizador de la cuenta ${cuenta?.codigo}.`,
          type: "warning",
          onConfirm: async () => {
            try {
              dispatch({ type: "SET_ALERT_VISIBLE", payload: false });
              dispatch({ type: "SET_ACTION_SHEET", visible: false });
              const res = await apiClientSafe(`/cuentas/${cuenta.id_cuenta}/stop`, {
                method: "PATCH",
              });
              if (res.success) {
                showToast("Éxito", "Temporizador finalizado", "success");
                refreshTimers?.();
                fetchCuentas();
              } else {
                showToast("Error", res.message || "No se pudo finalizar el temporizador");
              }
            } catch {
              showToast("Error", "Error al finalizar el temporizador");
            }
          },
          onCancel: () => dispatch({ type: "SET_ALERT_VISIBLE", payload: false }),
        },
      });
    },
    [fetchCuentas, refreshTimers],
  );

  const handleSolicitarAnulacion = useCallback((cuenta: CuentaDetalle) => {
    dispatch({ type: "SET_ACTION_SHEET", visible: false });
    setAnulacionCuenta(cuenta);
    setAnulacionMotivo("");
    setAnulacionMonto(formatAmountInput(String(Number(cuenta?.total || 0))));
    setAnulacionModalVisible(true);
  }, []);

  const handleEnviarSolicitudAnulacion = useCallback(async () => {
    if (!anulacionCuenta) return;

    const motivo = anulacionMotivo.trim();
    const monto = parseAmountInput(anulacionMonto);
    if (!motivo) {
      showToast("Motivo requerido", "Debes ingresar el motivo de la anulación");
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      showToast("Monto inválido", "Debes ingresar un monto mayor a 0");
      return;
    }
    if (monto > Number(anulacionCuenta.total || 0)) {
      showToast("Monto inválido", "El monto no puede ser mayor al total de la cuenta");
      return;
    }

    try {
      setAnulacionSubmitting(true);
      const res = await apiClientSafe("/cuentas/anulacion", {
        method: "POST",
        body: JSON.stringify({
          cuentaId: anulacionCuenta.id_cuenta,
          clienteNombre: anulacionCuenta.cliente_nombre || "",
          motivo,
          monto,
        }),
      });

      if (res.success) {
        setAnulacionModalVisible(false);
        setAnulacionCuenta(null);
        setAnulacionMotivo("");
        setAnulacionMonto("");
        showToast("Éxito", "La anulación fue solicitada por WhatsApp", "success");
        fetchCuentas();
      } else {
        showToast("Error", res.message || "No se pudo solicitar la anulación");
      }
    } catch {
      showToast("Error", "Error al solicitar la anulación");
    } finally {
      setAnulacionSubmitting(false);
    }
  }, [anulacionCuenta, anulacionMotivo, anulacionMonto, fetchCuentas]);

  const handleVerDetalles = useCallback(async (id: string) => {
    dispatch({ type: "SET_ACTION_SHEET", visible: false });
    dispatch({ type: "SET_LOADING_DETAIL", payload: true });
    dispatch({ type: "SET_MODAL_VISIBLE", payload: true });
    try {
      const timestamp = Date.now();
      const res = await apiClientSafe(`/cuentas/${id}?_t=${timestamp}`);
      if (res && !res.error) {
        dispatch({ type: "SET_SELECTED_CUENTA", payload: res as unknown as CuentaDetalle });
      } else {
        showToast("Error", "No se pudo obtener el detalle de la cuenta");
        dispatch({ type: "SET_MODAL_VISIBLE", payload: false });
      }
    } catch {
      showToast("Error", "Error de conexión al cargar detalles");
      dispatch({ type: "SET_MODAL_VISIBLE", payload: false });
    } finally {
      dispatch({ type: "SET_LOADING_DETAIL", payload: false });
    }
  }, []);

  const filteredCuentas = useMemo(() => {
    let list = activeTab === "historial" ? cuentas : cuentas.filter((c) => Number(c.estado) === 1);
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.codigo && c.codigo.toLowerCase().includes(query)) ||
          (c.cliente_nombre && c.cliente_nombre.toLowerCase().includes(query)) ||
          (c.habitacion_nombre && c.habitacion_nombre.toLowerCase().includes(query)),
      );
    }
    return list;
  }, [cuentas, activeTab, search]);

  const pendingCount = useMemo(
    () => cuentas.filter((c) => Number(c.estado) === 1).length,
    [cuentas],
  );

  return {
    loading,
    refreshing,
    cuentas,
    resumen,
    selectedCuenta,
    loadingDetail,
    modalVisible,
    actionSheetVisible,
    activeCuenta,
    activeTab,
    search,
    cobroModalVisible,
    cobroMetodoPago,
    cobroEnableTip,
    cobroSubmitting,
    alertConfig,
    anulacionModalVisible,
    anulacionCuenta,
    anulacionMotivo,
    anulacionMonto,
    anulacionSubmitting,
    filteredCuentas,
    pendingCount,
    timers,
    serverOffset,
    refreshTimers,
    cobroClienteNombreCompleto,
    cobroClienteSaldo,
    showPrepagoCobro,
    cobroTotals,
    setActiveTab: (value: "historial" | "pendientes") =>
      dispatch({ type: "SET_ACTIVE_TAB", payload: value }),
    setSearch: (value: string) => dispatch({ type: "SET_SEARCH", payload: value }),
    setModalVisible: (value: boolean) => dispatch({ type: "SET_MODAL_VISIBLE", payload: value }),
    setSelectedCuenta: (value: CuentaDetalle | null) => dispatch({ type: "SET_SELECTED_CUENTA", payload: value }),
    setActionSheetVisible: (value: boolean, cuenta?: CuentaDetalle) =>
      dispatch({ type: "SET_ACTION_SHEET", visible: value, cuenta }),
    setCobroModalVisible: (value: boolean) =>
      dispatch({ type: "SET_COBRO_MODAL_VISIBLE", payload: value }),
    setCobroMetodoPago: (value: PaymentMethod) =>
      dispatch({ type: "SET_COBRO_METODO_PAGO", payload: value }),
    setCobroEnableTip: (value: boolean) =>
      dispatch({ type: "SET_COBRO_ENABLE_TIP", payload: value }),
    setAlertVisible: (value: boolean) => dispatch({ type: "SET_ALERT_VISIBLE", payload: value }),
    setAlertConfig: (value: CuentasState["alertConfig"]) => dispatch({ type: "SET_ALERT", payload: value }),
    setAnulacionModalVisible,
    setAnulacionCuenta,
    setAnulacionMotivo,
    setAnulacionMonto,
    setAnulacionSubmitting,
    onRefresh,
    fetchCuentas,
    handleCobrarCuenta,
    handleConfirmarCobro,
    handleFinalizarTemporizador,
    handleSolicitarAnulacion,
    handleEnviarSolicitudAnulacion,
    handleVerDetalles,
  };
};
