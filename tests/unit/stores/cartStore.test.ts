import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/store/cartStore';

const mockProduct = {
    id: 'prod-1',
    code: 'P-001',
    name: 'Cerveza Corona',
    category_id: 'cat-1',
    price: 15000,
    commission: 0,
    description: 'Cerveza fria',
    status: 1,
    foto: 'corona.png',
    categoria: 'Bebidas',
};

const mockChampagne = {
    id: 'prod-2',
    code: 'P-002',
    name: 'Champagne Moet',
    category_id: 'cat-2',
    price: 85000,
    commission: 0,
    description: 'Botella premium',
    status: 1,
    foto: 'moet.png',
    categoria: 'Champana',
};

describe('cartStore', () => {
    beforeEach(() => {
        
        useCartStore.setState({ cart: [], tipEnabled: false });
    });

    
    it('debe iniciar con carrito vacio y tip deshabilitado', () => {
        const state = useCartStore.getState();
        expect(state.cart).toEqual([]);
        expect(state.tipEnabled).toBe(false);
    });

    
    it('addToCart: debe agregar un producto nuevo al carrito', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(1);
        expect(cart[0].product).toEqual(mockProduct);
        expect(cart[0].quantity).toBe(1);
    });

    it('addToCart: debe incrementar quantity si el producto ya existe', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().addToCart(mockProduct as any);
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(2);
    });

    it('addToCart: debe manejar multiples productos distintos', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().addToCart(mockChampagne as any);
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(2);
        expect(cart[0].quantity).toBe(1);
        expect(cart[1].quantity).toBe(1);
    });

    
    it('removeFromCart: debe decrementar quantity si > 1', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().removeFromCart('prod-1');
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(1);
        expect(cart[0].quantity).toBe(1);
    });

    it('removeFromCart: debe eliminar el item si quantity es 1', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().removeFromCart('prod-1');
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(0);
    });

    it('removeFromCart: no debe hacer nada si el producto no existe', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().removeFromCart('non-existent');
        const cart = useCartStore.getState().cart;
        expect(cart).toHaveLength(1);
    });

    
    it('updateItemHostesses: debe actualizar las anfitrionas seleccionadas', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().updateItemHostesses('prod-1', ['hostess-1', 'hostess-2']);
        const cart = useCartStore.getState().cart;
        expect(cart[0].selectedHostesses).toEqual(['hostess-1', 'hostess-2']);
    });

    it('updateItemHostesses: no debe afectar otros items', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().addToCart(mockChampagne as any);
        useCartStore.getState().updateItemHostesses('prod-1', ['hostess-1']);
        const cart = useCartStore.getState().cart;
        expect(cart[0].selectedHostesses).toEqual(['hostess-1']);
        expect(cart[1].selectedHostesses).toEqual([]);
    });

    
    it('updateItemRoom: debe actualizar la habitacion seleccionada', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().updateItemRoom('prod-1', 'room-vip');
        const cart = useCartStore.getState().cart;
        expect(cart[0].selectedRoom).toBe('room-vip');
    });

    it('updateItemRoom: debe permitir limpiar la habitacion (null)', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().updateItemRoom('prod-1', 'room-vip');
        useCartStore.getState().updateItemRoom('prod-1', null);
        const cart = useCartStore.getState().cart;
        expect(cart[0].selectedRoom).toBeNull();
    });

    
    it('setTipEnabled: debe habilitar/deshabilitar la propina', () => {
        useCartStore.getState().setTipEnabled(true);
        expect(useCartStore.getState().tipEnabled).toBe(true);
        useCartStore.getState().setTipEnabled(false);
        expect(useCartStore.getState().tipEnabled).toBe(false);
    });

    
    it('clearCart: debe vaciar el carrito y deshabilitar tip', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().setTipEnabled(true);
        useCartStore.getState().clearCart();
        const state = useCartStore.getState();
        expect(state.cart).toEqual([]);
        expect(state.tipEnabled).toBe(false);
    });

    
    it('getSubtotal: debe calcular el subtotal correctamente', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().addToCart(mockChampagne as any);
        const subtotal = useCartStore.getState().getSubtotal();
        expect(subtotal).toBe(115000);
    });

    it('getSubtotal: carrito vacio debe dar 0', () => {
        expect(useCartStore.getState().getSubtotal()).toBe(0);
    });

    
    it('getTipAmount: debe dar 10% del subtotal si tipEnabled', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().setTipEnabled(true);
        const tip = useCartStore.getState().getTipAmount();
        expect(tip).toBe(1500);
    });

    it('getTipAmount: debe dar 0 si tipEnabled es false', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        const tip = useCartStore.getState().getTipAmount();
        expect(tip).toBe(0);
    });

    
    it('getTotal: subtotal + tip si tipEnabled', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        useCartStore.getState().setTipEnabled(true);
        const total = useCartStore.getState().getTotal();
        expect(total).toBe(16500);
    });

    it('getTotal: solo subtotal si tipEnabled es false', () => {
        useCartStore.getState().addToCart(mockProduct as any);
        const total = useCartStore.getState().getTotal();
        expect(total).toBe(15000);
    });
});
