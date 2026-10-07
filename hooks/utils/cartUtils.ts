import { apiClientSafe } from "@/api/client";
import logger from "@/utils/logger";
import type { Habitacion, Anfitriona, Cliente, Producto, Categoria, CartItem } from "@lasmunecasderamon/types";
import { showToast, isChampagneProduct, getHostessLimit, buildCommissionPreview, buildConsumptionsPayload, isExpensiveDrink, setExpensiveDrinkThreshold, getCardSplit, setCardSplit, getIvaDecimal, getIvaPercent, setIvaRate } from "./cuentaUtils";

export { showToast, isChampagneProduct, getHostessLimit, buildCommissionPreview, buildConsumptionsPayload, isExpensiveDrink, setExpensiveDrinkThreshold, getCardSplit, setCardSplit, getIvaDecimal, getIvaPercent, setIvaRate };
export type { CuentaUpdateDetalle, CuentaUpdatePayload } from "./cuentaUtils";

// Alias para backward compat — getChampagneLimit == getHostessLimit
export const getChampagneLimit = getHostessLimit;



/** Generic API response shape */
interface ApiListResponse<T> {
  success: boolean;
  data: T[];
}

/**
 * Normalizes a raw room object from the API into a consistent Habitacion shape.
 */
export const normalizeRoom = (room: Record<string, unknown>): Habitacion => ({
  id: (room.id_habitacion ?? room.id ?? 0) as number | string,
  id_habitacion: room.id_habitacion as number | string | undefined,
  nombre: (room.nombre ?? room.name ?? `Habitación ${room.id_habitacion ?? room.id ?? ""}`) as string,
  precio: Number(room.precio ?? room.price ?? 0),
  tiempo: Number(room.tiempo ?? room.time ?? 0),
  estado: Number(room.estado ?? room.status ?? 0),
  comision_anfitriona: Number(room.comision_anfitriona ?? 0),
});

/**
 * Normalizes clients from API response (handles both array and { success, data } shapes).
 */
export const normalizeClients = (clientsRes: unknown): Cliente[] => {
  if (Array.isArray(clientsRes)) return clientsRes as Cliente[];
  const res = clientsRes as Partial<ApiListResponse<Cliente>> | undefined;
  if (res?.success) return (res.data || []) as Cliente[];
  return [];
};

/**
 * Normalizes anfitrionas from API response.
 */
export const normalizeAnfitrionas = (res: unknown): Anfitriona[] => {
  if (Array.isArray(res)) return res as Anfitriona[];
  const r = res as Partial<ApiListResponse<Anfitriona>> | undefined;
  return r?.success ? (r.data || []) : [];
};

/**
 * Deduplicates an array by a given key.
 */
export const deduplicate = <T extends Record<string, unknown> | Anfitriona | Cliente>(arr: T[], idKey: string): T[] => {
  const seen = new Set<string>();
  return arr.filter((item: any) => {
    const id = String(item[idKey] || item.id || "");
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/**
 * Normaliza una fila de `GET /products?for_sale=1` al shape del carro
 * (espejo de `mapForSaleToCartItem` del dashboard): id = presentación,
 * nombre = producto + presentación, precio = `precio_venta`, comisión 0 en
 * venta simple (≤ umbral `umbral_simple_hasta`, default 10000) y stock en el
 * bar para el tope de cantidad.
 */
export const mapForSaleProduct = (raw: any) => {
  const presentacionId = String(raw?.presentacion_id ?? "");
  const productoId = String(raw?.producto_id ?? raw?.id_producto ?? "");
  const nombre = [String(raw?.producto_nombre ?? ""), String(raw?.presentacion_nombre ?? "")]
    .filter(Boolean)
    .join(" ")
    .trim();
  const precio = Number(raw?.precio_venta ?? 0);
  const comision = precio <= 10000 ? 0 : Number(raw?.comision ?? 0);
  return {
    ...raw,
    id: presentacionId,
    presentacion_id: presentacionId,
    producto_id: productoId,
    id_producto: productoId,
    nombre,
    name: nombre,
    precio,
    price: precio,
    comision,
    commission: comision,
    categoria: raw?.categoria_nombre || "",
    stock_bar: Number(raw?.stock_bar ?? 0),
    tipo_venta: "botella" as const,
  };
};

/**
 * Etiqueta de la botella abierta de una presentación (espejo del buscador rápido
 * del dashboard): ml que quedan en el bar y shots aproximados, con el ml por shot
 * propio del producto o el global de Configuraciones (`bar.shot_ml`). Devuelve
 * `null` cuando no hay botella abierta, para no pintar la línea.
 */
export const formatBotellaAbierta = (
  mlAbierta: number | null | undefined,
  mlShot: number | null | undefined,
  globalShotMl: number,
): string | null => {
  const ml = Number(mlAbierta ?? 0);
  if (!(ml > 0)) return null;
  const mlPorShot = Number(mlShot ?? 0) > 0 ? Number(mlShot) : Number(globalShotMl ?? 0);
  return mlPorShot > 0
    ? `Botella abierta: ${ml} ml · ≈${Math.floor(ml / mlPorShot)} shots`
    : `Botella abierta: ${ml} ml`;
};

/**
 * Opens a category modal and fetches its products.
 * `forSale` usa el catálogo de venta del bar (presentaciones con stock real,
 * el mismo endpoint que el dashboard); sin él se conserva el catálogo admin
 * que usan los flujos de cuentas.
 */
export const openCategory = async (
  cat: Categoria,
  dispatch: React.Dispatch<any>,
  options?: { forSale?: boolean },
) => {
  dispatch({ type: "SET_MODAL_LOADING", payload: true });
  dispatch({ type: "SET_MODAL_VISIBLE", modal: "category", visible: true });
  try {
    const res = await apiClientSafe(
      options?.forSale
        ? `/products?for_sale=1&category_id=${cat.id}`
        : `/products?category_id=${cat.id}`,
    );
    if (res.success) {
      const data = (res.data as any[]) || [];
      const products = options?.forSale ? data.map(mapForSaleProduct) : data;
      dispatch({
        type: "OPEN_CATEGORY_MODAL",
        category: cat,
        products,
      });
    } else {
      showToast("Error", "No se pudieron cargar los productos");
    }
  } catch (error) {
    logger.fetchError(error, {
      context: "CartUtils:handleOpenCategory",
    });
  } finally {
    dispatch({ type: "SET_MODAL_LOADING", payload: false });
  }
};

/**
 * Adds a product to the cart, handling hostess name resolution, quantity accumulation,
 * and champagne detection.
 */
export const addProductToCartUtils = (
  prod: Producto,
  cart: CartItem[],
  modalQuantities: Record<string | number, number>,
  modalHostessSelections: Record<string | number, (string | number)[]>,
  anfitrionas: Anfitriona[],
  dispatch: React.Dispatch<any>,
) => {
  const id = prod.id || prod.id_producto;
  const totalQty = id ? (modalQuantities[id] || 1) : 1;
  const selectedHostesses = id ? (modalHostessSelections[id] || []) : [];

  const price = prod.precio ?? prod.price ?? 0;
  const comm = prod.comision ?? prod.commission ?? 0;

  const newCart = [...cart];

  const hostessNames =
    selectedHostesses.length > 0
      ? selectedHostesses
          .map(
            (hId: string | number) =>
              anfitrionas.find(
                (a) => String(a.id_usuario || a.id) === String(hId),
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
      id_producto: id ?? "",
      nombre: prod.nombre || prod.name || "Producto",
      precio: price,
      comision: comm,
      cantidad: totalQty,
      subtotal: price * totalQty,
      selectedHostesses: selectedHostesses.map(h => Number(h)),
      hostessNames: hostessNames || null,
      isChampagne: isChampagneProduct(prod),
    });
  }

  dispatch({ type: "SET_CART", payload: newCart });
  showToast(
    "Agregado",
    `${prod.nombre || prod.name} sumado a la cuenta`,
    "success",
  );
};
