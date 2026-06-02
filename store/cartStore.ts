import { create } from 'zustand';
import { CartItem, Product } from '@/components/shared/ProductCard';
import { OrderCreateSchema, type OrderCreateType } from '@lasmunecasderamon/validations';

interface BuildOrderParams {
  meseroId: string;
  codigo: string;
  clienteId?: string | null;
  device_date?: string;
}

type BuildOrderResult = {
  success: true;
  data: OrderCreateType;
} | {
  success: false;
  errors: string[];
}

interface CartState {
    cart: CartItem[];
    tipEnabled: boolean;
    addToCart: (product: Product) => void;
    removeFromCart: (productId: string) => void;
    updateItemHostesses: (productId: string, hostessIds: string[]) => void;
    updateItemRoom: (productId: string, roomId: string | null) => void;
    setTipEnabled: (enabled: boolean) => void;
    clearCart: () => void;
    getTotal: () => number;
    getSubtotal: () => number;
    getTipAmount: () => number;
    buildOrderPayload: (params: BuildOrderParams) => BuildOrderResult;
}

const isChampagne = (product: Product) => {
    const cat = (product.categoria || '').toLowerCase();
    return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
};

export const useCartStore = create<CartState>((set, get) => ({
    cart: [],
    tipEnabled: false,

    addToCart: (product) => {
        set((state) => {
            const idx = state.cart.findIndex((i) => i.product.id === product.id);
            if (idx >= 0) {
                const updated = [...state.cart];
                updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
                return { cart: updated };
            }
            return {
                cart: [...state.cart, { product, quantity: 1, selectedHostesses: [], selectedRoom: null }],
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
                };
            } else {
                updated.splice(idx, 1);
            }
            return { cart: updated };
        });
    },

    updateItemHostesses: (productId, hostessIds) => {
        set((state) => ({
            cart: state.cart.map((i) =>
                i.product.id === productId ? { ...i, selectedHostesses: hostessIds } : i
            ),
        }));
    },

    updateItemRoom: (productId, roomId) => {
        set((state) => ({
            cart: state.cart.map((i) =>
                i.product.id === productId ? { ...i, selectedRoom: roomId } : i
            ),
        }));
    },

    setTipEnabled: (enabled) => set({ tipEnabled: enabled }),

    clearCart: () => set({ cart: [], tipEnabled: false }),

    getSubtotal: () => {
        return get().cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
    },

    getTipAmount: () => {
        const subtotal = get().getSubtotal();
        return get().tipEnabled ? subtotal * 0.1 : 0;
    },

    getTotal: () => {
        return get().getSubtotal() + get().getTipAmount();
    },

    buildOrderPayload: (params) => {
        const { meseroId, codigo, clienteId, device_date } = params;
        const state = get();
        const subtotal = state.getSubtotal();
        const tipAmount = state.getTipAmount();
        const total = state.getTotal();
        const totalComision = state.cart.reduce((s, i) => s + (i.product.commission || 0) * i.quantity, 0);

        const orderData = {
            codigo,
            meseroId,
            clienteId: clienteId ?? null,
            subtotal,
            total,
            propina: tipAmount,
            totalComision,
            device_date,
            detalles: state.cart.map(item => ({
                productoId: item.product.id,
                precio: item.product.price,
                comision: item.product.commission || 0,
                cantidad: item.quantity,
                subtotal: item.product.price * item.quantity,
                generaComision: (item.product.commission || 0) > 0 ? 1 : 0,
                hostessId: item.selectedHostesses.length === 1 ? item.selectedHostesses[0] : null,
                selectedHostesses: item.selectedHostesses.map(String),
                roomId: item.selectedRoom,
            })),
            usuarios: Array.from(new Set(state.cart.flatMap(i => i.selectedHostesses))).map(id => ({ usuarioId: id })),
        };

        const parsed = OrderCreateSchema.safeParse(orderData);
        if (!parsed.success) {
            return {
                success: false,
                errors: parsed.error.issues.map(e => `"${e.path.join('.')}": ${e.message}`),
            };
        }

        return { success: true, data: parsed.data };
    },
}));

