import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { eventBus } from "@/utils/eventBus";
import { showToast as showToastLazy } from '@/utils/toast-lazy';
import { apiClientSafe } from "@/api/client";
import {
  getMirror,
  MIRROR_KEYS,
  MIRROR_MAX_AGE_MS,
  OfflineCacheMissError,
} from "@/services/mirror";
import { blockOffline } from "@/utils/offlineGuard";
import { useConnectivity } from "@/hooks/useConnectivity";
import {
  initialVentasState,
  ventasReducer,
  type Venta,
  type VentaDetail,
  type VentaResumen,
} from "@/components/cajero/ventas/types";
import type { AlertConfig } from "@/components/cajero/ventas/types";
import { useTimer } from "@/context/TimerContext";
import { REALTIME_EVENT_NAMES } from "@/utils/realtime";
import logger from "@/utils/logger";

const initialVentasLoadedRef = { current: false };

export const useVentasScreen = () => {
  const { refreshTimers } = useTimer();
  const { isOnline } = useConnectivity();
  const params = useLocalSearchParams();
  /** `true` si el listado que se está viendo viene del espejo local. */
  const [fromCache, setFromCache] = useState(false);
  const initialTab: "historial" | "proceso" =
    (params.tab as any) === "proceso" ? "proceso" : "historial";
  const [state, dispatch] = useReducer(ventasReducer, initialVentasState, () => ({
    ...initialVentasState,
    loading: !initialVentasLoadedRef.current,
    activeTab: initialTab,
  }));
  const dataRef = useRef<string>("");
  const isFocused = useRef(true);

  const showToast = useCallback(
    (title: string, message: string, type: "success" | "error" = "error") => {
      showToastLazy({
        type,
        text1: title,
        text2: message,
        visibilityTime: 4000,
      });
    },
    [],
  );

  const fetchVentas = useCallback(async (isManual = false, signal?: AbortSignal) => {
    try {
      if (!isManual && !initialVentasLoadedRef.current)
        dispatch({ type: "SET_LOADING", payload: true });
      if (isManual) dispatch({ type: "SET_LOADING_SALES", payload: true });
      const timestamp = Date.now();
      // Red primero; sin red se muestra el listado del turno guardado en el
      // dispositivo, con la antigüedad a la vista en la pantalla.
      const [salesResult, resumenResult] = await Promise.all([
        getMirror().readThroughDetailed(
          MIRROR_KEYS.salesList,
          () => apiClientSafe(`/sales?limit=50&_t=${timestamp}`, { signal }),
          { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
        ),
        getMirror()
          .readThroughDetailed(
            MIRROR_KEYS.salesSummary,
            () => apiClientSafe(`/sales?tipo=resumen&_t=${timestamp}`, { signal }),
            { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
          )
          .catch(() => null),
      ]);

      setFromCache(salesResult.fromCache || Boolean(resumenResult?.fromCache));

      const resSales = salesResult.data;
      const resResumen = resumenResult?.data ?? { success: false, data: null };

      const salesPayload: Venta[] = Array.isArray(resSales.data)
        ? (resSales.data as Venta[])
        : Array.isArray((resSales.data as any)?.data)
          ? (resSales.data as any).data as Venta[]
          : [];
      const newData = { sales: salesPayload, resumen: resResumen.data };
      const serialized = JSON.stringify(newData);
      const hasChanges = dataRef.current !== serialized;
      dataRef.current = serialized;

      if (resSales.success) {
        dispatch({ type: "SET_VENTAS", payload: salesPayload });
      }
      if (resResumen.success) {
        dispatch({ type: "SET_RESUMEN", payload: resResumen.data as VentaResumen | null });
      }

      if (isManual) {
        showToastLazy({
          type: hasChanges ? "success" : "info",
          text1: hasChanges ? "Éxito" : "Información",
          text2: hasChanges ? "Datos actualizados" : "Sin cambios en los datos",
          visibilityTime: 3000,
        });
      }
      dispatch({ type: "SET_ALERT_CONFIG", payload: { visible: false, title: "", message: "", type: "info", showCancel: true } });
    } catch (error) {
      logger.captureException(error, { context: "Ventas:fetchData" });
      if (isManual) {
        showToastLazy({
          type: "error",
          text1: "Error",
          text2: "No se pudo actualizar",
          visibilityTime: 3000,
        });
      }
    } finally {
      initialVentasLoadedRef.current = true;
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_LOADING_SALES", payload: false });
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchVentas(false, ac.signal);
    return () => ac.abort();
  }, [fetchVentas]);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      const ac = new AbortController();
      fetchVentas(false, ac.signal);
      refreshTimers();
      return () => {
        isFocused.current = false;
        ac.abort();
      };
    }, [fetchVentas, refreshTimers]),
  );

  useEffect(() => {
    const subscription = eventBus.addListener(
      REALTIME_EVENT_NAMES.refreshSales,
      (data?: any) => {
        logger.debug("[VentasScreen] refresh_sales received", data);
        fetchVentas();
        refreshTimers();
      },
    );
    return () => subscription.remove();
  }, [fetchVentas, refreshTimers]);

  const onRefresh = useCallback(() => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    fetchVentas(true);
    refreshTimers();
  }, [fetchVentas, refreshTimers]);

  const getVentaId = useCallback(
    (venta: any) => venta?.id ?? venta?.id_venta ?? null,
    [],
  );

  const formatMontoInput = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("es-CL");
  }, []);

  const parseMontoInput = useCallback(
    (value: string) => Number(value.replace(/\D/g, "") || 0),
    [],
  );

  const handleOpenActionSheet = useCallback((venta: any) => {
    dispatch({ type: "SET_ACTIVE_VENTA", payload: venta });
    dispatch({ type: "SET_ACTION_SHEET_VISIBLE", payload: true });
  }, []);

  const openAnulacionModal = useCallback(() => {
    if (!state.activeVenta) return;
    dispatch({ type: "SET_ACTION_SHEET_VISIBLE", payload: false });
    dispatch({ type: "SET_MOTIVO_ANULACION", payload: "" });
    dispatch({
      type: "SET_MONTO_ANULACION",
      payload: formatMontoInput(
        String(Math.round(Number(state.activeVenta.total || 0))),
      ),
    });
    dispatch({ type: "SET_ANULACION_MODAL_VISIBLE", payload: true });
  }, [state.activeVenta, formatMontoInput]);

  const closeAnulacionModal = useCallback(() => {
    if (state.anulandoVenta) return;
    dispatch({ type: "RESET_ANULACION" });
  }, [state.anulandoVenta]);

  const handleVerDetalles = useCallback(
    async (id: number | string) => {
      dispatch({ type: "SET_ACTION_SHEET_VISIBLE", payload: false });
      dispatch({ type: "SET_LOADING_DETAIL", payload: true });
      dispatch({ type: "SET_MODAL_VISIBLE", payload: true });
      try {
        // El detalle se espeja por venta, así que sin red se abre con lo último
        // guardado en vez de quedarse en un modal vacío.
        const result = await getMirror().readThroughDetailed<VentaDetail>(
          MIRROR_KEYS.saleDetail(id),
          async () => {
            const res = await apiClientSafe<VentaDetail>(`/sales/${id}`);
            if (!res?.success || !res.data) {
              throw new Error(res?.message || "No se pudo obtener el detalle de la venta");
            }
            return res.data;
          },
          { maxAgeMs: MIRROR_MAX_AGE_MS.dinero },
        );
        dispatch({ type: "SET_SELECTED_VENTA", payload: result.data });
      } catch (error: any) {
        showToast(
          "Error",
          error instanceof OfflineCacheMissError
            ? "Sin conexión y sin detalle guardado de esta venta."
            : error?.message || "Error al cargar detalles",
        );
        dispatch({ type: "SET_MODAL_VISIBLE", payload: false });
      } finally {
        dispatch({ type: "SET_LOADING_DETAIL", payload: false });
      }
    },
    [showToast],
  );

  const handleFinalizarVenta = useCallback(
    (venta: any) => {
      // Finalizar libera la habitación y detiene el temporizador en el servidor.
      if (!blockOffline("temporizador", () => isOnline)) return;

      const alertConfig: AlertConfig = {
        visible: true,
        title: "Finalizar Venta",
        message:
          "¿Estás seguro de que deseas finalizar esta venta? Esto liberará la habitación y detendrá el temporizador.",
        type: "danger",
        onConfirm: async () => {
          try {
            const ventaId = getVentaId(venta);
            const res = await apiClientSafe(`/sales/${ventaId}`, {
              method: "PATCH",
              body: JSON.stringify({ estado: 1 }),
            });

            if (res.success || (res && !res.error)) {
              dispatch({ type: "ALERT_DISMISS" });
              showToastLazy({
                type: "success",
                text1: "Venta Finalizada",
                text2: "La venta ha finalizado con éxito.",
              });
              fetchVentas();
              refreshTimers();
            } else {
              dispatch({ type: "ALERT_DISMISS" });
              showToast(
                "Error",
                res.message || res.error || "No se pudo finalizar la venta",
              );
            }
          } catch {
            dispatch({ type: "ALERT_DISMISS" });
            showToast(
              "Error",
              "Error al procesar la finalización de la venta",
            );
          }
        },
      };
      dispatch({ type: "SET_ALERT_CONFIG", payload: alertConfig });
    },
    [fetchVentas, getVentaId, refreshTimers, showToast, isOnline],
  );

  const handleAnularVenta = useCallback(async () => {
    if (!state.activeVenta) return;
    if (!blockOffline("anulacion", () => isOnline)) return;
    const ventaId = getVentaId(state.activeVenta);
    const monto = parseMontoInput(state.montoAnulacion);
    const motivo = state.motivoAnulacion.trim();

    if (!ventaId) {
      showToast("Error", "No se pudo identificar la venta.");
      return;
    }

    if (!monto || monto <= 0) {
      showToast("Error", "Debes ingresar un monto mayor a 0.");
      return;
    }

    if (monto > Number(state.activeVenta.total || 0)) {
      showToast(
        "Error",
        "El monto no puede ser mayor al total de la venta.",
      );
      return;
    }

    if (!motivo) {
      showToast("Error", "Debes ingresar el motivo de la anulación.");
      return;
    }

    try {
      dispatch({ type: "SET_ANULANDO_VENTA", payload: true });
      const res = await apiClientSafe("/ventas/anulacion", {
        method: "POST",
        body: JSON.stringify({ ventaId, motivo, monto }),
      });
      if (res.success || !res.error) {
        dispatch({ type: "RESET_ANULACION" });
        showToast(
          "Solicitud Enviada",
          "La anulación ha sido solicitada al administrador por WhatsApp.",
          "success",
        );
        fetchVentas();
      } else {
        showToast(
          "Error",
          res.message || res.error || "No se pudo solicitar la anulación",
        );
      }
    } catch {
      showToast("Error", "Error al procesar la solicitud de anulación");
    } finally {
      dispatch({ type: "SET_ANULANDO_VENTA", payload: false });
    }
  }, [
    state.activeVenta,
    state.montoAnulacion,
    state.motivoAnulacion,
    fetchVentas,
    getVentaId,
    parseMontoInput,
    showToast,
    isOnline,
  ]);

  return {
    loading: state.loading,
    refreshing: state.refreshing,
    isOffline: !isOnline,
    fromCache,
    ventas: state.ventas,
    ventasList: Array.isArray(state.ventas) ? state.ventas : [],
    resumen: state.resumen,
    loadingSales: state.loadingSales,
    selectedVenta: state.selectedVenta,
    loadingDetail: state.loadingDetail,
    modalVisible: state.modalVisible,
    actionSheetVisible: state.actionSheetVisible,
    activeVenta: state.activeVenta,
    anulacionModalVisible: state.anulacionModalVisible,
    motivoAnulacion: state.motivoAnulacion,
    montoAnulacion: state.montoAnulacion,
    anulandoVenta: state.anulandoVenta,
    activeTab: state.activeTab,
    alertConfig: state.alertConfig,
    onRefresh,
    setActiveTab: (tab: "historial" | "proceso") =>
      dispatch({ type: "SET_ACTIVE_TAB", payload: tab }),
    setActionSheetVisible: (visible: boolean) =>
      dispatch({ type: "SET_ACTION_SHEET_VISIBLE", payload: visible }),
    setModalVisible: (visible: boolean) =>
      dispatch({ type: "SET_MODAL_VISIBLE", payload: visible }),
    setSelectedVenta: (venta: any | null) =>
      dispatch({ type: "SET_SELECTED_VENTA", payload: venta }),
    setAnulacionModalVisible: (visible: boolean) =>
      dispatch({ type: "SET_ANULACION_MODAL_VISIBLE", payload: visible }),
    setMotivoAnulacion: (motivo: string) =>
      dispatch({ type: "SET_MOTIVO_ANULACION", payload: motivo }),
    setMontoAnulacion: (monto: string) =>
      dispatch({ type: "SET_MONTO_ANULACION", payload: monto }),
    setAlertConfig: (
      config: AlertConfig | ((prev: AlertConfig) => AlertConfig),
    ) =>
      dispatch({
        type: "SET_ALERT_CONFIG",
        payload:
          typeof config === "function"
            ? config(state.alertConfig)
            : config,
      }),
    setRefreshing: (refreshing: boolean) =>
      dispatch({ type: "SET_REFRESHING", payload: refreshing }),
    handleOpenActionSheet,
    handleVerDetalles,
    handleFinalizarVenta,
    handleAnularVenta,
    openAnulacionModal,
    closeAnulacionModal,
    getVentaId,
    formatMontoInput,
    parseMontoInput,
    refreshVentas: fetchVentas,
  };
};
