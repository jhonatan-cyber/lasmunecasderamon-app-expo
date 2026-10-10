import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { eventBus } from "@/utils/eventBus";
import { showToast as showToastLazy } from '@/utils/toast-lazy';

import { apiClientSafe } from "@/api/client";
import { cuentasReducer, initialCuentasState, type CuentasState } from "@/hooks/cuentas/cuentasState";
import { useCuentasData } from "@/hooks/cuentas/useCuentasData";
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
import type { CuentaDetalle } from "@/hooks/types/cuentaTypes";

const showToast = (
  title: string,
  message: string,
  type: "success" | "error" | "info" = "error",
) => {
  showToastLazy({ type: type as any, text1: title, text2: message, visibilityTime: 4000 });
};

export const useCuentasScreen = () => {
  const params = useLocalSearchParams();
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

  const { fetchCuentas } = useCuentasData({ refreshing, dispatch, notify: showToast });

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
    const query = search.trim().toLowerCase();
    return cuentas.filter((cuenta) => {
      if (activeTab !== "historial" && Number(cuenta.estado) !== 1) return false;
      if (!query) return true;
      return (
        cuenta.codigo?.toLowerCase().includes(query) ||
        cuenta.cliente_nombre?.toLowerCase().includes(query) ||
        cuenta.habitacion_nombre?.toLowerCase().includes(query) ||
        false
      );
    });
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
