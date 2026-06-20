import { useCallback } from "react";
import Toast from "react-native-toast-message";
import type { Venta } from "@/components/cajero/ventas/types";
import type { VentasState, VentasAction } from "@/components/cajero/ventas/types";
import { enviarSolicitudAnulacion } from "@/services/ventasService";

export function useVentaAnulacion(
  state: VentasState,
  dispatch: React.Dispatch<VentasAction>,
  refreshVentas: (isManual?: boolean) => Promise<void>,
) {
  const getVentaId = useCallback(
    (venta: Venta): string | number | null => venta?.id ?? venta?.id_venta ?? null,
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

  const handleOpenActionSheet = useCallback(
    (venta: Venta) => {
      dispatch({ type: "SET_ACTIVE_VENTA", payload: venta });
      dispatch({ type: "SET_ACTION_SHEET_VISIBLE", payload: true });
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setActionSheetVisible = useCallback(
    (visible: boolean) =>
      dispatch({ type: "SET_ACTION_SHEET_VISIBLE", payload: visible }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

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
  }, [state.activeVenta, formatMontoInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeAnulacionModal = useCallback(() => {
    if (state.anulandoVenta) return;
    dispatch({ type: "RESET_ANULACION" });
  }, [state.anulandoVenta]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMotivoAnulacion = useCallback(
    (motivo: string) =>
      dispatch({ type: "SET_MOTIVO_ANULACION", payload: motivo }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setMontoAnulacion = useCallback(
    (monto: string) =>
      dispatch({ type: "SET_MONTO_ANULACION", payload: monto }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleAnularVenta = useCallback(async () => {
    if (!state.activeVenta) return;
    const ventaId = getVentaId(state.activeVenta);
    const monto = parseMontoInput(state.montoAnulacion);
    const motivo = state.motivoAnulacion.trim();

    if (!ventaId) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No se pudo identificar la venta.",
      });
      return;
    }

    if (!monto || monto <= 0) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Debes ingresar un monto mayor a 0.",
      });
      return;
    }

    if (monto > Number(state.activeVenta.total || 0)) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "El monto no puede ser mayor al total de la venta.",
      });
      return;
    }

    if (!motivo) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Debes ingresar el motivo de la anulación.",
      });
      return;
    }

    try {
      dispatch({ type: "SET_ANULANDO_VENTA", payload: true });
      const res = await enviarSolicitudAnulacion(ventaId, motivo, monto);

      if (res.success) {
        dispatch({ type: "RESET_ANULACION" });
        Toast.show({
          type: "success",
          text1: "Solicitud Enviada",
          text2:
            "La anulación ha sido solicitada al administrador por WhatsApp.",
        });
        refreshVentas();
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: res.message || "No se pudo solicitar la anulación",
        });
      }
    } catch {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Error al procesar la solicitud de anulación",
      });
    } finally {
      dispatch({ type: "SET_ANULANDO_VENTA", payload: false });
    }
  }, [
    state.activeVenta,
    state.montoAnulacion,
    state.motivoAnulacion,
    getVentaId,
    parseMontoInput,
    refreshVentas,
  ]);

  return {
    actionSheetVisible: state.actionSheetVisible,
    activeVenta: state.activeVenta,
    anulacionModalVisible: state.anulacionModalVisible,
    motivoAnulacion: state.motivoAnulacion,
    montoAnulacion: state.montoAnulacion,
    anulandoVenta: state.anulandoVenta,
    handleOpenActionSheet,
    openAnulacionModal,
    closeAnulacionModal,
    handleAnularVenta,
    setActionSheetVisible,
    setMotivoAnulacion,
    setMontoAnulacion,
    formatMontoInput,
    getVentaId,
  };
}
