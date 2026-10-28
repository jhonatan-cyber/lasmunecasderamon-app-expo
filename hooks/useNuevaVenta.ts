import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store/authStore";
import {
  requiresShortMixer,
  bottleMixerUnits,
} from "@/hooks/utils/productConfiguration";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiClientSafe } from "@/api/client";
import { useConfigValue } from "@/hooks/useConfigValue";
import {
  calcularPropina,
  calcularTotalVenta,
} from "@lasmunecasderamon/sale-totals";
import { useSalesActions } from "@/context/SalesContext";
import {
  showToast,
  isChampagneProduct,
  getHostessLimit,
  openCategory,
  mapForSaleProduct,
  normalizeRoom,
  normalizeClients,
  normalizeAnfitrionas,
  filterForSaleProducts,
  setSaleServiceLevels,
  roomRequiredForSalePrice,
  MENSAJE_CHAMPAGNE_SIN_CONFIGURAR,
  faltaConfiguracionChampagne,
} from "@/hooks/utils/cartUtils";
import logger from "@/utils/logger";
import { eventBus } from "@/utils/eventBus";
import { REALTIME_EVENT_NAMES } from "@/utils/realtime";
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS } from "@/services/mirror";
import { getOutbox } from "@/services/outbox";
import { blockOffline } from "@/utils/offlineGuard";
import { buildSalePayload } from "@/hooks/utils/salePayload";
import { esCortoAnfitriona } from "@/hooks/utils/hostessShortPrices";
import {
  resolverVentaProducto,
  type SaleChoice,
} from "@/hooks/utils/saleChoice";
import {
  ventaReducer,
  initialVentaState,
} from "@/components/cajero/nueva-venta/reducer";
import type { VentaState } from "@/components/cajero/nueva-venta/types";

/**
 * El endpoint de categorías de venta ya devuelve solo categorías activas con
 * unidades activas disponibles en el bar; se valida de nuevo por robustez.
 */
const filterSaleCategories = (categories: any[]) =>
  (Array.isArray(categories) ? categories : []).filter((c: any) => {
    const status = Number(c?.status ?? c?.estado ?? 0);
    const total = Number(c?.total_products ?? c?.productCount ?? 0);
    return status === 1 && total > 0;
  });

export function useNuevaVenta() {
  const router = useRouter();
  const params = useLocalSearchParams<{ servicio_id?: string }>();
  const servicioId =
    typeof params.servicio_id === "string" ? params.servicio_id : undefined;
  const [servicioCargadoId, setServicioCargadoId] = useState("");
  const servicioListo = servicioCargadoId === servicioId;
  const [servicioNombre, setServicioNombre] = useState("");
  const [servicioAnfitrionasIniciales, setServicioAnfitrionasIniciales] =
    useState<string[]>([]);
  const [servicioAnfitrionas, setServicioAnfitrionas] = useState<string[]>([]);
  const { refreshVentas } = useSalesActions();
  const [state, dispatch] = useReducer(ventaReducer, initialVentaState);
  useEffect(() => {
    if (!servicioId) return;
    const controller = new AbortController();
    apiClientSafe(`/services/${encodeURIComponent(servicioId)}`, {
      signal: controller.signal,
    })
      .then((res: any) => {
        if (!res.success || ![2, 3].includes(Number(res.data?.estado)))
          throw new Error("El servicio ya no está activo");
        const s = res.data;
        dispatch({
          type: "SET_SELECTED_HABITACION",
          payload: {
            id: s.habitacion_id,
            id_habitacion: s.habitacion_id,
            nombre: s.habitacion_nombre || s.habitacion_numero,
            precio: 0,
            tiempo: 0,
            estado: 2,
          },
        });
        if (s.cliente_id)
          dispatch({
            type: "SET_SELECTED_CLIENTE",
            payload: {
              id: s.cliente_id,
              id_cliente: s.cliente_id,
              nombre: s.cliente_nombre || "Cliente del servicio",
              saldo: 0,
              deuda: 0,
            },
          });
        setServicioNombre(
          s.habitacion_nombre || s.habitacion_numero || "Habitación",
        );
        const ids = [
          ...new Set<string>(
            String(s.anfitrionas_ids || "")
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean),
          ),
        ];
        setServicioAnfitrionasIniciales(ids);
        setServicioAnfitrionas(ids);
        setServicioCargadoId(servicioId);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          showToast("Servicio", err.message || "No se pudo cargar el servicio");
      });
    return () => controller.abort();
  }, [servicioId]);
  const cartRef = useRef(state.cart);
  useEffect(() => {
    cartRef.current = state.cart;
  }, [state.cart]);
  /** `true` si lo que se está viendo viene del espejo local. */
  const [fromCache, setFromCache] = useState(false);
  const saleTiersCache = useRef<
    Map<string, { anfitrionas: number; precio: number; comision: number }[]>
  >(new Map());

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
    saleChoices,
    hostessSelectionTarget,
    loadingAmount,
    loadingTargetClient,
    loadMetodoPago,
  } = state;

  const propinaPct = Number(
    useConfigValue("facturacion", "propina_venta", "10"),
  );
  const simpleHasta = Number(
    useConfigValue("comisiones", "umbral_simple_hasta", "10000"),
  );
  const anfitrionaDesde = Number(
    useConfigValue("comisiones", "umbral_anfitriona_desde", "20000"),
  );
  const habitacionDesde = Number(
    useConfigValue("comisiones", "umbral_habitacion_desde", "30000"),
  );

  useEffect(() => {
    setSaleServiceLevels({
      simpleHasta,
      hostessDesde: anfitrionaDesde,
      habitacionDesde,
    });
  }, [simpleHasta, anfitrionaDesde, habitacionDesde]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (acc, item) =>
        acc + (item.precio || item.price || 0) * (item.quantity || 1),
      0,
    );
    const tip = calcularPropina(subtotal, propinaPct, enableTip);
    const total = calcularTotalVenta({ subtotal, propina: tip });
    return { subtotal, tip, total };
  }, [cart, enableTip, propinaPct]);

  const hasCommissionItem = useMemo(() => {
    return (
      !servicioId &&
      cart.some((item) => {
        const price = Number(item.precio ?? item.price ?? 0);
        return (
          isChampagneProduct(item) ||
          (price >= habitacionDesde && price >= anfitrionaDesde)
        );
      })
    );
  }, [cart, habitacionDesde, anfitrionaDesde, servicioId]);

  /**
   * Lectura con espejo: red primero y, si no hay, lo último guardado. Vender sin
   * red necesita de este espejo el catálogo, los clientes y —sobre todo— el
   * estado de caja: `cajaAbierta` decide si se puede vender.
   */
  const readThroughMirror = useCallback(
    <T>(key: string, fetcher: () => Promise<T>, maxAgeMs: number) =>
      getMirror().readThroughDetailed<T>(key, fetcher, { maxAgeMs }),
    [],
  );

  // Tramos de precio por anfitrionas: solo los configurados por producto
  // (`producto_champagne_tiers`). Sin tramos el producto no se puede vender con
  // anfitrionas; no hay tabla por defecto.
  const getSaleTiers = useCallback(
    async (
      productId: string,
    ): Promise<{ anfitrionas: number; precio: number; comision: number }[]> => {
      const cached = saleTiersCache.current.get(productId);
      if (cached) return cached;
      try {
        const response = await apiClientSafe(
          `/products/${encodeURIComponent(productId)}/tiers?configurados=1`,
        );
        const tiers: {
          anfitrionas: number;
          precio: number;
          comision: number;
        }[] =
          (response as any)?.success && Array.isArray((response as any).data)
            ? (response as any).data
                .map((tier: any) => ({
                  anfitrionas: Number(tier.anfitrionas),
                  precio: Number(tier.precio),
                  comision: Number(tier.comision),
                }))
                .filter(
                  (tier: any) =>
                    tier.anfitrionas > 0 &&
                    tier.precio >= 0 &&
                    tier.comision >= 0,
                )
                .sort((a: any, b: any) => a.anfitrionas - b.anfitrionas)
            : [];
        saleTiersCache.current.set(productId, tiers);
        return tiers;
      } catch (error) {
        logger.fetchError(error, { context: "NuevaVenta:getSaleTiers" });
        return [];
      }
    },
    [],
  );

  const fetchInitialData = useCallback(
    async (isRefreshing = false, signal?: AbortSignal) => {
      if (!isRefreshing)
        dispatch({ type: "SET_LOADING_INITIAL", payload: true });
      try {
        const [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes] =
          await Promise.allSettled([
            readThroughMirror(
              MIRROR_KEYS.cashregisterStatus,
              () => apiClientSafe("/cashregister/status", { signal }),
              MIRROR_MAX_AGE_MS.dinero,
            ),
            readThroughMirror(
              MIRROR_KEYS.anfitrionas,
              () => apiClientSafe("/hostesses", { signal }),
              MIRROR_MAX_AGE_MS.catalogo,
            ),
            readThroughMirror(
              MIRROR_KEYS.rooms,
              () => apiClientSafe("/rooms", { signal }),
              MIRROR_MAX_AGE_MS.catalogo,
            ),
            readThroughMirror(
              MIRROR_KEYS.clients,
              () => apiClientSafe("/clients", { signal }),
              MIRROR_MAX_AGE_MS.catalogo,
            ),
            readThroughMirror(
              MIRROR_KEYS.saleCategories,
              () => apiClientSafe("/categories?for_sale=1", { signal }),
              MIRROR_MAX_AGE_MS.catalogo,
            ),
          ]);

        setFromCache(
          [cajaRes, anfitrionasRes, roomsRes, clientsRes, categoriesRes].some(
            (resultado) =>
              resultado.status === "fulfilled" && resultado.value.fromCache,
          ),
        );

        const caja = cajaRes.status === "fulfilled" ? cajaRes.value.data : null;
        const anfitrionasVal =
          anfitrionasRes.status === "fulfilled"
            ? anfitrionasRes.value.data
            : null;
        const rooms =
          roomsRes.status === "fulfilled" ? roomsRes.value.data : null;
        const clients =
          clientsRes.status === "fulfilled" ? clientsRes.value.data : null;
        const categories =
          categoriesRes.status === "fulfilled"
            ? categoriesRes.value.data
            : null;

        const fetchedData: Partial<VentaState> = {
          cajaAbierta:
            cajaRes.status === "fulfilled"
              ? (caja as any)?.success && (caja as any)?.data?.hasOpenCaja
              : null,
          anfitrionas: normalizeAnfitrionas(anfitrionasVal),
          habitaciones: ((rooms as any)?.success
            ? (rooms as any).data
            : []
          ).map(normalizeRoom),
          categories: filterSaleCategories(
            (categories as any)?.success ? (categories as any).data || [] : [],
          ),
          clientes: normalizeClients(clients),
        };

        dispatch({ type: "SET_INITIAL_DATA", payload: fetchedData });

        // Con la caja cerrada ya no se avisa con toast: la pantalla muestra el
        // banner «No hay caja abierta.» (espejo de CajaStatusCheck del dashboard)
        // y mantiene `cajaAbierta === false` para deshabilitar el envío.
      } catch (error) {
        logger.captureException(error, { context: "NuevaVenta:processVenta" });
        showToast("Error", "No se pudo cargar la información.");
      } finally {
        dispatch({ type: "SET_LOADING_INITIAL", payload: false });
        dispatch({ type: "SET_REFRESHING", payload: false });
      }
    },
    [readThroughMirror],
  );

  useEffect(() => {
    const ac = new AbortController();
    queueMicrotask(() => {
      if (!ac.signal.aborted) void fetchInitialData(false, ac.signal);
    });
    return () => ac.abort();
  }, [fetchInitialData]);

  // `categories_updated` (SSE): el catálogo cambió en el dashboard; se refresca
  // solo la lista — el carrito y la categoría seleccionada quedan intactos.
  useEffect(() => {
    const subscription = eventBus.addListener(
      REALTIME_EVENT_NAMES.refreshCategories,
      () => {
        void (async () => {
          try {
            const res = await apiClientSafe("/categories?for_sale=1");
            if ((res as any)?.success) {
              dispatch({
                type: "SET_INITIAL_DATA",
                payload: {
                  categories: filterSaleCategories((res as any).data || []),
                },
              });
            }
          } catch (e) {
            logger.fetchError(e, { context: "NuevaVenta:refreshCategories" });
          }
        })();
      },
    );
    return () => subscription.remove();
  }, []);

  const onRefresh = useCallback(() => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    fetchInitialData(true);
  }, [fetchInitialData]);

  // Al volver de la pantalla de Caja se refresca **solo** el estado de caja:
  // un único GET /cashregister/status, sin recargar catálogo, clientes ni
  // carrito (el reducer mezcla el parcial con SET_INITIAL_DATA).
  const refreshCajaStatus = useCallback(async () => {
    try {
      const result = await readThroughMirror(
        MIRROR_KEYS.cashregisterStatus,
        () => apiClientSafe("/cashregister/status"),
        MIRROR_MAX_AGE_MS.dinero,
      );
      const res = result.data as any;
      const hasOpenCaja = res?.data?.hasOpenCaja;
      if (res?.success && typeof hasOpenCaja === "boolean") {
        dispatch({
          type: "SET_INITIAL_DATA",
          payload: { cajaAbierta: hasOpenCaja },
        });
      }
    } catch (error) {
      logger.fetchError(error, { context: "NuevaVenta:refreshCajaStatus" });
    }
  }, [readThroughMirror]);

  const handleLoadPrepago = useCallback(async () => {
    if (
      !loadingTargetClient ||
      !loadingAmount ||
      isNaN(Number(loadingAmount)) ||
      Number(loadingAmount) <= 0
    ) {
      showToast("Error", "Ingrese un monto válido");
      return;
    }

    dispatch({ type: "SET_LOAD_SUBMITTING", payload: true });
    try {
      const res = await apiClientSafe("/clients/prepaid", {
        method: "POST",
        body: JSON.stringify({
          cliente_id: String(
            loadingTargetClient.id_cliente || loadingTargetClient.id,
          ),
          monto: Number(loadingAmount),
          tipo: "CARGA",
          metodo_pago: loadMetodoPago,
          motivo: "Carga de saldo prepago (App)",
        }),
      });

      if ((res as any).success) {
        showToast("Éxito", "Saldo cargado correctamente", "success");
        dispatch({ type: "SET_LOAD_MODAL", visible: false });
        fetchInitialData(true);
        if (
          selectedCliente &&
          String(selectedCliente.id_cliente || selectedCliente.id) ===
            String(loadingTargetClient.id_cliente || loadingTargetClient.id)
        ) {
          dispatch({
            type: "SET_SELECTED_CLIENTE",
            payload: {
              ...selectedCliente,
              saldo: Number(selectedCliente.saldo || 0) + Number(loadingAmount),
            },
          });
        }
      } else {
        showToast("Error", (res as any).message || "Error al cargar saldo");
      }
    } catch (error) {
      logger.captureException(error, { context: "NuevaVenta:submitVenta" });
      showToast("Error", "Error de conexión");
    } finally {
      dispatch({ type: "SET_LOAD_SUBMITTING", payload: false });
    }
  }, [
    loadingTargetClient,
    loadingAmount,
    loadMetodoPago,
    selectedCliente,
    fetchInitialData,
  ]);

  const handleOpenCategory = useCallback(
    // Venta: catálogo de venta del bar (for_sale), como el dashboard.
    (cat: any) => openCategory(cat, dispatch, { forSale: true }),
    [],
  );

  const addProductToCart = useCallback(
    async (prod: any) => {
      const id = prod.id || prod.id_producto;
      const tierProductId = String(
        prod.producto_id || prod.id_producto || prod.id,
      );
      // Champaña sin tabla de precios por anfitrionas (ni máximo explícito) no
      // tiene cómo cobrarse: se bloquea con el mismo mensaje del dashboard.
      if (isChampagneProduct(prod) && prod?.tipo_venta !== "shot") {
        const tiers = await getSaleTiers(tierProductId);
        if (faltaConfiguracionChampagne(prod.max_anfitrionas, tiers)) {
          showToast(
            "Champaña sin configurar",
            MENSAJE_CHAMPAGNE_SIN_CONFIGURAR,
          );
          return;
        }
      }
      // El shot sale de la botella abierta: no gasta unidades del bar, así que
      // su tope es el máximo del dashboard (99) y no `stock_bar`.
      const esShot = prod?.tipo_venta === "shot";
      const stockBar = Number(prod.stock_bar ?? 0);
      const hasStockLimit =
        prod.stock_bar !== null && prod.stock_bar !== undefined;
      const maxQty = esShot
        ? 99
        : hasStockLimit
          ? Math.max(0, stockBar)
          : Number.MAX_SAFE_INTEGER;
      const requestedQty = Number(prod.quantity ?? modalQuantities[id] ?? 1);
      if (
        !Number.isInteger(requestedQty) ||
        requestedQty < 1 ||
        requestedQty > 2147483647
      ) {
        showToast(
          "Cantidad inválida",
          "La cantidad debe ser un número entero positivo.",
        );
        return;
      }
      let qty = Math.min(requestedQty, maxQty);
      const hasCommission = Number(prod.comision ?? prod.commission ?? 0) > 0;
      const requestedHostesses = hasCommission
        ? modalHostessSelections[id] || []
        : [];
      const bottlePrice = resolverVentaProducto(prod, "botella").precioBotella;
      const maxHostesses =
        requestedHostesses.length === 0
          ? 0
          : isChampagneProduct(prod)
            ? Math.min(
                getHostessLimit(prod),
                Math.max(
                  1,
                  ...(await getSaleTiers(tierProductId)).map(
                    (tier) => tier.anfitrionas,
                  ),
                ),
              )
            : roomRequiredForSalePrice(bottlePrice)
              ? Math.min(
                  Number(prod.max_anfitrionas) > 0
                    ? Number(prod.max_anfitrionas)
                    : qty,
                  qty,
                )
              : Number(prod.max_anfitrionas) > 0
                ? Number(prod.max_anfitrionas)
                : 1;
      const hostesses = requestedHostesses.slice(0, maxHostesses);
      if (hostesses.length < requestedHostesses.length) {
        showToast(
          "Límite de anfitrionas",
          `Se asignaron como máximo ${maxHostesses} anfitrionas a este producto.`,
        );
      }
      let salePrice = Number(prod.precio ?? prod.price ?? 0);
      let saleCommission = Number(prod.comision ?? prod.commission ?? 0);
      if (
        !esShot &&
        hostesses.length > 0 &&
        (isChampagneProduct(prod) || Number(prod.max_anfitrionas) >= 2)
      ) {
        const tiers: {
          anfitrionas: number;
          precio: number;
          comision: number;
        }[] = await getSaleTiers(tierProductId);
        const tier = isChampagneProduct(prod)
          ? [...tiers]
              .reverse()
              .find((item) => item.anfitrionas <= hostesses.length)
          : tiers.find((item) => item.anfitrionas === hostesses.length);
        if (tier) {
          salePrice = tier.precio;
          saleCommission = tier.comision;
        }
      }
      const newCart = [...cartRef.current];

      const itemHostesses = hostesses.length > 0 ? hostesses : [];
      const hostessNames =
        hostesses.length > 0
          ? hostesses
              .map(
                (hId: string | number) =>
                  anfitrionas.find(
                    (a: any) => String(a.id_usuario || a.id) === String(hId),
                  )?.nick || "",
              )
              .filter(Boolean)
              .join(", ")
          : null;

      const existingItemIndex = newCart.findIndex((item) => {
        const itemId = item.id || item.id_producto;
        const currentH = item.anfitrionas || [];
        const sortedCurrent = [...currentH].sort().join(",");
        const sortedNew = [...itemHostesses].sort().join(",");
        // Misma presentación vendida de forma distinta (botella / shot cliente /
        // shot anfitriona) son líneas aparte en el carrito y en el reporte.
        return (
          itemId === id &&
          sortedCurrent === sortedNew &&
          (item.tipo_venta === "shot") === esShot &&
          Boolean(item.shot_anfitriona) === Boolean(prod?.shot_anfitriona) &&
          Number(item.precio ?? item.price) === salePrice &&
          Number(item.comision ?? item.commission) === saleCommission &&
          JSON.stringify(item.acompanamiento_botella ?? null) ===
            JSON.stringify(prod?.acompanamiento_botella ?? null) &&
          JSON.stringify(item.acompanamiento_corto ?? null) ===
            JSON.stringify(prod?.acompanamiento_corto ?? null)
        );
      });

      if (esShot) {
        const alreadyAdded =
          existingItemIndex >= 0
            ? Number(newCart[existingItemIndex].quantity || 0)
            : 0;
        qty = Math.min(qty, Math.max(0, 99 - alreadyAdded));
      } else if (hasStockLimit) {
        const presentationId = String(prod.presentacion_id || id);
        const reserved = newCart.reduce(
          (total, item) =>
            String(item.presentacion_id || item.id || item.id_producto) ===
              presentationId && item.tipo_venta !== "shot"
              ? total + Number(item.quantity || item.cantidad || 0)
              : total,
          0,
        );
        qty = Math.min(qty, Math.max(0, stockBar - reserved));
      }
      if (qty < requestedQty) {
        showToast(
          "Stock insuficiente",
          `Solo se pueden agregar ${qty} unidades disponibles.`,
        );
      }
      if (qty <= 0) return;

      if (existingItemIndex >= 0) {
        newCart[existingItemIndex].quantity = Math.min(
          newCart[existingItemIndex].quantity + qty,
          maxQty,
        );
      } else {
        newCart.push({
          ...prod,
          precio: salePrice,
          price: salePrice,
          comision: saleCommission,
          commission: saleCommission,
          tipo_venta: esShot ? ("shot" as const) : ("botella" as const),
          shot_anfitriona: esShot ? Boolean(prod?.shot_anfitriona) : false,
          quantity: Math.min(qty, maxQty),
          anfitrionas: itemHostesses,
          hostessNames: hostessNames || null,
        });
      }

      dispatch({ type: "SET_CART", payload: newCart });
      cartRef.current = newCart;
      showToast(
        "Producto Agregado",
        `Se agregó ${prod.name || prod.nombre} al carrito`,
        "success",
      );
    },
    [modalQuantities, modalHostessSelections, anfitrionas, getSaleTiers],
  );

  /**
   * Qué forma de venta se eligió para una presentación (botella, shot cliente o
   * shot anfitriona); vive en el estado para que el buscador y el modal de
   * categoría compartan la misma elección.
   */
  const handleSetSaleChoice = useCallback(
    (productId: string | number, choice: SaleChoice) => {
      dispatch({
        type: "SET_SALE_CHOICE",
        productId: String(productId),
        choice,
      });
    },
    [],
  );

  const handlePressAddProduct = useCallback(
    async (item: any, choice?: SaleChoice, quantity = 1) => {
      const selectedChoice =
        choice || saleChoices[String(item.id || item.id_producto)] || "botella";
      const requestedShot =
        selectedChoice === "shot" || esCortoAnfitriona(selectedChoice);
      if (
        !requestedShot &&
        item?.stock_bar != null &&
        Number(item.stock_bar) <= 0
      ) {
        showToast(
          "Sin stock en bar",
          "Este producto ya no tiene unidades disponibles.",
        );
        return;
      }
      // Precio, comisión y tope salen de la forma de venta elegida: un shot no
      // hereda la comisión de la botella (regla del dashboard).
      const id = String(item.id || item.id_producto);
      const venta = resolverVentaProducto(item, choice || saleChoices[id]);
      const producto = {
        ...item,
        tipo_venta: venta.esShot ? ("shot" as const) : ("botella" as const),
        shot_anfitriona: esCortoAnfitriona(venta.tipoVenta),
        precio: venta.precio,
        price: venta.precio,
        comision: venta.comision,
        commission: venta.comision,
        quantity,
      };

      const hasComm = Number(venta.comision) > 0;
      const champagne = isChampagneProduct(item);
      const tierProductId = String(
        item.producto_id || item.id_producto || item.id,
      );
      const tiers: {
        anfitrionas: number;
        precio: number;
        comision: number;
      }[] = champagne && !venta.esShot ? await getSaleTiers(tierProductId) : [];

      // Sin tabla de precios por anfitrionas (ni máximo explícito) la champaña
      // no tiene cómo cobrarse: se bloquea con el mismo mensaje del dashboard.
      if (
        champagne &&
        !venta.esShot &&
        faltaConfiguracionChampagne(item.max_anfitrionas, tiers)
      ) {
        showToast("Champaña sin configurar", MENSAJE_CHAMPAGNE_SIN_CONFIGURAR);
        return;
      }

      if (hasComm) {
        const explicitMax = Number(item.max_anfitrionas);
        const max = champagne
          ? Math.min(
              getHostessLimit(producto),
              Math.max(1, ...tiers.map((tier) => tier.anfitrionas)),
            )
          : roomRequiredForSalePrice(venta.precioBotella)
            ? Math.min(explicitMax > 0 ? explicitMax : quantity, quantity)
            : explicitMax > 0
              ? explicitMax
              : 1;
        if (
          modalHostessSelections[id] === undefined &&
          servicioAnfitrionas.length > 0
        ) {
          dispatch({
            type: "SET_MODAL_HOSTESSES",
            productId: id,
            hostesses: servicioAnfitrionas.slice(0, max),
          });
        }
        dispatch({
          type: "SET_HOSTESS_TARGET",
          target: {
            productId: item.id || item.id_producto,
            product: producto,
            max,
            isChampagne: champagne,
          },
        });
        return;
      }

      addProductToCart(producto);
    },
    [
      addProductToCart,
      saleChoices,
      getSaleTiers,
      modalHostessSelections,
      servicioAnfitrionas,
    ],
  );

  const removeFromCart = useCallback(
    (index: number) => {
      const newCart = [...cart];
      newCart.splice(index, 1);
      dispatch({ type: "SET_CART", payload: newCart });
      cartRef.current = newCart;
    },
    [cart],
  );

  const updateQuantity = useCallback(
    (index: number, delta: number) => {
      const newCart = [...cart];
      let newQty = Math.max(1, (newCart[index].quantity || 1) + delta);
      // Tope de stock en el bar (catálogo for_sale; legacy sin tope); el shot
      // no gasta botellas y usa el máximo del dashboard, como al agregar.
      const esShot = newCart[index].tipo_venta === "shot";
      const stockBar = Number(newCart[index].stock_bar ?? 0);
      const hasStockLimit =
        newCart[index].stock_bar !== null &&
        newCart[index].stock_bar !== undefined;
      const presentationId = String(
        newCart[index].presentacion_id ||
          newCart[index].id ||
          newCart[index].id_producto,
      );
      const reservedElsewhere = newCart.reduce(
        (total, item, itemIndex) =>
          itemIndex !== index &&
          item.tipo_venta !== "shot" &&
          String(item.presentacion_id || item.id || item.id_producto) ===
            presentationId
            ? total + Number(item.quantity || item.cantidad || 0)
            : total,
        0,
      );
      const maxQty = esShot
        ? 99
        : hasStockLimit
          ? Math.max(0, stockBar - reservedElsewhere)
          : Number.MAX_SAFE_INTEGER;
      if (maxQty < 1 && newQty >= newCart[index].quantity) {
        showToast(
          "Sin stock en bar",
          "Este producto ya no tiene unidades disponibles.",
        );
        return;
      }
      if (newQty > maxQty)
        showToast(
          "Stock insuficiente",
          `Máximo ${maxQty} unidades disponibles.`,
        );
      newCart[index].quantity = Math.min(newQty, maxQty);
      const item = newCart[index];
      const currentHostesses = Array.isArray(item.anfitrionas)
        ? item.anfitrionas
        : [];
      if (currentHostesses.length > 0 && !isChampagneProduct(item)) {
        const bottlePrice = resolverVentaProducto(
          item,
          "botella",
        ).precioBotella;
        if (roomRequiredForSalePrice(bottlePrice)) {
          const explicitMax = Number(item.max_anfitrionas);
          const hostessLimit = Math.min(
            explicitMax > 0 ? explicitMax : newCart[index].quantity,
            newCart[index].quantity,
          );
          if (currentHostesses.length > hostessLimit) {
            item.anfitrionas = currentHostesses.slice(0, hostessLimit);
            item.hostessNames =
              item.anfitrionas
                .map(
                  (hostessId: string | number) =>
                    anfitrionas.find(
                      (person: any) =>
                        String(person.id_usuario || person.id) ===
                        String(hostessId),
                    )?.nick || "",
                )
                .filter(Boolean)
                .join(", ") || null;
            showToast(
              "Anfitrionas actualizadas",
              `Se ajustó la asignación al nuevo máximo de ${hostessLimit}.`,
              "info",
            );
          }
        }
      }
      dispatch({ type: "SET_CART", payload: newCart });
      cartRef.current = newCart;
    },
    [cart, anfitrionas],
  );

  const handleSubmit = useCallback(async () => {
    if (servicioId && (!servicioListo || !blockOffline("servicio")))
      return showToast(
        "Servicio",
        "Se necesita cargar el servicio activo para registrar esta venta",
      );
    if (cajaAbierta === false) return showToast("Error", "Caja cerrada");
    if (cart.length === 0) return showToast("Error", "Carrito vacío");
    // Última barrera: una champaña sin tabla de precios ni máximo configurado no
    // se puede cobrar (misma regla y mensaje que el dashboard).
    for (const item of cart) {
      if (item.tipo_venta === "shot" || !isChampagneProduct(item)) continue;
      const tiers = await getSaleTiers(
        String(item.producto_id || item.id_producto || item.id),
      );
      if (faltaConfiguracionChampagne(item.max_anfitrionas, tiers)) {
        return showToast(
          "Champaña sin configurar",
          MENSAJE_CHAMPAGNE_SIN_CONFIGURAR,
        );
      }
    }
    if (
      cart.some(
        (p) =>
          p.tipo_venta !== "shot" &&
          bottleMixerUnits(p) > 0 &&
          !p.acompanamiento_botella?.presentacion_id,
      )
    ) {
      showToast("Error", "Selecciona el acompa\u00f1amiento de botella");
      return;
    }
    if (
      cart.some(
        (p) =>
          requiresShortMixer(p) &&
          (!p.acompanamiento_corto?.presentacion_id ||
            !Number.isInteger(p.acompanamiento_corto.unidades ?? 1) ||
            (p.acompanamiento_corto.unidades ?? 1) < 1),
      )
    )
      return showToast(
        "Falta acompa\u00f1amiento",
        "Selecciona soda o gaseosa para entregar completo",
      );
    if (!metodoPago)
      return showToast("Método requerido", "Selecciona un método de pago");

    if (metodoPago === "mixto") {
      const suma = pagosMixtos.reduce((s, p) => s + p.monto, 0);
      if (Math.abs(suma - totals.total) > 1) {
        return showToast(
          "Monto Incorrecto",
          `La suma ($${suma.toLocaleString()}) debe ser igual al total ($${totals.total.toLocaleString()})`,
        );
      }
      if (pagosMixtos.length < 2) {
        return showToast(
          "Métodos Insuficientes",
          "Selecciona al menos 2 métodos de pago",
        );
      }
    }

    if (metodoPago === "prepago" && !selectedCliente) {
      return showToast("Error", "Seleccione un cliente para pagar con prepago");
    }
    if (
      metodoPago === "prepago" &&
      Number(
        selectedCliente?.saldo ?? (selectedCliente as any)?.saldo_prepago ?? 0,
      ) < totals.total
    ) {
      return showToast(
        "Saldo insuficiente",
        "El saldo prepago del cliente no cubre el total de la venta",
      );
    }

    // El saldo prepago vive en el servidor y no se puede descontar en el
    // dispositivo: una venta prepago sin red podría sobregirar al cliente. Se
    // bloquea en vez de encolarse.
    if (metodoPago === "prepago" && !blockOffline("prepago")) return;

    dispatch({ type: "SET_SUBMITTING", payload: true });
    try {
      const payload = buildSalePayload({
        servicioId,
        servicioAnfitrionas:
          servicioId &&
          [...servicioAnfitrionas].sort().join(",") !==
            [...servicioAnfitrionasIniciales].sort().join(",")
            ? servicioAnfitrionas
            : undefined,
        cart,
        selectedCliente,
        selectedHabitacion,
        metodoPago,
        pagosMixtos,
        totals,
        selectedTime,
        hasCommissionItem,
      });

      const items = cart.reduce(
        (acc: number, item: any) =>
          acc + Number(item.quantity || item.cantidad || 0),
        0,
      );

      // La venta se encola SIEMPRE, haya red o no: una sola ruta de código. El
      // id de la intención viaja como clave de idempotencia, así que un corte
      // después de cobrar no duplica la venta al reintentar.
      const intent = await getOutbox().enqueueAndSend({
        type: "sale.create",
        payload,
        label: `Venta $${Number(totals.total || 0).toLocaleString("es-CL")} · ${items} ítem(s)`,
      });

      if (intent.status !== "fallida") {
        const userId = useAuthStore.getState().user?.id;
        if (userId)
          await AsyncStorage.removeItem(
            `cart-draft:${userId}:sales:${servicioId || "general"}`,
          ).catch(() => {});
      }
      if (intent.status === "aplicada") {
        dispatch({ type: "SET_CART", payload: [] });
        showToast("Éxito", "Venta realizada", "success");
        refreshVentas();
        router.replace(servicioId ? "/cajero/servicios" : "/cajero/ventas");
        return;
      }

      if (intent.status === "fallida") {
        showToast("Error", intent.lastError || "Error al vender");
        return;
      }

      dispatch({ type: "SET_CART", payload: [] });
      // Quedó pendiente: la venta está guardada y sale al volver la red.
      showToast(
        "Venta guardada en el dispositivo",
        "Se enviará automáticamente cuando vuelva la conexión",
        "info",
      );
      refreshVentas();
      router.replace("/cajero/ventas");
    } catch (error) {
      logger.captureException(error, { context: "NuevaVenta:processVenta" });
      showToast("Error", "Error de conexión");
    } finally {
      dispatch({ type: "SET_SUBMITTING", payload: false });
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
    servicioId,
    servicioListo,
    servicioAnfitrionas,
    servicioAnfitrionasIniciales,
    getSaleTiers,
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

      if (servicioId)
        setServicioAnfitrionas((current) => [
          ...new Set([
            ...current.filter(
              (uid) =>
                !currentSelected.includes(uid) || newSelected.includes(uid),
            ),
            ...newSelected,
          ]),
        ]);
      dispatch({
        type: "SET_MODAL_HOSTESSES",
        productId: String(pid),
        hostesses: newSelected,
      });
    },
    [hostessSelectionTarget, modalHostessSelections, servicioId],
  );

  // ── Búsqueda de productos (espejo de NewSaleSearch del dashboard) ────
  // `GET /products?for_sale=1&term=` con debounce de 300 ms.
  const [searchProducto, setSearchProducto] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortController = useRef<AbortController | null>(null);
  const searchSeq = useRef(0);
  const setSearchProductoInput = useCallback((value: string) => {
    searchAbortController.current?.abort();
    searchAbortController.current = null;
    setSearchProducto(value);
    if (value.trim()) {
      setSearchLoading(true);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = null;
    searchSeq.current++;
    setSearchResults([]);
    setSearchLoading(false);
  }, []);

  const executeSearch = useCallback(async (term: string, seq: number) => {
    searchAbortController.current?.abort();
    const controller = new AbortController();
    searchAbortController.current = controller;
    try {
      const res = await apiClientSafe(
        `/products?for_sale=1&term=${encodeURIComponent(term)}`,
        { signal: controller.signal },
      );
      // Una respuesta vieja no pisa los resultados del término vigente.
      if (seq !== searchSeq.current) return;
      if ((res as any)?.success && Array.isArray((res as any).data)) {
        setSearchResults(
          filterForSaleProducts((res as any).data).map(mapForSaleProduct),
        );
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      logger.fetchError(error, { context: "NuevaVenta:searchProducts" });
    } finally {
      if (!controller.signal.aborted && seq === searchSeq.current) {
        if (searchAbortController.current === controller) {
          searchAbortController.current = null;
        }
        setSearchLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const term = searchProducto.trim();
    const seq = ++searchSeq.current;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = null;
    if (!term) return;
    searchTimeout.current = setTimeout(() => {
      searchTimeout.current = null;
      void executeSearch(term, seq);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchProducto, executeSearch]);

  useEffect(
    () => () => {
      searchSeq.current++;
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchAbortController.current?.abort();
    },
    [],
  );

  const handleSearchNow = useCallback(() => {
    const term = searchProducto.trim();
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = null;
    const seq = ++searchSeq.current;
    if (!term) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    void executeSearch(term, seq);
  }, [searchProducto, executeSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchProductoInput("");
  }, [setSearchProductoInput]);

  return {
    servicioId,
    servicioNombre,
    servicioAnfitrionas: [
      ...new Set([...servicioAnfitrionasIniciales, ...servicioAnfitrionas]),
    ],
    state,
    dispatch,
    totals,
    hasCommissionItem,
    fromCache,
    isTablet: false,
    fetchInitialData,
    onRefresh,
    refreshCajaStatus,
    handleLoadPrepago,
    handleOpenCategory,
    handlePressAddProduct,
    addProductToCart,
    handleSetSaleChoice,
    saleChoices,
    removeFromCart,
    updateQuantity,
    handleSubmit,
    handleToggleHostess,
    searchProducto,
    setSearchProducto: setSearchProductoInput,
    searchResults,
    searchLoading,
    handleSearchNow,
    handleClearSearch,
  };
}
