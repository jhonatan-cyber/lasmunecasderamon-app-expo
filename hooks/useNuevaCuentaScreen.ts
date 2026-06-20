import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useRouter } from "expo-router";
import { apiClient } from "@/api/client";
import { useAccentColor } from "@/hooks/useAccentColor";
import logger from "@/utils/logger";
import { initialCuentaState } from "@/components/cajero/nueva-cuenta/types";
import { cuentaReducer } from "@/components/cajero/nueva-cuenta/reducer";
import {
  showToast,
  isChampagneProduct,
  getHostessLimit,
  buildCommissionPreview,
} from "@/hooks/utils/cuentaUtils";

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

  const bg = theme.isDark ? "#000000" : "#F3F4F6";
  const cardBg = theme.isDark ? "#111111" : "#FFFFFF";
  const textPrimary = theme.isDark ? "#FFFFFF" : "#111827";
  const textSecondary = theme.isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = theme.isDark
    ? `${theme.accentColor}40`
    : "rgba(0,0,0,0.05)";

  const fetchInitialData = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) dispatch({ type: "SET_LOADING_INITIAL", payload: true });
    try {
      const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] =
        await Promise.all([
          apiClient("/cashregister/status"),
          apiClient("/anfitrionas"),
          apiClient("/rooms"),
          apiClient("/clients"),
          apiClient("/categories"),
        ]);

      const rawHabitaciones = roomsRes.success ? roomsRes.data : [];
      const fetchedData: any = {
        cajaAbierta: cajaRes.success && cajaRes.data.hasOpenCaja,
        anfitrionas: Array.isArray(anfitrionasRes)
          ? anfitrionasRes
          : anfitrionasRes.success
            ? anfitrionasRes.data
            : [],
        habitaciones: rawHabitaciones.map((room: any) => ({
          ...room,
          nombre:
            room.nombre ??
            room.name ??
            `Habitación ${room.id_habitacion ?? room.id ?? ""}`.trim(),
          precio: room.precio ?? room.price ?? 0,
          tiempo: room.tiempo ?? room.time ?? 0,
          estado: room.estado ?? room.status ?? 0,
          comision_anfitriona: room.comision_anfitriona ?? 0,
        })),
        categories: categoriesRes.success ? categoriesRes.data || [] : [],
      };

      if (Array.isArray(clientsRes)) {
        fetchedData.clientes = clientsRes;
      } else if (clientsRes && clientsRes.success) {
        fetchedData.clientes = clientsRes.data || [];
      }

      dispatch({ type: "SET_INITIAL_DATA", payload: fetchedData });

      if (!cajaRes.success || !cajaRes.data.hasOpenCaja) {
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

  const handleOpenCategory = useCallback(async (cat: any) => {
    dispatch({ type: "SET_MODAL_LOADING", payload: true });
    dispatch({ type: "SET_MODAL_VISIBLE", modal: "category", visible: true });
    try {
      const res = await apiClient(`/products?category_id=${cat.id}`);
      if (res.success) {
        dispatch({
          type: "OPEN_CATEGORY_MODAL",
          category: cat,
          products: res.data || [],
        });
      } else {
        showToast("Error", "No se pudieron cargar los productos");
      }
    } catch (error) {
      logger.captureException(error, {
        context: "NuevaCuenta:handleOpenCategory",
      });
    } finally {
      dispatch({ type: "SET_MODAL_LOADING", payload: false });
    }
  }, []);

  const addProductToCart = useCallback(
    (prod: any) => {
      const id = prod.id || prod.id_producto;
      const totalQty = state.modalQuantities[id] || 1;
      const selectedHostesses = state.modalHostessSelections[id] || [];

      const price = prod.precio ?? prod.price ?? 0;
      const comm = prod.comision ?? prod.commission ?? 0;

      const newCart = [...state.cart];

      const hostessNames =
        selectedHostesses.length > 0
          ? selectedHostesses
              .map(
                (hId: number | string) =>
                  state.anfitrionas.find(
                    (a: any) => String(a.id_usuario || a.id) === String(hId),
                  )?.nick || "",
              )
              .filter(Boolean)
              .join(", ")
          : null;

      const existingItemIndex = newCart.findIndex((item) => {
        const itemId = item.id_producto || item.id;
        const currentH = item.selectedHostesses || [];
        const sortedCurrent = [...currentH].sort().join(",");
        const sortedNew = [...selectedHostesses].sort().join(",");
        return itemId === id && sortedCurrent === sortedNew;
      });

      if (existingItemIndex >= 0) {
        newCart[existingItemIndex].cantidad += totalQty;
        newCart[existingItemIndex].subtotal =
          price * newCart[existingItemIndex].cantidad;
      } else {
        newCart.push({
          id_producto: id,
          nombre: prod.nombre || prod.name || "Producto",
          precio: price,
          comision: comm,
          cantidad: totalQty,
          subtotal: price * totalQty,
          selectedHostesses: selectedHostesses,
          hostessNames: hostessNames || null,
          isChampagne: isChampagneProduct(prod),
        });
      }

      dispatch({ type: "SET_CART", payload: newCart });
      showToast("Agregado", `${prod.nombre || prod.name} sumado a la cuenta`, "success");
    },
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

      const res = await apiClient("/cuentas", {
        method: "POST",
        body: JSON.stringify(cuentaData),
      });

      if (res.success) {
        showToast("Éxito", "Cuenta registrada correctamente", "success");
        setTimeout(() => router.replace("/cajero/cuentas"), 1500);
      } else {
        showToast("Error", res.message || "No se pudo crear la cuenta");
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
    bg,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor,
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
