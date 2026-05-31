import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/store/cartStore';

const mockProduct = {
    id: 'prod-1',
    name: 'Cerveza Corona',
    price: 15000,
    categoria: 'Bebidas',
};

const mockChampagne = {
    id: 'prod-2',
    name: 'Champagne Moët',
    price: 85000,
    categoria: 'Champaña',
};

describe('cartStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        useCartStore.setState({ cart: [], tipEnabled: false });
    });

    // ─── Initial State ───
    it('debe iniciar con carrito vacío y tip deshabilitado', () => {
        const state = useCartStore.getState();
        expect(state.cart).toEqual([]);
        expect(state.tipEnabled).toBe(false);
    });

    // ─── addToCart ───
    it('addToCart: debe agregar un producto nuevo al carrito', () => {
        useCartStore.getState().addToCart(mockProduct);
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(1);
        expect(cart[0].product).toEqual(mockProduct);
        expect(cart[0].quantity).toBe(1);
    });

    it('addToCart: debe incrementar quantity si el producto ya existe', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().addToCart(mockProduct);
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(2);
    });

    it('addToCart: debe manejar múltiples productos distintos', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().addToCart(mockChampagne);
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(2);
        expect(cart[0].quantity).toBe(1);
        expect(cart[1].quantity).toBe(1);
    });

    // ─── removeFromCart ───
    it('removeFromCart: debe decrementar quantity si > 1', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().removeFromCart('prod-1');
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(1);
    });

    it('removeFromCart: debe eliminar el item si quantity es 1', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().removeFromCart('prod-1');
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(0);
    });

    it('removeFromCart: no debe hacer nada si el producto no existe', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().removeFromCart('non-existent');
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(1);
    });

    // ─── updateItemHostesses ───
    it('updateItemHostesses: debe actualizar las anfitrionas seleccionadas', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().updateItemHostesses('prod-1', ['hostess-1', 'hostess-2']);
        const cart = useCartStore.getState().cart;
        expect(cart[0].selectedHostesses).toEqual(['hostess-1', 'hostess-2']);
    });

    it('updateItemHostesses: no debe afectar otros items', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().addToCart(mockChampagne);
        useCartStore.getState().updateItemHostesses('prod-1', ['hostess-1']);
        const cart = useCartStore.getState().cart;
        expect(cart[0].selectedHostesses).toEqual(['hostess-1']);
        expect(cart[1].selectedHostesses).toEqual([]);
    });

    // ─── updateItemRoom ───
    it('updateItemRoom: debe actualizar la habitación seleccionada', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().updateItemRoom('prod-1', 'room-vip');
        const cart = useCartStore.getState().cart;
        expect(cart[0].selectedRoom).toBe('room-vip');
    });

    it('updateItemRoom: debe permitir limpiar la habitación (null)', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().updateItemRoom('prod-1', 'room-vip');
        useCartStore.getState().updateItemRoom('prod-1', null);
        const cart = useCartStore.getState().cart;
        expect(cart[0].selectedRoom).toBeNull();
    });

    // ─── setTipEnabled ───
    it('setTipEnabled: debe habilitar/deshabilitar la propina', () => {
        useCartStore.getState().setTipEnabled(true);
        expect(useCartStore.getState().tipEnabled).toBe(true);
        useCartStore.getState().setTipEnabled(false);
        expect(useCartStore.getState().tipEnabled).toBe(false);
    });

    // ─── clearCart ───
    it('clearCart: debe vaciar el carrito y deshabilitar tip', () => {
        useCartStore.getState().addToCart(mockProduct);
        useCartStore.getState().setTipEnabled(true);
        useCartStore.getState().clearCart();
        const state = useCartStore.getState();
        expect(state.cart).toEqual([]);
        expect(state.tipEnabled).toBe(false);
    });

    // ─── getSubtotal ───
    it('getSubtotal: debe calcular el subtotal correctamente', () => {
        useCartStore.getState().addToCart(mockProduct); // 15000
        useCartStore.getState().addToCart(mockProduct); // + 15000
        useCartStore.getState().addToCart(mockChampagne); // + 85000
        const subtotal = useCartStore.getState().getSubtotal();
        expect(subtotal).toBe(115000);
    });

    it('getSubtotal: carrito vacío debe dar 0', () => {
        expect(useCartStore.getState().getSubtotal()).toBe(0);
    });

    // ─── getTipAmount ───
    it('getTipAmount: debe dar 10% del subtotal si tipEnabled', () => {
        useCartStore.getState().addToCart(mockProduct); // 15000
        useCartStore.getState().setTipEnabled(true);
        const tip = useCartStore.getState().getTipAmount();
        expect(tip).toBe(1500); // 10% of 15000
    });

    it('getTipAmount: debe dar 0 si tipEnabled es false', () => {
        useCartStore.getState().addToCart(mockProduct);
        const tip = useCartStore.getState().getTipAmount();
        expect(tip).toBe(0);
    });

    // ─── getTotal ───
    it('getTotal: subtotal + tip si tipEnabled', () => {
        useCartStore.getState().addToCart(mockProduct); // 15000
        useCartStore.getState().setTipEnabled(true);
        const total = useCartStore.getState().getTotal();
        expect(total).toBe(16500); // 15000 + 1500
    });

    it('getTotal: solo subtotal si tipEnabled es false', () => {
        useCartStore.getState().addToCart(mockProduct); // 15000
        const total = useCartStore.getState().getTotal();
        expect(total).toBe(15000);
    });
});
