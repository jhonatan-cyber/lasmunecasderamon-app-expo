import { apiClientSafe } from "@/api/client";
import logger from "@/utils/logger";
import type { Habitacion, Anfitriona, Cliente, Producto, Categoria, CartItem } from "@lasmunecasderamon/types";
import { showToast, isChampagneProduct, getChampagneLimit, getHostessLimit, buildCommissionPreview } from "./cuentaUtils";

export { showToast, isChampagneProduct, getChampagneLimit, getHostessLimit, buildCommissionPreview };

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
 * Opens a category modal and fetches its products.
 */
export const openCategory = async (
  cat: Categoria,
  dispatch: React.Dispatch<any>,
) => {
  dispatch({ type: "SET_MODAL_LOADING", payload: true });
  dispatch({ type: "SET_MODAL_VISIBLE", modal: "category", visible: true });
  try {
    const res = await apiClientSafe(`/products?category_id=${cat.id}`);
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
      selectedHostesses: selectedHostesses,
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
