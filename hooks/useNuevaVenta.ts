import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'expo-router';
import { apiClientSafe } from '@/api/client';
import { useConfigValue } from '@/hooks/useConfigValue';
import { calcularPropina, calcularTotalVenta } from '@lasmunecasderamon/sale-totals';
import { useSales } from '@/context/SalesContext';
import {
  showToast,
  isChampagneProduct,
  getHostessLimit,
  isExpensiveDrink,
  openCategory,
  normalizeRoom,
  normalizeClients,
  normalizeAnfitrionas,
} from '@/hooks/utils/cartUtils';
import logger from '@/utils/logger';
import { ventaReducer, initialVentaState } from '@/components/cajero/nueva-venta/reducer';
import type { VentaState } from '@/components/cajero/nueva-venta/types';

export function useNuevaVenta() {
  const router = useRouter();
  const { refreshVentas } = useSales();
  const [state, dispatch] = useReducer(ventaReducer, initialVentaState);

  const {
    anfitrionas,
    cajaAbierta,
    cart,
    selectedCliente,
    selectedHabitacion,
    metodoPago,
    pagosMixtos,
    enableTip,
    selectedTime,
    modalQuantities,
    modalHostessSelections,
    hostessSelectionTarget,
    loadingAmount,
    loadingTargetClient,
    loadMetodoPago,
  } = state;

  const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (acc, item) => acc + (item.precio || item.price || 0) * (item.quantity || 1),
      0,
    );
    const tip = calcularPropina(subtotal, propinaPct, enableTip);
    const total = calcularTotalVenta({ subtotal, propina: tip });
    return { subtotal, tip, total };
  }, [cart, enableTip, propinaPct]);

  const hasCommissionItem = useMemo(() => {
    return cart.some(
      (item) =>
        Number(item.commission || item.comision || 0) > 0 ||
        isExpensiveDrink(item),
    );
  }, [cart]);

  const fetchInitialData = useCallback(async (isRefreshing = false, signal?: AbortSignal) => {
    if (!isRefreshing) dispatch({ type: 'SET_LOADING_INITIAL', payload: true });
    try {
      const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] =
        await Promise.allSettled([
          apiClientSafe('/cashregister/status', { signal }),
          apiClientSafe('/anfitrionas', { signal }),
          apiClientSafe('/rooms', { signal }),
          apiClientSafe('/clients', { signal }),
          apiClientSafe('/categories', { signal }),
        ]);

      const caja = cajaRes.status === 'fulfilled' ? cajaRes.value : null;
      const anfitrionasVal = anfitrionasRes.status === 'fulfilled' ? anfitrionasRes.value : null;
      const rooms = roomsRes.status === 'fulfilled' ? roomsRes.value : null;
      const clients = clientsRes.status === 'fulfilled' ? clientsRes.value : null;
      const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value : null;

      const fetchedData: Partial<VentaState> = {
        cajaAbierta:
          cajaRes.status === 'fulfilled' ? (caja as any)?.success && (caja as any)?.data?.hasOpenCaja : null,
        anfitrionas: normalizeAnfitrionas(anfitrionasVal),
        habitaciones: ((rooms as any)?.success ? (rooms as any).data : []).map(normalizeRoom),
        categories: (categories as any)?.success ? (categories as any).data || [] : [],
        clientes: normalizeClients(clients),
      };

      dispatch({ type: 'SET_INITIAL_DATA', payload: fetchedData });

      if (cajaRes.status === 'fulfilled' && (!(caja as any)?.success || !(caja as any)?.data?.hasOpenCaja)) {
        showToast('Caja Cerrada', 'Abre una caja primero.');
      }
    } catch (error) {
      logger.captureException(error, { context: 'NuevaVenta:processVenta' });
      showToast('Error', 'No se pudo cargar la información.');
    } finally {
      dispatch({ type: 'SET_LOADING_INITIAL', payload: false });
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchInitialData(false, ac.signal);
    return () => ac.abort();
  }, [fetchInitialData]);

  const onRefresh = useCallback(() => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    fetchInitialData(true);
  }, [fetchInitialData]);

  const handleLoadPrepago = useCallback(async () => {
    if (
      !loadingTargetClient ||
      !loadingAmount ||
      isNaN(Number(loadingAmount)) ||
      Number(loadingAmount) <= 0
    ) {
      showToast('Error', 'Ingrese un monto válido');
      return;
    }

    dispatch({ type: 'SET_LOAD_SUBMITTING', payload: true });
    try {
      const res = await apiClientSafe('/clients/prepago', {
        method: 'POST',
        body: JSON.stringify({
          cliente_id: String(loadingTargetClient.id_cliente || loadingTargetClient.id),
          monto: Number(loadingAmount),
          tipo: 'CARGA',
          metodo_pago: loadMetodoPago,
          motivo: 'Carga de saldo prepago (App)',
        }),
      });

      if ((res as any).success) {
        showToast('Éxito', 'Saldo cargado correctamente', 'success');
        dispatch({ type: 'SET_LOAD_MODAL', visible: false });
        fetchInitialData(true);
        if (
          selectedCliente &&
          String(selectedCliente.id_cliente || selectedCliente.id) ===
            String(loadingTargetClient.id_cliente || loadingTargetClient.id)
        ) {
          dispatch({
            type: 'SET_SELECTED_CLIENTE',
            payload: {
              ...selectedCliente,
              saldo: Number(selectedCliente.saldo || 0) + Number(loadingAmount),
            },
          });
        }
      } else {
        showToast('Error', (res as any).message || 'Error al cargar saldo');
      }
    } catch (error) {
      logger.captureException(error, { context: 'NuevaVenta:submitVenta' });
      showToast('Error', 'Error de conexión');
    } finally {
      dispatch({ type: 'SET_LOAD_SUBMITTING', payload: false });
    }
  }, [loadingTargetClient, loadingAmount, loadMetodoPago, selectedCliente, fetchInitialData]);

  const handleOpenCategory = useCallback(
    (cat: any) => openCategory(cat, dispatch),
    [],
  );

  const addProductToCart = useCallback(
    (prod: any) => {
      const id = prod.id || prod.id_producto;
      const qty = modalQuantities[id] || 1;
      const hostesses = modalHostessSelections[id] || [];
      const newCart = [...cart];

      const itemHostesses = hostesses.length > 0 ? hostesses : [];
      const hostessNames =
        hostesses.length > 0
          ? hostesses
              .map(
                (hId: string) =>
                  anfitrionas.find((a: any) => String(a.id_usuario || a.id) === hId)?.nick || '',
              )
              .filter(Boolean)
              .join(', ')
          : null;

      const existingItemIndex = newCart.findIndex((item) => {
        const itemId = item.id || item.id_producto;
        const currentH = item.anfitrionas || [];
        const sortedCurrent = [...currentH].sort().join(',');
        const sortedNew = [...itemHostesses].sort().join(',');
        return itemId === id && sortedCurrent === sortedNew;
      });

      if (existingItemIndex >= 0) {
        newCart[existingItemIndex].quantity += qty;
      } else {
        newCart.push({
          ...prod,
          quantity: qty,
          anfitrionas: itemHostesses,
          hostessNames: hostessNames || null,
        });
      }

      dispatch({ type: 'SET_CART', payload: newCart });
      showToast('Producto Agregado', `Se agregó ${prod.name || prod.nombre} al carrito`, 'success');
    },
    [cart, modalQuantities, modalHostessSelections, anfitrionas],
  );

  const handlePressAddProduct = useCallback(
    (item: any) => {
      const hasComm =
        Number(item.comision || item.commission || 0) > 0 ||
        isExpensiveDrink(item);

      if (hasComm) {
        dispatch({
          type: 'SET_HOSTESS_TARGET',
          target: {
            productId: item.id || item.id_producto,
            product: item,
            max: getHostessLimit(item),
            isChampagne: isChampagneProduct(item),
          },
        });
        return;
      }

      addProductToCart(item);
    },
    [addProductToCart],
  );

  const removeFromCart = useCallback(
    (index: number) => {
      const newCart = [...cart];
      newCart.splice(index, 1);
      dispatch({ type: 'SET_CART', payload: newCart });
    },
    [cart],
  );

  const updateQuantity = useCallback(
    (index: number, delta: number) => {
      const newCart = [...cart];
      const newQty = Math.max(1, (newCart[index].quantity || 1) + delta);
      newCart[index].quantity = newQty;
      dispatch({ type: 'SET_CART', payload: newCart });
    },
    [cart],
  );

  const handleSubmit = useCallback(async () => {
    if (cajaAbierta === false) return showToast('Error', 'Caja cerrada');
    if (cart.length === 0) return showToast('Error', 'Carrito vacío');

    if (metodoPago === 'mixto') {
      const suma = pagosMixtos.reduce((s, p) => s + p.monto, 0);
      if (Math.abs(suma - totals.total) > 1) {
        return showToast(
          'Monto Incorrecto',
          `La suma ($${suma.toLocaleString()}) debe ser igual al total ($${totals.total.toLocaleString()})`,
        );
      }
      if (pagosMixtos.length < 2) {
        return showToast('Métodos Insuficientes', 'Selecciona al menos 2 métodos de pago');
      }
    }

    if (metodoPago === 'prepago' && !selectedCliente) {
      return showToast('Error', 'Seleccione un cliente para pagar con prepago');
    }

    dispatch({ type: 'SET_SUBMITTING', payload: true });
    try {
      const payload = {
        detalles: cart.map((item: any) => ({
          producto_id: item.id || item.id_producto,
          cantidad: item.quantity || item.cantidad || 1,
          precio: item.precio || item.price || 0,
          sub_total: (item.precio || item.price || 0) * (item.quantity || item.cantidad || 1),
          comision:
            Number(item.comision || item.commission || 0) *
            (item.quantity || item.cantidad || 1),
          hostesses:
            item.anfitrionas?.map((a: any) =>
              typeof a === 'object' ? a.id_usuario || a.id : a,
            ) || [],
        })),
        cliente_id: (selectedCliente?.id?.toString() || selectedCliente?.id_cliente?.toString() || null) as string | null,
        habitacion_id: hasCommissionItem
          ? selectedHabitacion?.id || selectedHabitacion?.id_habitacion || null
          : null,
        metodo_pago: metodoPago,
        pagos_mixtos: metodoPago === 'mixto' ? pagosMixtos : undefined,
        propina: totals.tip,
        sub_total: totals.subtotal,
        total: totals.total,
        tiempo: selectedHabitacion ? selectedTime : 0,
        usuarios: cart.flatMap((item: any) =>
          item.anfitrionas?.map((a: any) =>
            typeof a === 'object' ? a.id_usuario || a.id : a,
          ) || [],
        ),
      };

      const res = await apiClientSafe('/sales', { method: 'POST', body: JSON.stringify(payload) });
      if ((res as any).success) {
        showToast('Éxito', 'Venta realizada', 'success');
        refreshVentas();
        router.replace('/cajero/ventas');
      } else showToast('Error', (res as any).message || 'Error al vender');
    } catch (error) {
      logger.captureException(error, { context: 'NuevaVenta:processVenta' });
      showToast('Error', 'Error de conexión');
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false });
    }
  }, [
    cajaAbierta,
    cart,
    selectedCliente,
    selectedHabitacion,
    metodoPago,
    pagosMixtos,
    totals,
    selectedTime,
    hasCommissionItem,
    router,
    refreshVentas,
  ]);

  const handleToggleHostess = useCallback(
    (id: string) => {
      if (!hostessSelectionTarget) return;
      const pid = hostessSelectionTarget.productId;
      const currentSelected = modalHostessSelections[pid] || [];
      let newSelected: string[];

      if (currentSelected.includes(id)) {
        newSelected = currentSelected.filter((x) => x !== id);
      } else {
        newSelected = [...currentSelected, id];
      }

      dispatch({ type: 'SET_MODAL_HOSTESSES', productId: String(pid), hostesses: newSelected });
    },
    [hostessSelectionTarget, modalHostessSelections],
  );

  return {
    state,
    dispatch,
    totals,
    hasCommissionItem,
    isTablet: false, 
    fetchInitialData,
    onRefresh,
    handleLoadPrepago,
    handleOpenCategory,
    handlePressAddProduct,
    addProductToCart,
    removeFromCart,
    updateQuantity,
    handleSubmit,
    handleToggleHostess,
  };
}
