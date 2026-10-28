import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { showToast } from "@/utils/toast-lazy";
import { ajustarFotoBaucher } from "@/utils/baucherFoto";
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
  // El pedido se guarda con el método puesto: el dashboard lo exige y cobra con
  // él. Efectivo por defecto para no frenar al garzón; puede cambiarlo antes de
  // enviar.
  const [metodoPago, setMetodoPagoRaw] = useState<MetodoPagoPedido>("efectivo");
  /**
   * Foto del baucher en data URL. Solo se exige con transferencia: sin ella el
   * pedido no puede enviarse porque es la única constancia de que el pago entró.
   */
  const [baucherFoto, setBaucherFoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /** `true` si lo que se está viendo viene del espejo local. */
  const [fromCache, setFromCache] = useState(false);
  const dataRef = useRef<string>("");
  const submitInFlight = useRef(false);

  /**
   * Abre la cámara para fotografiar el baucher. Si el garzón cancela, el método
   * sigue siendo transferencia pero sin foto: `submitOrder` vuelve a pedirla.
   */
  const takeBaucherPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showToast({
          type: "error",
          text1: "Sin acceso a la cámara",
          text2: "Permite la cámara para fotografiar el baucher de la transferencia.",
        });
        return;
      }
      // Calidad baja a propósito: el base64 viaja dentro del pedido y el
      // dashboard rechaza sobre `BAUCHER_FOTO_MAX_CHARS`. El baucher se lee
      // igual, y así una foto de cámara no deja el pedido sin poder enviarse.
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.4,
        base64: true,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.base64) return;
      const original = `data:image/jpeg;base64,${asset.base64}`;
      // Una foto de cámara puede salir más grande que el límite que acepta el
      // dashboard (`BAUCHER_FOTO_MAX_CHARS`): aquí se reduce para que el pedido
      // se pueda enviar. Si no cabe ni reducida no se guarda, porque una foto
      // que el servidor rechaza con 400 dejaría el pedido sin registrar.
      const ajuste = await ajustarFotoBaucher(original, asset.uri);
      if (!ajuste.ok) {
        showToast({
          type: "error",
          text1: "La foto del baucher no sirve",
          text2:
            ajuste.motivo === "no-cabe"
              ? "No entra en el tamaño permitido. Tómala de nuevo con más luz y sin zoom."
              : "No se pudo reducir la foto. Tómala de nuevo.",
        });
        return;
      }
      setBaucherFoto(ajuste.dataUrl);
    } catch (err) {
      logger.fetchError(err, { context: "Productos:takeBaucherPhoto" });
      showToast({
        type: "error",
        text1: "No se pudo abrir la cámara",
        text2: "Vuelve a intentar fotografiar el baucher.",
      });
    }
  }, []);

  /** Elegir transferencia dispara la cámara: la foto es obligatoria para enviar. */
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

  /**
   * Lectura con espejo: red primero y, si no hay, lo último guardado en el
   * dispositivo. El catálogo de un turno atrás sigue sirviendo para tomar el
   * pedido; la hora de la última sincronización se muestra en pantalla.
   */
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
        // El motivo más caro es la foto: el payload no sale por su tamaño y,
        // sin aviso claro, el garzón quedaría con el pedido sin enviar.
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

      // El pedido se encola SIEMPRE (una sola ruta de código, haya red o
      // no). El id de la intención viaja como clave de idempotencia, así
      // que un reintento tras un corte no duplica el pedido.
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

      // Quedó pendiente: el trabajo está guardado y sale al volver la red.
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
