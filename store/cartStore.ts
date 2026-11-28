import { resolverVentaProducto } from "@/hooks/utils/saleChoice";
import { getHostessLimit } from "@/hooks/utils/cuentaUtils";
import { apiClientSafe } from "@/api/client";
import {
  requiresShortMixer,
  bottleMixerUnits,
  totalUnidadesAcompanamientoBotella,
} from "@/hooks/utils/productConfiguration";
import { saleInventoryFields } from "@/hooks/utils/saleInventoryFields";
import { recargoAcompanamientoDeProducto } from "@/hooks/utils/recargoAcompanamiento";
import { create } from "zustand";
import type {
  AcompanamientoBotellaItem,
  AcompanamientoCorto,
  CartItem,
  MetodoPagoPedido,
  Product,
} from "@/types/cart";
import {
  OrderCreateSchema,
  type OrderCreateType,
} from "@lasmunecasderamon/validations";

interface BuildOrderParams {
  meseroId: string;
  codigo: string;
  clienteId?: string | null;
  device_date?: string;
  metodoPago?: "efectivo" | "tarjeta" | "transferencia";
  baucherFoto?: string | null;
}

type BuildOrderResult =
  | {
    success: true;
    data: OrderCreateType;
  }
  | {
    success: false;
    errors: string[];
  };

interface CartState {
  cart: CartItem[];
  tipEnabled: boolean;
  tipPercentage: number;
  metodoPago: MetodoPagoPedido;
  baucherFoto: string | null;
  selectedClientId: string | null;
  /** Precio máximo de acompañamiento incluido; 0 desactiva la regla. */
  topeAcompanamiento: number;
  setTopeAcompanamiento: (tope: number) => void;
  setMetodoPago: (metodo: MetodoPagoPedido) => void;
  setBaucherFoto: (foto: string | null) => void;
  setSelectedClientId: (clientId: string | null) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateItemHostesses: (
    productId: string,
    hostessIds: (string | number)[],
  ) => void;
  updateItemMixer: (
    productId: string,
    mixer: NonNullable<Product["acompanamiento_corto"]>,
  ) => void;
  /** Reemplaza la bebida elegida para cada unidad de corto. */
  updateItemShortMixers: (
    productId: string,
    mixers: (AcompanamientoCorto | undefined)[],
  ) => void;
  updateItemBottleMixers: (
    productId: string,
    sabores: AcompanamientoBotellaItem[],
  ) => void;
  updateItemRoom: (productId: string, roomId: string | null) => void;
  setTipEnabled: (enabled: boolean) => void;
  setTipPercentage: (percentage: number) => void;
  splitShorts: () => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getAcompanamientoRecargo: (tope?: number) => number;
  getTipAmount: () => number;
  buildOrderPayload: (params: BuildOrderParams) => BuildOrderResult;
}

const hostessRequests = new Map<string, number>();

/**
 * Bebida de cada unidad de corto. Los items antiguos guardaban una sola bebida
 * en `product.acompanamiento_corto`; se replica para no perder esa selección.
 */
function shortMixersForItem(
  item: CartItem,
): (AcompanamientoCorto | undefined)[] {
  const count = Math.max(0, Math.floor(Number(item.quantity) || 0));
  if (item.shortMixers !== undefined) {
    return Array.from({ length: count }, (_, index) => item.shortMixers?.[index]);
  }
  return Array.from(
    { length: count },
    () => item.product.acompanamiento_corto,
  );
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  tipEnabled: false,
  tipPercentage: 10,
  metodoPago: "efectivo",
  baucherFoto: null,
  selectedClientId: null,
  topeAcompanamiento: 0,

  setTopeAcompanamiento: (tope) =>
    set({ topeAcompanamiento: Number(tope) || 0 }),
  setMetodoPago: (metodoPago) => set({ metodoPago }),
  setBaucherFoto: (baucherFoto) => set({ baucherFoto }),
  setSelectedClientId: (selectedClientId) => set({ selectedClientId }),

  addToCart: (product) => {
    set((state) => {
      const idx = state.cart.findIndex((i) => i.product.id === product.id);
      const reserved = state.cart
        .filter(
          (i) =>
            i.product.presentacion_id === product.presentacion_id &&
            i.product.tipo_venta !== "shot",
        )
        .reduce((sum, i) => sum + i.quantity, 0);
      if (
        product.tipo_venta === "shot"
          ? Number(state.cart[idx]?.quantity ?? 0) >= 99
          : product.stock_bar !== undefined && reserved >= product.stock_bar
      )
        return state;
      if (idx >= 0) {
        const updated = [...state.cart];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return { cart: updated };
      }
      return {
        cart: [
          ...state.cart,
          { product, quantity: 1, selectedHostesses: [], selectedRoom: null },
        ],
      };
    });
  },

  removeFromCart: (productId) => {
    set((state) => {
      const idx = state.cart.findIndex((i) => i.product.id === productId);
      if (idx < 0) return state;

      const updated = [...state.cart];
      if (updated[idx].quantity > 1) {
        const item = updated[idx];
        const nextQuantity = item.quantity - 1;
        // Las anfitrionas y los acompañamientos se asignan por unidad (o por
        // unidad de botella en los productos con máximo configurado). Al bajar
        // la cantidad se recortan para que no queden asignaciones de más.
        const hostessLimit =
          item.product.tipo_venta === "shot"
            ? nextQuantity
            : getHostessLimit(item.product, nextQuantity);
        updated[idx] = {
          ...item,
          quantity: nextQuantity,
          selectedHostesses: item.selectedHostesses.slice(
            0,
            Math.max(0, hostessLimit),
          ),
          ...(item.shortMixers !== undefined
            ? {
                shortMixers: item.shortMixers.slice(0, nextQuantity),
              }
            : {}),
        };
      } else {
        updated.splice(idx, 1);
      }
      return { cart: updated };
    });
  },

  updateItemHostesses: async (productId, hostessIds) => {
    const request = (hostessRequests.get(productId) ?? 0) + 1;
    hostessRequests.set(productId, request);
    const original = get().cart.find((item) => item.product.id === productId);
    if (!original) return;
    if (original.product.tipo_venta === "shot") {
      if (!original.product.shot_anfitriona) hostessIds = [];
      else hostessIds = [...new Set(hostessIds)].slice(0, original.quantity);
    }
    let product = original.product;
    if (product.presentacion_id && product.tipo_venta !== "shot") {
      const base = resolverVentaProducto(product, "botella");
      let price = base.precio,
        commission = base.comision;
      if (hostessIds.length > 0) {
        const result = await apiClientSafe<any>(
          `/products/${encodeURIComponent(product.producto_id || product.id)}/tiers?configurados=1`,
        );
        if (result.success) {
          const tier = (result.data || []).find(
            (row: any) => Number(row.anfitrionas) === hostessIds.length,
          );
          if (tier) {
            price = Number(tier.precio);
            commission = Number(tier.comision);
          }
        }
        // Si la API falla, se usan los precios base (no se bloquea la selección).
      }
      product = { ...product, price, commission };
    }
    if (hostessRequests.get(productId) !== request) return;
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id === productId
          ? { ...item, product, selectedHostesses: hostessIds }
          : item,
      ),
    }));
  },

  updateItemRoom: (productId, roomId) => {
    set((state) => ({
      cart: state.cart.map((i) =>
        i.product.id === productId ? { ...i, selectedRoom: roomId } : i,
      ),
    }));
  },

  updateItemMixer: (productId, mixer) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id !== productId || item.product.tipo_venta !== "shot"
          ? item
          : {
              ...item,
              shortMixers: Array.from(
                { length: item.quantity },
                () => mixer,
              ),
              product: { ...item.product, acompanamiento_corto: mixer },
            },
      ),
    })),

  updateItemShortMixers: (productId, mixers) =>
    set((state) => ({
      cart: state.cart.map((item) => {
        if (
          item.product.id !== productId ||
          item.product.tipo_venta !== "shot"
        )
          return item;
        const normalized = Array.from(
          { length: item.quantity },
          (_, index) => mixers[index],
        );
        return {
          ...item,
          shortMixers: normalized,
          product: {
            ...item.product,
            acompanamiento_corto: normalized[0],
          },
        };
      }),
    })),

  updateItemBottleMixers: (productId, sabores) =>
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id !== productId
          ? item
          : {
            ...item,
            product: { ...item.product, acompanamiento_botella: sabores },
          },
      ),
    })),

  setTipEnabled: (enabled) => set({ tipEnabled: enabled }),

  setTipPercentage: (percentage) => set({ tipPercentage: percentage }),

  splitShorts: () =>
    set((state) => ({
      cart: state.cart.flatMap((item) => {
        if (item.product.tipo_venta !== "shot" || item.quantity <= 1)
          return [item];
        const mixers = shortMixersForItem(item);
        return Array.from({ length: item.quantity }, (_, index) => ({
          ...item,
          quantity: 1,
          shortMixers: mixers[index] ? [mixers[index]] : [],
          selectedHostesses:
            item.selectedHostesses[index] === undefined
              ? []
              : [item.selectedHostesses[index]],
          product: {
            ...item.product,
            id:
              index === 0
                ? item.product.id
                : `${item.product.id}:unit:${Date.now()}:${index}`,
            acompanamiento_corto: mixers[index],
          },
        }));
      }),
    })),
  clearCart: () =>
    set({
      cart: [],
      tipEnabled: false,
      metodoPago: "efectivo",
      baucherFoto: null,
      selectedClientId: null,
    }),

  getSubtotal: () => {
    const state = get();
    const productsSubtotal = state.cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    return productsSubtotal + state.getAcompanamientoRecargo();
  },

  getAcompanamientoRecargo: (tope = get().topeAcompanamiento) =>
    get().cart.reduce((sum, item) => {
      if (item.product.tipo_venta === "shot") {
        return (
          sum +
          shortMixersForItem(item).reduce(
            (unitSum, mixer) =>
              unitSum +
              recargoAcompanamientoDeProducto(
                { ...item.product, acompanamiento_corto: mixer },
                tope,
              ),
            0,
          )
        );
      }
      return (
        sum +
        recargoAcompanamientoDeProducto(item.product, tope) *
          item.quantity
      );
    }, 0),

  getTipAmount: () => {
    const subtotal = get().getSubtotal();
    return get().tipEnabled
      ? Math.round((subtotal * get().tipPercentage) / 100)
      : 0;
  },

  getTotal: () => {
    return get().getSubtotal() + get().getTipAmount();
  },

  buildOrderPayload: (params) => {
    const {
      meseroId,
      codigo,
      clienteId,
      device_date,
      metodoPago = "efectivo",
      baucherFoto = null,
    } = params;
    const state = get();
    if (
      state.cart.some((item) => {
        if (
          requiresShortMixer(item.product) &&
          shortMixersForItem(item).some(
            (mixer) => !mixer?.presentacion_id,
          )
        )
          return true;
        return (
          item.product.tipo_venta !== "shot" &&
          bottleMixerUnits(item.product) > 0 &&
          totalUnidadesAcompanamientoBotella(
            item.product.acompanamiento_botella,
          ) !== bottleMixerUnits(item.product)
        );
      })
    ) {
      return {
        success: false,
        errors: ["Selecciona los acompa\u00f1amientos configurados"],
      };
    }
    const subtotal = state.getSubtotal();
    const tipAmount = state.getTipAmount();
    const total = state.getTotal();
    const totalComision = state.cart.reduce(
      (s, i) => s + (i.product.commission || 0) * i.quantity,
      0,
    );

    const orderData = {
      codigo,
      meseroId,
      clienteId: clienteId ?? null,
      subtotal,
      total,
      propina: tipAmount,
      totalComision,
      metodoPago,
      device_date,
      ...(baucherFoto ? { baucher_foto: baucherFoto } : {}),
      detalles: state.cart.flatMap((item) => {
        const buildDetalle = (
          quantity: number,
          mixer: AcompanamientoCorto | undefined,
          hostessIds: (string | number)[],
        ) => {
          // El recargo se calcula por unidad: cada corto puede llevar una
          // bebida distinta y solo las de cliente suman exceso sobre el tope.
          const recargo = recargoAcompanamientoDeProducto(
            { ...item.product, acompanamiento_corto: mixer },
            state.topeAcompanamiento,
          );
          const detalle = {
            ...saleInventoryFields(item.product),
            productoId: item.product.producto_id || item.product.id,
            precio: item.product.price,
            recargo_acompanamiento: recargo,
            comision: (item.product.commission || 0) * quantity,
            cantidad: quantity,
            subtotal: (item.product.price + recargo) * quantity,
            generaComision: (item.product.commission || 0) > 0 ? 1 : 0,
            hostessId:
              hostessIds.length === 1 ? String(hostessIds[0]) : null,
            selectedHostesses: hostessIds.map(String),
            roomId: item.selectedRoom,
          };
          if (item.product.tipo_venta === "shot") {
            if (mixer) detalle.acompanamiento_corto = mixer;
            else delete detalle.acompanamiento_corto;
          }
          return detalle;
        };

        if (item.product.tipo_venta !== "shot") {
          return [
            buildDetalle(item.quantity, undefined, item.selectedHostesses),
          ];
        }
        const mixers = shortMixersForItem(item);
        return Array.from({ length: item.quantity }, (_, index) =>
          buildDetalle(
            1,
            mixers[index],
            item.selectedHostesses[index] === undefined
              ? []
              : [item.selectedHostesses[index]],
          ),
        );
      }),
      usuarios: Array.from(
        new Set(state.cart.flatMap((i) => i.selectedHostesses)),
      ).map((id) => ({ usuarioId: String(id) })),
    };

    const parsed = OrderCreateSchema.safeParse(orderData);
    if (!parsed.success) {
      return {
        success: false,
        errors: parsed.error.issues.map(
          (e) => `"${e.path.join(".")}": ${e.message}`,
        ),
      };
    }

    return { success: true, data: parsed.data };
  },
}));
