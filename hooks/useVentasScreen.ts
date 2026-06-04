import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import Toast from "react-native-toast-message";
import { apiClient } from "@/api/client";
import { useTimer } from "@/context/TimerContext";
import { REALTIME_EVENT_NAMES } from "@/utils/realtime";
import logger from "@/utils/logger";

const initialVentasLoadedRef = { current: false };

export const useVentasScreen = () => {
  const { refreshTimers } = useTimer();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(!initialVentasLoadedRef.current);
  const [refreshing, setRefreshing] = useState(false);
  const [ventas, setVentas] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const dataRef = useRef<string>("");
  const isFocused = useRef(true);
  const [selectedVenta, setSelectedVenta] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const ventasList = Array.isArray(ventas) ? ventas : [];
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [activeVenta, setActiveVenta] = useState<any>(null);
  const [anulacionModalVisible, setAnulacionModalVisible] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [montoAnulacion, setMontoAnulacion] = useState("");
  const [anulandoVenta, setAnulandoVenta] = useState(false);
  const [activeTab, setActiveTab] = useState<"historial" | "proceso">(
    (params.tab as any) === "proceso" ? "proceso" : "historial",
  );
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    confirmText?: string;
  }>({ visible: false, title: "", message: "", type: "info", showCancel: true });

  const showToast = useCallback((
    title: string,
    message: string,
    type: "success" | "error" = "error",
  ) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      visibilityTime: 4000,
    });
  }, []);

  const fetchVentas = useCallback(async (isManual = false) => {
    try {
      if (!isManual && !initialVentasLoadedRef.current) setLoading(true);
      if (isManual) setLoadingSales(true);
      const timestamp = Date.now();
      const [resSales, resResumen] = await Promise.all([
        apiClient(`/sales?limit=50&_t=${timestamp}`).catch(() => ({
          success: false,
          data: [],
        })),
        apiClient(`/sales?tipo=resumen&_t=${timestamp}`).catch(() => ({
          success: false,
          data: null,
        })),
      ]);

      const salesPayload = Array.isArray(resSales.data)
        ? resSales.data
        : Array.isArray(resSales.data?.data)
          ? resSales.data.data
          : [];
      const newData = { sales: salesPayload, resumen: resResumen.data };
      const serialized = JSON.stringify(newData);
      const hasChanges = dataRef.current !== serialized;
      dataRef.current = serialized;

      if (resSales.success) {
        setVentas(salesPayload);
      }
      if (resResumen.success) {
        setResumen(resResumen.data);
      }

      if (isManual) {
        Toast.show({
          type: hasChanges ? "success" : "info",
          text1: hasChanges ? "Éxito" : "Información",
          text2: hasChanges ? "Datos actualizados" : "Sin cambios en los datos",
          visibilityTime: 3000,
        });
      }
      setAlertConfig(prev => ({ ...prev, visible: false }));
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
      initialVentasLoadedRef.current = true;
      setLoading(false);
      setLoadingSales(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => { await fetchVentas(); };
    void run();
  }, [fetchVentas]);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      fetchVentas();
      refreshTimers();
      return () => { isFocused.current = false; };
    }, [fetchVentas, refreshTimers])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(REALTIME_EVENT_NAMES.refreshSales, (data?: any) => {
      logger.info("[VentasScreen] refresh_sales received", data);
      fetchVentas();
      refreshTimers();
    });
    return () => subscription.remove();
  }, [fetchVentas, refreshTimers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVentas(true);
    refreshTimers();
  }, [fetchVentas, refreshTimers]);

  const getVentaId = useCallback((venta: any) => venta?.id ?? venta?.id_venta ?? null, []);
  const formatMontoInput = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("es-CL");
  }, []);
  const parseMontoInput = useCallback((value: string) => Number(value.replace(/\D/g, "") || 0), []);

  const handleOpenActionSheet = useCallback((venta: any) => {
    setActiveVenta(venta);
    setActionSheetVisible(true);
  }, []);

  const openAnulacionModal = useCallback(() => {
    if (!activeVenta) return;
    setActionSheetVisible(false);
    setMotivoAnulacion("");
    setMontoAnulacion(formatMontoInput(String(Math.round(Number(activeVenta.total || 0)))));
    setAnulacionModalVisible(true);
  }, [activeVenta, formatMontoInput]);

  const closeAnulacionModal = useCallback(() => {
    if (anulandoVenta) return;
    setAnulacionModalVisible(false);
    setMotivoAnulacion("");
    setMontoAnulacion("");
  }, [anulandoVenta]);

  const handleVerDetalles = useCallback(async (id: number | string) => {
    setActionSheetVisible(false);
    setLoadingDetail(true);
    setModalVisible(true);
    try {
      const res = await apiClient(`/ventas/${id}`);
      if (res?.success && res.data) {
        setSelectedVenta(res.data);
      } else {
        showToast("Error", res?.message || "No se pudo obtener el detalle de la venta");
        setModalVisible(false);
      }
    } catch (error: any) {
      showToast("Error", error?.message || "Error al cargar detalles");
      setModalVisible(false);
    } finally {
      setLoadingDetail(false);
    }
  }, [showToast]);

  const handleFinalizarVenta = useCallback(async (venta: any) => {
    setAlertConfig({
      visible: true,
      title: "Finalizar Venta",
      message:
        "¿Estás seguro de que deseas finalizar esta venta? Esto liberará la habitación y detendrá el temporizador.",
      type: "danger",
      onConfirm: async () => {
        try {
          const ventaId = getVentaId(venta);
          const res = await apiClient(`/ventas/${ventaId}`, {
            method: "PUT",
            body: JSON.stringify({ estado: 1 }),
          });

          if (res.success || (res && !res.error)) {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            Toast.show({ type: "success", text1: "Venta Finalizada", text2: "La venta ha finalizado con éxito." });
            fetchVentas();
            refreshTimers();
          } else {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            showToast("Error", res.message || res.error || "No se pudo finalizar la venta");
          }
        } catch {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          showToast("Error", "Error al procesar la finalización de la venta");
        }
      },
    });
  }, [fetchVentas, getVentaId, refreshTimers, showToast]);

  const handleAnularVenta = useCallback(async () => {
    if (!activeVenta) return;
    const ventaId = getVentaId(activeVenta);
    const monto = parseMontoInput(montoAnulacion);
    const motivo = motivoAnulacion.trim();

    if (!ventaId) {
      showToast("Error", "No se pudo identificar la venta.");
      return;
    }

    if (!monto || monto <= 0) {
      showToast("Error", "Debes ingresar un monto mayor a 0.");
      return;
    }

    if (monto > Number(activeVenta.total || 0)) {
      showToast("Error", "El monto no puede ser mayor al total de la venta.");
      return;
    }

    if (!motivo) {
      showToast("Error", "Debes ingresar el motivo de la anulación.");
      return;
    }

    try {
      setAnulandoVenta(true);
      const res = await apiClient("/ventas/anulacion", {
        method: "POST",
        body: JSON.stringify({ ventaId, motivo, monto }),
      });
      if (res.success || !res.error) {
        closeAnulacionModal();
        showToast("Solicitud Enviada", "La anulación ha sido solicitada al administrador por WhatsApp.", "success");
        fetchVentas();
      } else {
        showToast("Error", res.message || res.error || "No se pudo solicitar la anulación");
      }
    } catch {
      showToast("Error", "Error al procesar la solicitud de anulación");
    } finally {
      setAnulandoVenta(false);
    }
  }, [activeVenta, closeAnulacionModal, fetchVentas, getVentaId, montoAnulacion, motivoAnulacion, parseMontoInput, showToast]);

  return {
    loading,
    refreshing,
    ventas,
    ventasList,
    resumen,
    loadingSales,
    selectedVenta,
    loadingDetail,
    modalVisible,
    actionSheetVisible,
    activeVenta,
    anulacionModalVisible,
    motivoAnulacion,
    montoAnulacion,
    anulandoVenta,
    activeTab,
    alertConfig,
    onRefresh,
    setActiveTab,
    setActionSheetVisible,
    setModalVisible,
    setSelectedVenta,
    setAnulacionModalVisible,
    setMotivoAnulacion,
    setMontoAnulacion,
    setAlertConfig,
    setRefreshing,
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
