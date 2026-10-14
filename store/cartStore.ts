import { resolverVentaProducto } from "@/hooks/utils/saleChoice";
import { apiClientSafe } from "@/api/client";
import {
  requiresShortMixer,
  bottleMixerUnits,
} from "@/hooks/utils/productConfiguration";
import { saleInventoryFields } from "@/hooks/utils/saleInventoryFields";
import { create } from "zustand";
import type { CartItem, Product } from "@/types/cart";
import {
  OrderCreateSchema,
  type OrderCreateType,
} from "@lasmunecasderamon/validations";

interface BuildOrderParams {
  meseroId: string;
  codigo: string;
  clienteId?: string | null;
  device_date?: string;
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
  updateItemRoom: (productId: string, roomId: string | null) => void;
  setTipEnabled: (enabled: boolean) => void;
  setTipPercentage: (percentage: number) => void;
  splitShorts: () => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getTipAmount: () => number;
  buildOrderPayload: (params: BuildOrderParams) => BuildOrderResult;
}

const hostessRequests = new Map<string, number>();

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  tipEnabled: false,
  tipPercentage: 10,

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
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity - 1,
          selectedHostesses:
            updated[idx].product.tipo_venta === "shot"
              ? updated[idx].selectedHostesses.slice(
                  0,
                  updated[idx].quantity - 1,
                )
              : updated[idx].selectedHostesses,
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
        if (!result.success) return;
        const tier = (result.data || []).find(
          (row: any) => Number(row.anfitrionas) === hostessIds.length,
        );
        if (tier) {
          price = Number(tier.precio);
          commission = Number(tier.comision);
        }
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
        item.product.id !== productId
          ? item
          : {
              ...item,
              product: {
                ...item.product,
                ...(item.product.tipo_venta === "shot"
                  ? { acompanamiento_corto: mixer }
                  : {
                      acompanamiento_botella: {
                        ...mixer,
                        unidades: bottleMixerUnits(item.product),
                      },
                    }),
              },
            },
      ),
    })),

  setTipEnabled: (enabled) => set({ tipEnabled: enabled }),

  setTipPercentage: (percentage) => set({ tipPercentage: percentage }),

  splitShorts: () =>
    set((state) => ({
      cart: state.cart.flatMap((item) =>
        item.product.tipo_venta === "shot" && item.quantity > 1
          ? Array.from({ length: item.quantity }, (_, index) => ({
              ...item,
              quantity: 1,
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
              },
            }))
          : [item],
      ),
    })),
  clearCart: () => set({ cart: [], tipEnabled: false }),

  getSubtotal: () => {
    return get().cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  },

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
    const { meseroId, codigo, clienteId, device_date } = params;
    const state = get();
    if (
      state.cart.some(
        ({ product }) =>
          (requiresShortMixer(product) &&
            !product.acompanamiento_corto?.presentacion_id) ||
          (product.tipo_venta !== "shot" &&
            bottleMixerUnits(product) > 0 &&
            !product.acompanamiento_botella?.presentacion_id),
      )
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
      device_date,
      detalles: state.cart.map((item) => ({
        ...saleInventoryFields(item.product),
        productoId: item.product.producto_id || item.product.id,
        precio: item.product.price,
        comision: (item.product.commission || 0) * item.quantity,
        cantidad: item.quantity,
        subtotal: item.product.price * item.quantity,
        generaComision: (item.product.commission || 0) > 0 ? 1 : 0,
        hostessId:
          item.selectedHostesses.length === 1
            ? String(item.selectedHostesses[0])
            : null,
        selectedHostesses: item.selectedHostesses.map(String),
        roomId: item.selectedRoom,
      })),
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
