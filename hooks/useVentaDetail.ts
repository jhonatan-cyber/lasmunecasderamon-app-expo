import { useCallback } from "react";
import Toast from "react-native-toast-message";
import type { VentaDetail } from "@/components/cajero/ventas/types";
import type { VentasState, VentasAction } from "@/components/cajero/ventas/types";
import { fetchVentaDetail } from "@/services/ventasService";

export function useVentaDetail(
  state: VentasState,
  dispatch: React.Dispatch<VentasAction>,
) {
  const handleVerDetalles = useCallback(
    async (id: number | string) => {
      dispatch({ type: "SET_ACTION_SHEET_VISIBLE", payload: false });
      dispatch({ type: "SET_LOADING_DETAIL", payload: true });
      dispatch({ type: "SET_MODAL_VISIBLE", payload: true });

      const detail = await fetchVentaDetail(id);

      if (detail) {
        dispatch({ type: "SET_SELECTED_VENTA", payload: detail });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No se pudo obtener el detalle de la venta",
        });
        dispatch({ type: "SET_MODAL_VISIBLE", payload: false });
      }

      dispatch({ type: "SET_LOADING_DETAIL", payload: false });
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setModalVisible = useCallback(
    (visible: boolean) =>
      dispatch({ type: "SET_MODAL_VISIBLE", payload: visible }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setSelectedVenta = useCallback(
    (venta: VentaDetail | null) =>
      dispatch({ type: "SET_SELECTED_VENTA", payload: venta }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    selectedVenta: state.selectedVenta,
    loadingDetail: state.loadingDetail,
    modalVisible: state.modalVisible,
    handleVerDetalles,
    setModalVisible,
    setSelectedVenta,
  };
}
