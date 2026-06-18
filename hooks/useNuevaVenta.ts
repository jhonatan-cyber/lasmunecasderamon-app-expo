import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'expo-router';
import { apiClient } from '@/api/client';
import type { PaymentMethod } from '@/components/cajero/forms/PaymentMethodSelect';
import { useSales } from '@/context/SalesContext';
import {
  type VentaState,
  type VentaAction,
} from '@/components/cajero/nueva-venta/types';
import {
  showToast,
  isChampagneProduct,
  getHostessLimit,
} from '@/components/cajero/nueva-venta/helpers';
import logger from '@/utils/logger';

export const initialVentaState: VentaState = {
  loadingInitial: true,
  refreshing: false,
  anfitrionas: [],
  habitaciones: [],
  clientes: [],
  cajaAbierta: null,
  cart: [],
  selectedCliente: null,
  selectedHabitacion: null,
  metodoPago: 'efectivo',
  pagosMixtos: [],
  enableTip: false,
  selectedTime: 5,
  timeModalVisible: false,
  categories: [],
  modalOpen: false,
  modalCategoria: null,
  modalProducts: [],
  modalLoading: false,
  modalQuantities: {},
  modalHostessSelections: {},
  hostessSelectionTarget: null,
  hostessSubModalVisible: false,
  hostessModalVisible: false,
  roomModalVisible: false,
  clientModalVisible: false,
  activeCartIdx: null,
  submitting: false,
  loadModalVisible: false,
  loadingAmount: '',
  loadingTargetClient: null,
  loadSubmitting: false,
  loadMetodoPago: 'efectivo',
  metodoPagoAdicional: 'efectivo',
};

function ventaReducer(state: VentaState, action: VentaAction): VentaState {
  switch (action.type) {
    case 'SET_LOADING_INITIAL':
      return { ...state, loadingInitial: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'SET_INITIAL_DATA':
      return { ...state, ...action.payload };
    case 'SET_CART':
      return { ...state, cart: action.payload };
    case 'SET_SELECTED_CLIENTE': {
      const client = action.payload;
      const hasSaldo = (client?.saldo || 0) > 0;
      return {
        ...state,
        selectedCliente: client,
        metodoPago: hasSaldo ? 'prepago' : 'efectivo',
        pagosMixtos: [],
        metodoPagoAdicional: 'efectivo',
      };
    }
    case 'SET_SELECTED_HABITACION':
      return { ...state, selectedHabitacion: action.payload };
    case 'SET_METODO_PAGO':
      return {
        ...state,
        metodoPago: action.payload,
        pagosMixtos:
          action.payload === 'mixto'
            ? Number(state.selectedCliente?.saldo || 0) > 0
              ? [
                  {
                    metodo: 'prepago' as PaymentMethod,
                    monto: Number(state.selectedCliente.saldo),
                    display: Number(state.selectedCliente.saldo).toLocaleString('es-CL'),
                  },
                ]
              : []
            : [],
      };
    case 'SET_PAGOS_MIXTOS':
      return { ...state, pagosMixtos: action.payload };
    case 'ADD_PAGO_MIXTO':
      return { ...state, pagosMixtos: [...state.pagosMixtos, action.payload] };
    case 'UPDATE_PAGO_MIXTO': {
      const updated = [...state.pagosMixtos];
      updated[action.index] = {
        ...updated[action.index],
        monto: action.monto,
        display: action.display ?? (action.monto > 0 ? String(action.monto) : ''),
      };
      return { ...state, pagosMixtos: updated };
    }
    case 'REMOVE_PAGO_MIXTO':
      return { ...state, pagosMixtos: state.pagosMixtos.filter((_, i) => i !== action.index) };
    case 'SET_METODO_PAGO_ADICIONAL':
      return { ...state, metodoPagoAdicional: action.payload };
    case 'SET_ENABLE_TIP':
      return { ...state, enableTip: action.payload };
    case 'SET_SELECTED_TIME':
      return { ...state, selectedTime: action.payload };
    case 'SET_MODAL_VISIBLE':
      return {
        ...state,
        [`${action.modal}ModalVisible`]: action.visible,
        modalOpen: action.modal === 'category' ? action.visible : state.modalOpen,
      };
    case 'OPEN_CATEGORY_MODAL':
      return {
        ...state,
        modalOpen: true,
        modalCategoria: action.category,
        modalProducts: action.products,
        modalQuantities: {},
        modalHostessSelections: {},
      };
    case 'SET_MODAL_LOADING':
      return { ...state, modalLoading: action.payload };
    case 'SET_MODAL_QUANTITY':
      return {
        ...state,
        modalQuantities: { ...state.modalQuantities, [action.productId]: action.quantity },
      };
    case 'SET_MODAL_HOSTESSES':
      return {
        ...state,
        modalHostessSelections: { ...state.modalHostessSelections, [action.productId]: action.hostesses },
      };
    case 'SET_HOSTESS_TARGET':
      return { ...state, hostessSelectionTarget: action.target, hostessSubModalVisible: !!action.target };
    case 'SET_ACTIVE_CART_IDX':
      return { ...state, activeCartIdx: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, submitting: action.payload };
    case 'SET_LOAD_MODAL':
      return { ...state, loadModalVisible: action.visible, loadingTargetClient: action.client || null, loadingAmount: '' };
    case 'SET_LOAD_AMOUNT':
      return { ...state, loadingAmount: action.payload };
    case 'SET_LOAD_SUBMITTING':
      return { ...state, loadSubmitting: action.payload };
    case 'SET_LOAD_METODO_PAGO':
      return { ...state, loadMetodoPago: action.payload };
    default:
      return state;
  }
}

export function useNuevaVenta() {
  const router = useRouter();
  const { refreshVentas } = useSales();
  const [state, dispatch] = useReducer(ventaReducer, initialVentaState);

  const {
    loadingInitial,
    refreshing,
    anfitrionas,
    habitaciones,
    clientes,
    cajaAbierta,
    cart,
    selectedCliente,
    selectedHabitacion,
    metodoPago,
    pagosMixtos,
    enableTip,
    selectedTime,
    categories,
    modalOpen,
    modalCategoria,
    modalProducts,
    modalLoading,
    modalQuantities,
    modalHostessSelections,
    hostessSelectionTarget,
    hostessSubModalVisible,
    roomModalVisible,
    clientModalVisible,
    submitting,
    loadModalVisible,
    loadingAmount,
    loadingTargetClient,
    loadSubmitting,
    loadMetodoPago,
  } = state;

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (acc, item) => acc + (item.precio || item.price || 0) * (item.quantity || 1),
      0,
    );
    const tip = enableTip ? subtotal * 0.1 : 0;
    return { subtotal, tip, total: subtotal + tip };
  }, [cart, enableTip]);

  const hasCommissionItem = useMemo(() => {
    return cart.some(
      (item) =>
        Number(item.commission || item.comision || 0) > 0 ||
        Number(item.precio || item.price || 0) >= 30000,
    );
  }, [cart]);

  const fetchInitialData = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) dispatch({ type: 'SET_LOADING_INITIAL', payload: true });
    try {
      const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] =
        await Promise.allSettled([
          apiClient('/cashregister/status'),
          apiClient('/anfitrionas'),
          apiClient('/rooms'),
          apiClient('/clients'),
          apiClient('/categories'),
        ]);

      const caja = cajaRes.status === 'fulfilled' ? cajaRes.value : null;
      const anfitrionas = anfitrionasRes.status === 'fulfilled' ? anfitrionasRes.value : null;
      const rooms = roomsRes.status === 'fulfilled' ? roomsRes.value : null;
      const clients = clientsRes.status === 'fulfilled' ? clientsRes.value : null;
      const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value : null;

      const rawHabitaciones = rooms?.success ? rooms.data : [];
      const fetchedData: any = {
        cajaAbierta:
          cajaRes.status === 'fulfilled' ? caja?.success && caja?.data?.hasOpenCaja : null,
        anfitrionas: Array.isArray(anfitrionas)
          ? anfitrionas
          : anfitrionas?.success
            ? anfitrionas.data
            : [],
        habitaciones: rawHabitaciones.map((room: any) => ({
          ...room,
          nombre:
            room.nombre ??
            room.name ??
            `Habitación ${room.id_habitacion ?? room.id ?? ''}`.trim(),
          precio: room.precio ?? room.price ?? 0,
          tiempo: room.tiempo ?? room.time ?? 0,
          estado: room.estado ?? room.status ?? 0,
          comision_anfitriona: room.comision_anfitriona ?? 0,
        })),
        categories: categories?.success ? categories.data || [] : [],
      };

      if (Array.isArray(clients)) {
        fetchedData.clientes = clients;
      } else if (clients?.success) {
        fetchedData.clientes = clients.data || [];
      }

      dispatch({ type: 'SET_INITIAL_DATA', payload: fetchedData });

      if (cajaRes.status === 'fulfilled' && (!caja?.success || !caja?.data?.hasOpenCaja)) {
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
    fetchInitialData();
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
      const res = await apiClient('/clients/prepago', {
        method: 'POST',
        body: JSON.stringify({
          cliente_id: loadingTargetClient.id_cliente || loadingTargetClient.id,
          monto: Number(loadingAmount),
          tipo: 'CARGA',
          metodo_pago: loadMetodoPago,
          motivo: 'Carga de saldo prepago (App)',
        }),
      });

      if (res.success) {
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
        showToast('Error', res.message || 'Error al cargar saldo');
      }
    } catch (error) {
      logger.captureException(error, { context: 'NuevaVenta:submitVenta' });
      showToast('Error', 'Error de conexión');
    } finally {
      dispatch({ type: 'SET_LOAD_SUBMITTING', payload: false });
    }
  }, [loadingTargetClient, loadingAmount, loadMetodoPago, selectedCliente, fetchInitialData]);

  const handleOpenCategory = useCallback(async (cat: any) => {
    dispatch({ type: 'SET_MODAL_LOADING', payload: true });
    dispatch({ type: 'SET_MODAL_VISIBLE', modal: 'category', visible: true });
    try {
      const res = await apiClient(`/products?category_id=${cat.id}`);
      if (res.success) {
        dispatch({ type: 'OPEN_CATEGORY_MODAL', category: cat, products: res.data || [] });
      } else showToast('Error', 'No se pudieron cargar los productos');
    } catch (error) {
      logger.captureException(error, { context: 'NuevaVenta:handleOpenCategory' });
    } finally {
      dispatch({ type: 'SET_MODAL_LOADING', payload: false });
    }
  }, []);

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
        Number(item.precio || item.price || 0) >= 30000;

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
        cliente_id: selectedCliente?.id || selectedCliente?.id_cliente || null,
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

      const res = await apiClient('/sales', { method: 'POST', body: JSON.stringify(payload) });
      if (res.success) {
        showToast('Éxito', 'Venta realizada', 'success');
        refreshVentas();
        router.replace('/cajero/ventas');
      } else showToast('Error', res.message || 'Error al vender');
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

      dispatch({ type: 'SET_MODAL_HOSTESSES', productId: pid, hostesses: newSelected });
    },
    [hostessSelectionTarget, modalHostessSelections],
  );

  return {
    state,
    dispatch,
    totals,
    hasCommissionItem,
    isTablet: false, // será overrideado en la screen con useWindowDimensions
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
