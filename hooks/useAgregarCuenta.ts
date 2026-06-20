import { useCallback, useEffect, useMemo, useReducer } from "react";
import { DeviceEventEmitter } from "react-native";
import { useRouter } from "expo-router";
import { apiClient } from "@/api/client";
import { useTimer } from "@/context/TimerContext";
import logger from "@/utils/logger";
import { CuentaState, CuentaAction, initialCuentaState, cuentaReducer } from "@/hooks/types/cuentaTypes";
import { showToast, buildCommissionPreview, isChampagneProduct, getChampagneLimit, getHostessLimit } from "@/hooks/utils/cuentaUtils";

export type { CuentaState, CuentaAction };
export { initialCuentaState, cuentaReducer, showToast, isChampagneProduct, getChampagneLimit, getHostessLimit, buildCommissionPreview };

export function useAgregarCuenta(cuentaOriginal: any) {
  const router = useRouter();
  const { timers, refreshTimers } = useTimer();
  const [state, dispatch] = useReducer(cuentaReducer, initialCuentaState);

  const {
    loadingInitial,
    refreshing,
    anfitrionas,
    habitaciones,
    categories,
    modalOpen,
    modalCategoria,
    modalProducts,
    modalLoading,
    modalQuantities,
    modalHostessSelections,
    hostessSelectionTarget,
    hostessSubModalVisible,
    cart,
    submitting,
    extraTiempo,
    timeModalVisible,
    cuentaDetalle,
    selectedHabitacion,
    selectedTime,
    roomModalVisible,
  } = state;

  const hasRoom = !!cuentaOriginal?.habitacion_id;
  const accountHostessIds = useMemo(() => {
    return (cuentaDetalle?.usuarios || [])
      .map((u: any) => u.usuario_id || u.id_usuario)
      .filter(Boolean) as number[];
  }, [cuentaDetalle]);

  const showRoomSelector = useMemo(() => {
    return cart.some((item) => item.selectedHostesses && item.selectedHostesses.length > 0);
  }, [cart]);

  const fetchInitialData = useCallback(
    async (isRefreshing = false) => {
      if (!isRefreshing) dispatch({ type: "SET_LOADING_INITIAL", payload: true });
      try {
        const requests: Promise<any>[] = [
          apiClient("/anfitrionas"),
          apiClient("/categories"),
          apiClient("/rooms"),
        ];
        if (cuentaOriginal?.id_cuenta) {
          requests.push(apiClient(`/cuentas/${cuentaOriginal.id_cuenta}`));
        }
        const [anfitrionasRes, categoriesRes, roomsRes, cuentaDetalleRes] = await Promise.all(requests);

        const rawHabitaciones = roomsRes?.success ? roomsRes.data : [];
        dispatch({
          type: "SET_INITIAL_DATA",
          payload: {
            anfitrionas: Array.isArray(anfitrionasRes)
              ? anfitrionasRes
              : anfitrionasRes.success
                ? anfitrionasRes.data
                : [],
            categories: categoriesRes.success ? categoriesRes.data || [] : [],
            habitaciones: rawHabitaciones.map((room: any) => ({
              ...room,
              nombre: room.nombre ?? room.name ?? `Habitación ${room.id_habitacion ?? room.id ?? ""}`.trim(),
              precio: room.precio ?? room.price ?? 0,
              tiempo: room.tiempo ?? room.time ?? 0,
              estado: room.estado ?? room.status ?? 0,
            })),
            cuentaDetalle: cuentaDetalleRes || null,
          },
        });
      } catch (error) {
        logger.captureException(error, { context: "AgregarCuenta:fetchInitialData" });
        showToast("Error", "No se pudo cargar la información necesaria.");
      } finally {
        dispatch({ type: "SET_LOADING_INITIAL", payload: false });
        dispatch({ type: "SET_REFRESHING", payload: false });
      }
    },
    [cuentaOriginal],
  );

  useEffect(() => {
    fetchInitialData();
    if (!cuentaOriginal) {
      showToast("Error", "No se recibió la información de la cuenta");
      router.back();
    }
  }, [fetchInitialData, cuentaOriginal, router]);

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
        dispatch({ type: "OPEN_CATEGORY_MODAL", category: cat, products: res.data || [] });
      } else {
        showToast("Error", "No se pudieron cargar los productos");
      }
    } catch (error) {
      logger.captureException(error, { context: "AgregarCuenta:handleOpenCategory" });
    } finally {
      dispatch({ type: "SET_MODAL_LOADING", payload: false });
    }
  }, []);

  const addProductToCart = useCallback(
    (prod: any) => {
      const id = prod.id || prod.id_producto;
      const totalQty = modalQuantities[id] || 1;
      const selectedHostesses = modalHostessSelections[id] || [];
      const price = prod.precio ?? prod.price ?? 0;
      const comm = prod.comision ?? prod.commission ?? 0;
      const newCart = [...cart];
      const hostessNames =
        selectedHostesses.length > 0
          ? selectedHostesses
              .map((hId: number | string) => anfitrionas.find((a: any) => String(a.id_usuario || a.id) === String(hId))?.nick || "")
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
        newCart[existingItemIndex].subtotal = price * newCart[existingItemIndex].cantidad;
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
    [cart, modalQuantities, modalHostessSelections, anfitrionas],
  );

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    return { subtotal, total: subtotal + (cuentaOriginal?.total || 0) };
  }, [cart, cuentaOriginal]);

  const commissionPreview = useMemo(() => buildCommissionPreview(cart, anfitrionas), [cart, anfitrionas]);

  const handleSubmit = useCallback(async () => {
    if (cart.length === 0) {
      showToast("Error", "No has agregado nuevos productos.");
      return;
    }
    dispatch({ type: "SET_SUBMITTING", payload: true });
    try {
      const originalUserIds = (cuentaDetalle?.usuarios || [])
        .map((u: any) => u.usuario_id || u.id_usuario)
        .filter(Boolean) as number[];
      const mergedHostessIds = new Set<number>(originalUserIds);
      cart.forEach((item) => {
        if (item.selectedHostesses && Array.isArray(item.selectedHostesses)) {
          item.selectedHostesses.forEach((hId: number) => {
            if (hId) mergedHostessIds.add(hId);
          });
        }
      });
      const hasExistingTimer = timers.some(
        (timer) => timer.tipoTransaccion === "cuenta" && String(timer.servicioId) === String(cuentaOriginal.id_cuenta),
      );
      const currentRoomId = cuentaDetalle?.habitacion_id || cuentaOriginal?.habitacion_id || null;
      const roomIdToUse = selectedHabitacion?.id_habitacion || selectedHabitacion?.id || null;
      const timeToUse = selectedHabitacion ? selectedTime : 0;
      const isSameRoomSelection =
        Boolean(roomIdToUse) && Boolean(currentRoomId) && String(roomIdToUse) === String(currentRoomId);
      const cuentaData: any = {
        detalles: cart.map((item) => ({
          producto_id: item.id_producto || item.id,
          precio: item.precio,
          cantidad: item.cantidad,
          sub_total: item.precio * item.cantidad,
          comision: item.comision * (item.cantidad || 1),
          hostesses: item.selectedHostesses || [],
          isChampagne: item.isChampagne,
        })),
        usuarios: Array.from(mergedHostessIds),
      };
      if (extraTiempo > 0 && hasRoom) {
        cuentaData.extraTiempo = extraTiempo;
      }
      if (isSameRoomSelection && timeToUse > 0) {
        cuentaData.extraTiempo = Number(cuentaData.extraTiempo || 0) + timeToUse;
      } else if (!hasExistingTimer && roomIdToUse && timeToUse > 0) {
        cuentaData.habitacion_id = roomIdToUse;
        cuentaData.tiempo = timeToUse;
      } else if (selectedHabitacion) {
        cuentaData.habitacion_id = selectedHabitacion.id_habitacion || selectedHabitacion.id;
        cuentaData.tiempo = selectedTime;
      }
      refreshTimers?.();
      const res = await apiClient(`/cuentas/${cuentaOriginal.id_cuenta}`, {
        method: "PUT",
        body: JSON.stringify(cuentaData),
      });
      if (res.success) {
        showToast("Éxito", "Productos agregados correctamente", "success");
        DeviceEventEmitter.emit("refresh_cuentas");
        setTimeout(() => router.back(), 1500);
      } else {
        showToast("Error", res.message || "No se pudo actualizar la cuenta");
      }
    } catch (error) {
      logger.captureException(error, { context: "AgregarCuenta:handleSubmit" });
      showToast("Error", "Ocurrió un error al procesar la cuenta.");
    } finally {
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  }, [
    cart,
    cuentaOriginal,
    router,
    extraTiempo,
    hasRoom,
    cuentaDetalle,
    selectedHabitacion,
    selectedTime,
    timers,
    refreshTimers,
  ]);

  const uniqueHostesses = useMemo(() => {
    return Array.from(
      new Map(anfitrionas.map((a: any) => [String(a.id_usuario || a.id), a])).values(),
    ).map((a: any) => ({
      id: a.id_usuario || a.id,
      id_usuario: a.id_usuario || a.id,
      nick: a.nick,
      status: a.status || 0,
    }));
  }, [anfitrionas]);

  const selectedHostessIds = useMemo(() => {
    return hostessSelectionTarget
      ? (modalHostessSelections[hostessSelectionTarget.productId] || [])
      : [];
  }, [hostessSelectionTarget, modalHostessSelections]);

  const handleToggleHostess = useCallback((id: string | number) => {
    if (!hostessSelectionTarget) return;
    const pid = hostessSelectionTarget.productId;
    const currentSelected = modalHostessSelections[pid] || [];
    let newSelected;
    const strId = String(id);
    if (currentSelected.some((x) => String(x) === strId)) {
      newSelected = currentSelected.filter((x) => String(x) !== strId);
    } else {
      if (hostessSelectionTarget.max && currentSelected.length >= hostessSelectionTarget.max)
        return;
      newSelected = [...currentSelected, strId];
    }
    dispatch({ type: "SET_MODAL_HOSTESSES", productId: pid, hostesses: newSelected });
  }, [hostessSelectionTarget, modalHostessSelections]);

  const handleConfirmHostess = useCallback(() => {
    if (hostessSelectionTarget) {
      const pid = hostessSelectionTarget.productId;
      const hasComm =
        Number(
          hostessSelectionTarget.product.comision ||
            hostessSelectionTarget.product.commission ||
            0,
        ) > 0;
      const currentSelected = modalHostessSelections[pid] || [];
      if (hasComm && currentSelected.length === 0) return;
      addProductToCart(hostessSelectionTarget.product);
      dispatch({ type: "SET_HOSTESS_TARGET", target: null });
      dispatch({ type: "SET_MODAL_VISIBLE", modal: "category", visible: false });
    }
  }, [hostessSelectionTarget, modalHostessSelections, addProductToCart]);

  const handleCloseHostessModal = useCallback(() => {
    dispatch({ type: "SET_HOSTESS_TARGET", target: null });
  }, []);

  const handleSelectRoom = useCallback((room: any) => {
    dispatch({ type: "SET_SELECTED_HABITACION", payload: room });
    dispatch({ type: "SET_ROOM_MODAL_VISIBLE", payload: false });
  }, []);

  const handleCloseRoomModal = useCallback(() => {
    dispatch({ type: "SET_ROOM_MODAL_VISIBLE", payload: false });
  }, []);

  return {
    loadingInitial,
    refreshing,
    anfitrionas,
    habitaciones,
    categories,
    modalOpen,
    modalCategoria,
    modalProducts,
    modalLoading,
    modalQuantities,
    modalHostessSelections,
    hostessSelectionTarget,
    hostessSubModalVisible,
    cart,
    submitting,
    extraTiempo,
    timeModalVisible,
    cuentaDetalle,
    selectedHabitacion,
    selectedTime,
    roomModalVisible,
    hasRoom,
    accountHostessIds,
    showRoomSelector,
    onRefresh,
    handleOpenCategory,
    addProductToCart,
    totals,
    commissionPreview,
    handleSubmit,
    dispatch,
    uniqueHostesses,
    selectedHostessIds,
    handleToggleHostess,
    handleConfirmHostess,
    handleCloseHostessModal,
    handleSelectRoom,
    handleCloseRoomModal,
  };
}
