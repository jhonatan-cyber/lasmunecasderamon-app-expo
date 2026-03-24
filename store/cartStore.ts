import { create } from 'zustand';
import { CartItem, Product } from '@/components/shared/ProductCard';

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
}));

