import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { showToast } from "@/utils/toast-lazy";
import { apiClientSafe } from "@/api/client";
import { useCartStore } from "@/store/cartStore";
import { mapForSaleProduct } from "@/hooks/utils/cartUtils";
import { resolverVentaProducto } from "@/hooks/utils/saleChoice";
import { esCortoAnfitriona } from "@/hooks/utils/hostessShortPrices";
import { getHostessLimit } from "@/hooks/utils/cuentaUtils";
import { useGarzonOrderCheckout } from "@/hooks/useGarzonOrderCheckout";
import type {
  CartItem,
  Product,
  Anfitriona,
  Room,
} from "@/types/cart";
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS } from "@/services/mirror";
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
  const {
    metodoPago,
    setMetodoPago,
    baucherFoto,
    baucherPromptVisible,
    setBaucherPromptVisible,
    takeBaucherPhoto,
    submitting,
    submitOrder,
    propinaPct,
  } = useGarzonOrderCheckout();
  const { categoryId, categoryName } = useLocalSearchParams<{
    categoryId: string;
    categoryName: string;
  }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [anfitrionas, setAnfitrionas] = useState<Anfitriona[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const selectedClientId = useCartStore((state) => state.selectedClientId);
  const setSelectedClientId = useCartStore((state) => state.setSelectedClientId);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const dataRef = useRef<string>("");

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
    clearCart,
    getTipAmount,
    getTotal,
  } = useCartStore();


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

        const productError =
          prodRes.status === "rejected"
            ? prodRes.reason instanceof Error
              ? prodRes.reason.message
              : String(prodRes.reason)
            : prodRes.value.error?.message ||
              (!(prodData as any)?.success
                ? (prodData as any)?.message || "No pudimos cargar los productos."
                : "");
        setError(productError);

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
                  botella_anfitriona: option.esShot
                    ? undefined
                    : option.value !== "botella_sin_anfitriona",
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
          showToast(
            productError
              ? {
                  type: "error",
                  text1: "Error",
                  text2: "No se pudo actualizar la lista de productos",
                  visibilityTime: 3000,
                }
              : {
                  type: hasChanges ? "success" : "info",
                  text1: hasChanges ? "Éxito" : "Información",
                  text2: hasChanges
                    ? "Datos actualizados"
                    : "Sin cambios en los datos",
                  visibilityTime: 3000,
                },
          );
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
    baucherPromptVisible,
    setBaucherPromptVisible,
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
