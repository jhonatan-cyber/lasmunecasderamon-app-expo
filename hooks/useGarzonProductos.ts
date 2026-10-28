import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { showToast } from "@/utils/toast-lazy";
import { adjuntarBaucher } from "@/utils/baucherPicker";
import { apiClientSafe } from "@/api/client";
import { useConfigValue } from "@/hooks/useConfigValue";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { mapForSaleProduct } from "@/hooks/utils/cartUtils";
import { resolverVentaProducto } from "@/hooks/utils/saleChoice";
import { esCortoAnfitriona } from "@/hooks/utils/hostessShortPrices";
import { getHostessLimit } from "@/hooks/utils/cuentaUtils";
import type {
  CartItem,
  Product,
  Anfitriona,
  Room,
  MetodoPagoPedido,
} from "@/types/cart";
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS } from "@/services/mirror";
import { getOutbox } from "@/services/outbox";
import { useDebouncedEventListeners } from "@/hooks/useDebouncedEventListener";
import { REALTIME_EVENT_NAMES } from "@/utils/realtime";
import logger from "@/utils/logger";

export interface Client {
  id: string;
  id_cliente?: string;
  name: string;
  nombre?: string;
  lastName: string;
  apellido?: string;
}

export function useGarzonProductos() {
  const router = useRouter();
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName: string;
  }>();
  const user = useAuthStore((state) => state.user);

  const [products, setProducts] = useState<Product[]>([]);
  const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [metodoPago, setMetodoPagoRaw] = useState<MetodoPagoPedido>("efectivo");
  const [baucherFoto, setBaucherFoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const dataRef = useRef<string>("");
  const submitInFlight = useRef(false);

  const takeBaucherPhoto = useCallback(async () => {
    const dataUrl = await adjuntarBaucher("Productos:takeBaucherPhoto");
    if (dataUrl) setBaucherFoto(dataUrl);
  }, []);

  const setMetodoPago = useCallback(
    (metodo: MetodoPagoPedido) => {
      setMetodoPagoRaw(metodo);
      if (metodo === "transferencia") void takeBaucherPhoto();
    },
    [takeBaucherPhoto],
  );

  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [clearCartAlertVisible, setClearCartAlertVisible] = useState(false);
  const [activeConfigItem, setActiveConfigItem] = useState<{
    productId: string;
    type: "hostess" | "room";
  } | null>(null);

  const {
    cart,
    addToCart,
    removeFromCart,
    updateItemHostesses,
    updateItemRoom,
    tipEnabled,
    setTipEnabled,
    setTipPercentage,
    clearCart,
    getTipAmount,
    getTotal,
    buildOrderPayload,
  } = useCartStore();

  const propinaPct = Number(
    useConfigValue("facturacion", "propina_venta", "10"),
  );

  useEffect(() => {
    setTipPercentage(propinaPct);
  }, [propinaPct, setTipPercentage]);


  const readThroughMirror = useCallback(
    (key: string, endpoint: string, signal?: AbortSignal) =>
      getMirror().readThroughDetailed<any>(
        key,
        () => apiClientSafe(endpoint, { signal }),
        {
          maxAgeMs: MIRROR_MAX_AGE_MS.catalogo,
        },
      ),
    [],
  );

  const fetchData = useCallback(
    async (isManual = false, signal?: AbortSignal) => {
      try {
        setError("");
        const [prodRes, anfRes, roomRes, clientRes] = await Promise.allSettled([
          readThroughMirror(
            `products:order-bar:${categoryId}`,
            `/products?for_sale=1&category_id=${categoryId}`,
            signal,
          ),
          readThroughMirror(MIRROR_KEYS.anfitrionas, "/hostesses", signal),
          readThroughMirror(
            MIRROR_KEYS.roomsAvailable,
            "/rooms?status=1",
            signal,
          ),
          readThroughMirror(MIRROR_KEYS.clients, "/clients", signal),
        ]);

        if (signal?.aborted) return;

        const prodData =
          prodRes.status === "fulfilled" ? prodRes.value.data : null;
        const anfData =
          anfRes.status === "fulfilled" ? anfRes.value.data : null;
        const roomData =
          roomRes.status === "fulfilled" ? roomRes.value.data : null;
        const clientData =
          clientRes.status === "fulfilled" ? clientRes.value.data : null;

        setFromCache(
          [prodRes, anfRes, roomRes, clientRes].some(
            (resultado) =>
              resultado.status === "fulfilled" && resultado.value.fromCache,
          ),
        );

        logger.debug("Anfitrionas response", { data: anfData });

        const newData = {
          products: (prodData as any)?.data,
          anfitrionas:
            (anfData as any)?.data || (Array.isArray(anfData) ? anfData : null),
          rooms: (roomData as any)?.data,
          clients: (clientData as any)?.data || clientData,
        };
        const serialized = JSON.stringify(newData);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;

        if ((prodData as any)?.success) {
          const active = ((prodData as any).data || [])
            .filter(
              (p: any) => Number(p.stock_bar) > 0 || Number(p.ml_abierta) > 0,
            )
            .flatMap((raw: any) => {
              const p = mapForSaleProduct(raw);
              return resolverVentaProducto(p)
                .opciones.filter(
                  (option) => option.esShot || Number(p.stock_bar) > 0,
                )
                .map((option) => ({
                  ...p,
                  id: `${p.presentacion_id}:${option.value}`,
                  name: `${p.name} - ${option.nombre}`,
                  price: option.precio,
                  commission: option.comision,
                  tipo_venta: option.esShot ? "shot" : "botella",
                  shot_anfitriona: esCortoAnfitriona(option.value),
                  status: 1,
                }));
            });
          setProducts(active);
        }
        if ((anfData as any)?.success) {
          setAnfitrionas((anfData as any).data || []);
        } else if (Array.isArray(anfData)) {
          setAnfitrionas(anfData);
        }
        if ((roomData as any)?.success) setRooms((roomData as any).data || []);

        if (Array.isArray(clientData)) {
          setClients(clientData);
        } else if ((clientData as any)?.success) {
          setClients((clientData as any).data || []);
        }

        if (isManual) {
          showToast({
            type: hasChanges ? "success" : "info",
            text1: hasChanges ? "Éxito" : "Información",
            text2: hasChanges
              ? "Datos actualizados"
              : "Sin cambios en los datos",
            visibilityTime: 3000,
          });
        }
      } catch (err: any) {
        if (signal?.aborted) return;
        logger.fetchError(err, { context: "Productos:fetchProductos" });
        setError(err.message || "Error de conexión");
        if (isManual) {
          showToast({
            type: "error",
            text1: "Error",
            text2: "No se pudo actualizar la lista de productos",
            visibilityTime: 3000,
          });
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [categoryId, readThroughMirror],
  );

  useFocusEffect(
    useCallback(() => {
      const ac = new AbortController();
      fetchData(false, ac.signal);
      return () => ac.abort();
    }, [fetchData]),
  );

  // Refresco en vivo: catálogo de productos, stock del bar (traspasos),
  // anfitrionas disponibles, salas libres y clientes.
  useDebouncedEventListeners(
    [
      REALTIME_EVENT_NAMES.refreshCategories,
      REALTIME_EVENT_NAMES.refreshProducts,
      REALTIME_EVENT_NAMES.refreshBar,
      REALTIME_EVENT_NAMES.refreshPersonal,
      REALTIME_EVENT_NAMES.refreshRooms,
      REALTIME_EVENT_NAMES.refreshClients,
    ],
    useCallback(() => {
      void fetchData(false);
    }, [fetchData]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const tipAmount = getTipAmount();
  const cartTotal = getTotal();

  const getMaxHostesses = (item: CartItem) => {
    if (item.product.tipo_venta === "shot")
      return item.product.shot_anfitriona ? item.quantity : 0;
    return getHostessLimit(item.product, item.quantity);
  };

  const submitOrder = async () => {
    if (submitInFlight.current) return;
    if (cart.length === 0) return;
    if (!user) return;

    for (const item of cart) {
      const hasCommission = (item.product.commission || 0) > 0;
      if (hasCommission && item.selectedHostesses.length === 0) {
        showToast({
          type: "error",
          text1: "Falta Anfitriona",
          text2: `Debes asignar al menos una anfitriona a "${item.product.name}"`,
        });
        return;
      }
    }

    if (metodoPago === "transferencia" && !baucherFoto) {
      showToast({
        type: "error",
        text1: "Falta la foto del baucher",
        text2: "El pago con transferencia requiere la foto del baucher para enviar el pedido.",
      });
      void takeBaucherPhoto();
      return;
    }

    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    submitInFlight.current = true;
    setSubmitting(true);
    try {
      const codigo = generateCode();

      const buildResult = buildOrderPayload({
        meseroId: user.id,
        codigo,
        clienteId: selectedClientId,
        metodoPago,
        baucherFoto: metodoPago === "transferencia" ? baucherFoto : null,
        device_date: new Date().toISOString(),
      });

      if (!buildResult.success) {

        const problemaDeBaucher = buildResult.errors.some((error) =>
          error.includes("baucher_foto"),
        );
        showToast({
          type: "error",
          text1: problemaDeBaucher ? "La foto del baucher no sirve" : "Datos inválidos",
          text2: problemaDeBaucher
            ? "Supera el tamaño permitido. Vuelve a tomarla y el pedido se envía sin problema."
            : buildResult.errors.join("; "),
        });
        if (problemaDeBaucher && metodoPago === "transferencia") void takeBaucherPhoto();
        setSubmitting(false);
        return;
      }

      const orderData = buildResult.data;

      logger.debug("[DEBUG] Enviando pedido", { orderData });

      const intent = await getOutbox().enqueueAndSend({
        type: "order.create",
        payload: orderData,
        label: `Pedido ${codigo} · ${cart.reduce((acc, item) => acc + item.quantity, 0)} ítem(s)`,
      });

      if (intent.status === "aplicada") {
        showToast({
          type: "success",
          text1: "Pedido Enviado",
          text2: "El pedido ha sido registrado correctamente",
        });
        clearCart();
        setMetodoPagoRaw("efectivo");
        setBaucherFoto(null);
        router.back();
        return;
      }

      if (intent.status === "fallida") {
        throw new Error(intent.lastError || "El servidor rechazó el pedido");
      }

      showToast({
        type: "info",
        text1: "Pedido guardado en el dispositivo",
        text2: "Se enviará automáticamente cuando vuelva la conexión",
        visibilityTime: 4000,
      });
      clearCart();
      setMetodoPagoRaw("efectivo");
      setBaucherFoto(null);
      router.back();
    } catch (err: any) {
      showToast({
        type: "error",
        text1: "Error",
        text2: err.message || "Error de conexión",
      });
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  return {
    categoryName,

    products,
    anfitrionas,
    rooms,
    clients,
    selectedClientId,
    setSelectedClientId,
    metodoPago,
    setMetodoPago,
    baucherFoto,
    takeBaucherPhoto,
    loading,
    refreshing,
    submitting,
    error,
    fromCache,

    clientModalVisible,
    setClientModalVisible,
    clearCartAlertVisible,
    setClearCartAlertVisible,
    activeConfigItem,
    setActiveConfigItem,

    cart,
    addToCart,
    removeFromCart,
    updateItemHostesses,
    updateItemRoom,
    tipEnabled,
    setTipEnabled,
    clearCart,
    tipAmount,
    cartTotal,
    propinaPct,

    onRefresh,
    getMaxHostesses,
    submitOrder,
  };
}
