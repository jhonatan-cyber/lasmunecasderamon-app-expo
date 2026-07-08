import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useRouter } from "expo-router";
import { apiClientSafe } from "@/api/client";
import { useAccentColor } from "@/hooks/useAccentColor";
import logger from "@/utils/logger";
import type { Categoria, Producto } from "@lasmunecasderamon/types";
import { initialCuentaState, type CuentaState } from "@/components/cajero/nueva-cuenta/types";
import { cuentaReducer } from "@/components/cajero/nueva-cuenta/reducer";
import {
  showToast,
  openCategory,
  addProductToCartUtils,
  buildCommissionPreview,
  isChampagneProduct,
  getHostessLimit,
  normalizeRoom,
  normalizeClients,
  normalizeAnfitrionas,
} from "@/hooks/utils/cartUtils";

export type { CuentaState, CuentaAction } from "@/components/cajero/nueva-cuenta/types";
export { getHostessLimit, buildCommissionPreview, isChampagneProduct };

const generateCodigo = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export function useNuevaCuentaScreen() {
  const theme = useAccentColor();
  const router = useRouter();

  const [state, dispatch] = useReducer(cuentaReducer, initialCuentaState);
  const {
    anfitrionas,
    cajaAbierta,
    cart,
    selectedCliente,
    selectedHabitacion,
  } = state;

  const fetchInitialData = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) dispatch({ type: "SET_LOADING_INITIAL", payload: true });
    try {
      const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] =
        await Promise.all([
          apiClientSafe("/cashregister/status"),
          apiClientSafe("/anfitrionas"),
          apiClientSafe("/rooms"),
          apiClientSafe("/clients"),
          apiClientSafe("/categories"),
        ]);

      const fetchedData: Partial<CuentaState> & { cajaAbierta: boolean | null } = {
        cajaAbierta: (cajaRes as any).success && (cajaRes as any).data?.hasOpenCaja,
        anfitrionas: normalizeAnfitrionas(anfitrionasRes),
        habitaciones: ((roomsRes as any).success ? (roomsRes as any).data : []).map(normalizeRoom),
        categories: (categoriesRes as any).success ? (categoriesRes as any).data || [] : [],
        clientes: normalizeClients(clientsRes),
      };

      dispatch({ type: "SET_INITIAL_DATA", payload: fetchedData });

      if (!(cajaRes as any).success || !(cajaRes as any).data?.hasOpenCaja) {
        showToast("Caja Cerrada", "Debes abrir una caja antes de registrar consumos.", "error");
      }
    } catch (error) {
      logger.captureException(error, { context: "NuevaCuenta:createCuenta" });
      showToast("Error", "No se pudo cargar la información necesaria.");
    } finally {
      dispatch({ type: "SET_LOADING_INITIAL", payload: false });
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const onRefresh = useCallback(() => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    fetchInitialData(true);
  }, [fetchInitialData]);

  const handleOpenCategory = useCallback(
    (cat: Categoria) => openCategory(cat, dispatch),
    [],
  );

  const addProductToCart = useCallback(
    (prod: Producto) =>
      addProductToCartUtils(
        prod,
        state.cart,
        state.modalQuantities,
        state.modalHostessSelections,
        state.anfitrionas,
        dispatch,
      ),
    [state.cart, state.modalQuantities, state.modalHostessSelections, state.anfitrionas],
  );

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (acc, item) => acc + item.precio * item.cantidad,
      0,
    );
    const totalComision = cart.reduce(
      (acc, item) => acc + item.comision * item.cantidad,
      0,
    );
    return { subtotal, totalComision, total: subtotal };
  }, [cart]);

  const commissionPreview = useMemo(
    () => buildCommissionPreview(cart, anfitrionas),
    [cart, anfitrionas],
  );

  const handleSubmit = useCallback(async () => {
    if (!cajaAbierta) {
      showToast("Error", "La caja está cerrada.");
      return;
    }
    if (!selectedCliente) {
      showToast("Error", "Debes seleccionar un cliente.");
      return;
    }
    if (cart.length === 0) {
      showToast("Error", "La cuenta está vacía.");
      return;
    }

    dispatch({ type: "SET_SUBMITTING", payload: true });
    try {
      const selectedRoomId =
        selectedHabitacion?.id_habitacion || selectedHabitacion?.id || null;
      const selectedRoomTime = Number(
        selectedHabitacion?.tiempo ?? selectedHabitacion?.time ?? 0,
      );
      const selectedRoomCommission = Number(
        selectedHabitacion?.comision_anfitriona || 0,
      );

      const cuentaData = {
        codigo: generateCodigo(),
        cliente_id: selectedCliente?.id || selectedCliente?.id_cliente,
        habitacion_id: selectedRoomId,
        tiempo: selectedRoomId
          ? selectedRoomCommission === 0
            ? state.selectedTime
            : selectedRoomTime
          : 0,
        total_comision: totals.totalComision,
        sub_total: totals.subtotal,
        total: totals.total,
        detalles: cart.map((item) => ({
          producto_id: item.id_producto || item.id,
          precio: item.precio,
          cantidad: item.cantidad,
          sub_total: item.precio * item.cantidad,
          comision: item.comision * (item.cantidad || 1),
          hostesses: item.selectedHostesses,
          isChampagne: item.isChampagne,
        })),
        usuarios: [
          ...new Set(
            cart
              .flatMap((item) => item.selectedHostesses || [])
              .filter((h) => h !== null),
          ),
        ],
      };

      const res = await apiClientSafe("/cuentas", {
        method: "POST",
        body: JSON.stringify(cuentaData),
      });

      if ((res as any).success) {
        showToast("Éxito", "Cuenta registrada correctamente", "success");
        setTimeout(() => router.replace("/cajero/cuentas"), 1500);
      } else {
        showToast("Error", (res as any).message || "No se pudo crear la cuenta");
      }
    } catch (error) {
      logger.captureException(error, { context: "NuevaCuenta:createCuenta" });
      showToast("Error", "Ocurrió un error al procesar la cuenta.");
    } finally {
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  }, [
    cajaAbierta,
    selectedCliente,
    selectedHabitacion,
    cart,
    totals,
    router,
    state.selectedTime,
  ]);

  return {
    ...theme,
    ...state,
    dispatch,
    onRefresh,
    handleOpenCategory,
    addProductToCart,
    totals,
    commissionPreview,
    handleSubmit,
    isChampagneProduct,
  };
}
