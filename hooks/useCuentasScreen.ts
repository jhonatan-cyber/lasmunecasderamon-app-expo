import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { eventBus } from "@/utils/eventBus";
import { showToast as showToastLazy } from '@/utils/toast-lazy';

import { apiClientSafe } from "@/api/client";
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS } from "@/services/mirror";
import { getOutbox } from "@/services/outbox";
import { buildCheckoutPayload, describeCheckout } from "@/hooks/utils/checkoutPayload";
import { useConnectivity } from "@/hooks/useConnectivity";
import { blockOffline } from "@/utils/offlineGuard";
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
  /** `true` si las cuentas que se están viendo vienen del espejo local. */
  fromCache: boolean;
  syncedAt: number | null;
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
  cajaAbierta: boolean | null;
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
  | { type: "SET_FROM_CACHE"; payload: { fromCache: boolean; syncedAt: number | null } }
  | { type: "SET_ACTIVE_TAB"; payload: "historial" | "pendientes" }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_LOADING_DETAIL"; payload: boolean }
  | { type: "SET_SELECTED_CUENTA"; payload: CuentaDetalle | null }
  | { type: "SET_ACTION_SHEET"; visible: boolean; cuenta?: CuentaDetalle }
  | { type: "SET_COBRO_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_COBRO_METODO_PAGO"; payload: PaymentMethod }
  | { type: "SET_COBRO_ENABLE_TIP"; payload: boolean }    | { type: "SET_COBRO_SUBMITTING"; payload: boolean }
  | { type: "SET_CAJA_ABIERTA"; payload: boolean | null }
  | { type: "SET_ALERT_VISIBLE"; payload: boolean }
  | { type: "SET_ALERT"; payload: CuentasState["alertConfig"] };

const initialCuentasState = (tab: "historial" | "pendientes"): CuentasState => ({
  loading: true,
  refreshing: false,
  cuentas: [],
  resumen: null,
  fromCache: false,
  syncedAt: null,
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
  cajaAbierta: null,
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
    case "SET_FROM_CACHE":
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
    case "SET_CAJA_ABIERTA":
      return { ...state, cajaAbierta: action.payload };
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
  const { isOffline } = useConnectivity();
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
    fromCache,
    syncedAt,
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
    cajaAbierta,
    alertConfig,
  } = state;

  const fetchCuentas = useCallback(
    async (isManual = false, signal?: AbortSignal) => {
      try {
        if (isManual && !refreshing) {
          dispatch({ type: "SET_LOADING", payload: true });
        }

        const timestamp = Date.now();
        // Red primero; sin red se muestran las cuentas guardadas en el
        // dispositivo (con su antigüedad a la vista), que es lo único que
        // permite trabajar en el salón cuando se cae la conexión.
        const [cuentasResult, resumenResult, cajaResult] = await Promise.all([
          getMirror().readThroughDetailed(
            MIRROR_KEYS.openAccounts,
            () => apiClientSafe(`/cuentas?limit=50&_t=${timestamp}`, { signal }),
            { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
          ),
          getMirror().readThroughDetailed(
            MIRROR_KEYS.accountsSummary,
            () => apiClientSafe(`/cuentas?tipo=resumen&_t=${timestamp}`, { signal }),
            { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
          ),
          // Estado de caja para bloquear el cobro (paridad con el dashboard).
          // Con error queda `null`: estado desconocido, no bloquea.
          getMirror()
            .readThroughDetailed(
              MIRROR_KEYS.cashregisterStatus,
              () => apiClientSafe('/cashregister/status', { signal }),
              { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
            )
            .catch(() => null),
        ]);

        dispatch({
          type: "SET_FROM_CACHE",
          payload: {
            fromCache: cuentasResult.fromCache || resumenResult.fromCache,
            syncedAt: cuentasResult.syncedAt,
          },
        });

        const resCuentas = cuentasResult.data;
        const resResumen = resumenResult.data;
        const resCaja = cajaResult?.data ?? null;

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

        if (
          resCaja &&
          typeof resCaja === 'object' &&
          'success' in resCaja &&
          (resCaja as { success?: boolean }).success &&
          typeof (resCaja as { data?: { hasOpenCaja?: boolean } }).data?.hasOpenCaja === 'boolean'
        ) {
          dispatch({
            type: "SET_CAJA_ABIERTA",
            payload: Boolean((resCaja as { data: { hasOpenCaja: boolean } }).data.hasOpenCaja),
          });
        }

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

    // Revalida el estado de caja justo al abrir el modal (el cobro escribe en
    // caja): si el cajero abrió/cerró caja desde otra pantalla, el modal lo
    // refleja sin esperar al próximo refresco de la lista.
    apiClientSafe('/cashregister/status')
      .then((res) => {
        const data = (res as { success?: boolean; data?: { hasOpenCaja?: boolean } })?.data;
        if ((res as { success?: boolean })?.success && typeof data?.hasOpenCaja === 'boolean') {
          dispatch({ type: "SET_CAJA_ABIERTA", payload: data.hasOpenCaja });
        }
      })
      .catch(() => null);
  }, []);

  const fetchCuentaCompleta = useCallback(async (cuentaId: string | number) => {
    const timestamp = Date.now();
    const result = await getMirror().readThroughDetailed<CuentaDetalle>(
      MIRROR_KEYS.accountDetail(cuentaId),
      async () => {
        // `GET /cuentas/:id` responde la cuenta cruda (sin el sobre `success`).
        const res = await apiClientSafe<CuentaDetalle>(`/cuentas/${cuentaId}?_t=${timestamp}`);
        if (!res || res.error) {
          throw new Error(res?.message || "No se pudo obtener el detalle completo de la cuenta");
        }
        return res as unknown as CuentaDetalle;
      },
      { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
    );
    return result.data;
  }, []);

  const handleConfirmarCobro = useCallback(async () => {
    if (!selectedCuenta) return;

    // Guard de caja cerrada (paridad con el dashboard y nueva venta): aunque el
    // botón quede deshabilitado, se revalida antes de encolar. La caja abierta
    // también la exige el servidor al aplicar el cobro.
    if (state.cajaAbierta === false) {
      showToast("Caja Cerrada", "No se pueden realizar ventas sin una caja abierta.", "error");
      return;
    }

    if (cobroMetodoPago === "prepago") {
      const saldo = Number(selectedCuenta.cliente_saldo || 0);
      if (saldo < cobroTotals.total) {
        showToast("Saldo Insuficiente", "El saldo del cliente es menor al total de la cuenta", "error");
        return;
      }
    }

    dispatch({ type: "SET_COBRO_SUBMITTING", payload: true });
    try {
      // El servidor cierra la cuenta y factura en UNA transacción
      // (`POST /cuentas/:id/cobrar-con-venta`), así que esto viaja como una sola
      // intención de la cola: sin red queda guardado en el dispositivo y sale al
      // reconectar, y si el envío se corta a medias, el servidor revierte todo
      // junto o no revierte nada.
      const intent = await getOutbox().enqueueAndSend({
        type: "account.checkout",
        payload: buildCheckoutPayload({
          cuentaId: selectedCuenta.id_cuenta,
          metodoPago: cobroMetodoPago,
          // Base de la cuenta: la propina va por separado (el backend la suma al
          // bucket correspondiente; evita duplicarla en la caja).
          subtotal: cobroTotals.subtotal,
          propina: cobroTotals.tip,
          habitacionId: selectedCuenta.habitacion_id || null,
        }),
        label: describeCheckout({ codigo: selectedCuenta.codigo, total: cobroTotals.total }),
      });

      if (intent.status === "fallida") {
        showToast("Error", intent.lastError || "Error al cobrar", "error");
        return;
      }

      dispatch({ type: "SET_COBRO_MODAL_VISIBLE", payload: false });

      if (intent.status === "aplicada") {
        showToast("Éxito", "Cuenta cobrada correctamente", "success");
      } else {
        // Quedó pendiente: el cobro está guardado y sale al volver la red.
        showToast(
          "Cobro guardado en el dispositivo",
          "Se enviará automáticamente cuando vuelva la conexión",
          "info",
        );
      }

      fetchCuentas();
    } catch (error) {
      logger.captureException(error, { context: "useCuentasScreen:handleConfirmarCobro" });
      showToast("Error", "Error de conexión al procesar el cobro");
    } finally {
      dispatch({ type: "SET_COBRO_SUBMITTING", payload: false });
    }
  }, [
    cobroMetodoPago,
    cobroTotals.tip,
    cobroTotals.total,
    cobroTotals.subtotal,
    fetchCuentas,
    selectedCuenta,
    state.cajaAbierta,
  ]);

  const handleFinalizarTemporizador = useCallback(
    (cuenta: CuentaDetalle) => {
      // El temporizador lo lleva el servidor y los demás dispositivos lo ven por
      // SSE: sin red no se puede finalizar (se avisa antes de abrir el modal).
      if (!blockOffline("temporizador", () => !isOffline)) return;

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
    [fetchCuentas, refreshTimers, isOffline],
  );

  const handleSolicitarAnulacion = useCallback((cuenta: CuentaDetalle) => {
    if (!blockOffline("anulacion", () => !isOffline)) return;

    dispatch({ type: "SET_ACTION_SHEET", visible: false });
    setAnulacionCuenta(cuenta);
    setAnulacionMotivo("");
    setAnulacionMonto(formatAmountInput(String(Number(cuenta?.total || 0))));
    setAnulacionModalVisible(true);
  }, [isOffline]);

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

  const handleVerDetalles = useCallback(
    async (id: string) => {
      dispatch({ type: "SET_ACTION_SHEET", visible: false });
      dispatch({ type: "SET_LOADING_DETAIL", payload: true });
      dispatch({ type: "SET_MODAL_VISIBLE", payload: true });
      try {
        // Con espejo: sin red se muestra el detalle guardado de esa cuenta en
        // vez de un modal vacío.
        const cuenta = await fetchCuentaCompleta(id);
        dispatch({ type: "SET_SELECTED_CUENTA", payload: cuenta });
      } catch {
        showToast("Error", "No se pudo obtener el detalle de la cuenta");
        dispatch({ type: "SET_MODAL_VISIBLE", payload: false });
      } finally {
        dispatch({ type: "SET_LOADING_DETAIL", payload: false });
      }
    },
    [fetchCuentaCompleta],
  );

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
    isOffline,
    fromCache,
    syncedAt,
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
    cajaAbierta,
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
