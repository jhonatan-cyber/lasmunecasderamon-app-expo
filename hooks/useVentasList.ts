import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { DeviceEventEmitter } from "react-native";
import Toast from "react-native-toast-message";
import type { AlertConfig, TabType, Venta } from "@/components/cajero/ventas/types";
import type { VentasState, VentasAction } from "@/components/cajero/ventas/types";
import { useTimer } from "@/context/TimerContext";
import { REALTIME_EVENT_NAMES } from "@/utils/realtime";
import logger from "@/utils/logger";
import {
  fetchSalesList,
  finalizarVenta as finalizarVentaApi,
} from "@/services/ventasService";

export function useVentasList(
  state: VentasState,
  dispatch: React.Dispatch<VentasAction>,
) {
  const { refreshTimers } = useTimer();
  const dataRef = useRef<string>("");

  const fetchVentas = useCallback(async (isManual = false) => {
    try {
      if (isManual) dispatch({ type: "SET_LOADING_SALES", payload: true });

      const { ventas, resumen } = await fetchSalesList();

      const serialized = JSON.stringify({ ventas, resumen });
      const hasChanges = dataRef.current !== serialized;
      dataRef.current = serialized;

      dispatch({ type: "SET_VENTAS", payload: ventas });
      dispatch({ type: "SET_RESUMEN", payload: resumen });

      if (isManual) {
        Toast.show({
          type: hasChanges ? "success" : "info",
          text1: hasChanges ? "Éxito" : "Información",
          text2: hasChanges ? "Datos actualizados" : "Sin cambios en los datos",
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      logger.captureException(error, { context: "Ventas:fetchData" });
      if (isManual) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No se pudo actualizar",
          visibilityTime: 3000,
        });
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_LOADING_SALES", payload: false });
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  
  useEffect(() => {
    void fetchVentas();
  }, [fetchVentas]);

  
  useFocusEffect(
    useCallback(() => {
      fetchVentas();
      refreshTimers();
    }, [fetchVentas, refreshTimers]),
  );

  
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      REALTIME_EVENT_NAMES.refreshSales,
      () => {
        logger.info("[useVentasList] refresh_sales received");
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

  const setActiveTab = useCallback(
    (tab: TabType) => dispatch({ type: "SET_ACTIVE_TAB", payload: tab }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setAlertConfig = useCallback(
    (
      config: AlertConfig | ((prev: AlertConfig) => AlertConfig),
    ) => {
      const resolved =
        typeof config === "function" ? config(state.alertConfig) : config;
      dispatch({ type: "SET_ALERT_CONFIG", payload: resolved });
    },
    [state.alertConfig], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleFinalizarVenta = useCallback(
    (venta: Venta) => {
      const ventaId = venta?.id ?? venta?.id_venta ?? null;
      const alertConfig: AlertConfig = {
        visible: true,
        title: "Finalizar Venta",
        message:
          "¿Estás seguro de que deseas finalizar esta venta? Esto liberará la habitación y detendrá el temporizador.",
        type: "danger",
        onConfirm: async () => {
          try {
            const res = await finalizarVentaApi(ventaId);

            if (res.success) {
              dispatch({ type: "ALERT_DISMISS" });
              Toast.show({
                type: "success",
                text1: "Venta Finalizada",
                text2: "La venta ha finalizado con éxito.",
              });
              fetchVentas();
              refreshTimers();
            } else {
              dispatch({ type: "ALERT_DISMISS" });
              Toast.show({
                type: "error",
                text1: "Error",
                text2: res.message || "No se pudo finalizar la venta",
              });
            }
          } catch {
            dispatch({ type: "ALERT_DISMISS" });
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "Error al procesar la finalización de la venta",
            });
          }
        },
      };
      dispatch({ type: "SET_ALERT_CONFIG", payload: alertConfig });
    },
    [fetchVentas, refreshTimers], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    loading: state.loading,
    refreshing: state.refreshing,
    ventasList: Array.isArray(state.ventas) ? state.ventas : [],
    loadingSales: state.loadingSales,
    activeTab: state.activeTab,
    alertConfig: state.alertConfig,
    onRefresh,
    setActiveTab,
    setAlertConfig,
    handleFinalizarVenta,
    refreshVentas: fetchVentas,
  };
}
