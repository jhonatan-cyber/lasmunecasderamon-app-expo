import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/toast-lazy', () => ({
  default: vi.fn(),
  showToast: vi.fn()
}));

vi.mock('@/api/client', () => ({
  apiClientSafe: vi.fn()
}));

vi.mock('@/hooks/utils/cuentaUtils', () => ({
  showToast: vi.fn(),
  isChampagneProduct: vi.fn(() => false),
  getHostessLimit: vi.fn(() => 1),
  buildCommissionPreview: vi.fn(),
  isExpensiveDrink: vi.fn(() => false),
  setExpensiveDrinkThreshold: vi.fn(),
  getCardSplit: vi.fn(() => ({ venta: 0, propina: 0 })),
  setCardSplit: vi.fn(),
  getIvaDecimal: vi.fn(() => 0.19),
  getIvaPercent: vi.fn(() => 19),
  setIvaRate: vi.fn()
}));

import {
  normalizeRoom,
  normalizeClients,
  normalizeAnfitrionas,
  deduplicate,
  addProductToCartUtils,
  mapForSaleProduct,
  openCategory
} from '@/hooks/utils/cartUtils';
import { apiClientSafe } from '@/api/client';
import type { CartItem } from '@lasmunecasderamon/types';

describe('cartUtils', () => {
  describe('normalizeRoom', () => {
    it('normaliza campos desde id_habitacion/nombre', () => {
      const room = normalizeRoom({
        id_habitacion: 5,
        nombre: 'VIP 1',
        precio: '10000',
        tiempo: '60',
        estado: '2',
        comision_anfitriona: '500'
      });
      expect(room.id).toBe(5);
      expect(room.id_habitacion).toBe(5);
      expect(room.nombre).toBe('VIP 1');
      expect(room.precio).toBe(10000);
      expect(room.tiempo).toBe(60);
      expect(room.estado).toBe(2);
      expect(room.comision_anfitriona).toBe(500);
    });

    it('usa fallbacks para campos alternativos', () => {
      const room = normalizeRoom({ id: 9, name: 'Suite', price: 20000, time: 90, status: 1 });
      expect(room.id).toBe(9);
      expect(room.nombre).toBe('Suite');
      expect(room.precio).toBe(20000);
      expect(room.estado).toBe(1);
    });

    it('genera nombre por defecto y valores numéricos 0', () => {
      const room = normalizeRoom({});
      expect(room.nombre).toContain('Habitación');
      expect(room.precio).toBe(0);
      expect(room.estado).toBe(0);
    });
  });

  describe('normalizeClients', () => {
    it('pasa arrays directamente', () => {
      const clients = [{ id: 1, saldo: 0, deuda: 0 }];
      expect(normalizeClients(clients)).toBe(clients);
    });

    it('extrae data de { success, data }', () => {
      const data = [{ id: 1, saldo: 0, deuda: 0 }];
      expect(normalizeClients({ success: true, data })).toEqual(data);
    });

    it('devuelve array vacío si no hay success', () => {
      expect(normalizeClients({ success: false, data: [{}] })).toEqual([]);
      expect(normalizeClients(undefined)).toEqual([]);
    });
  });

  describe('normalizeAnfitrionas', () => {
    it('pasa arrays directamente', () => {
      const arr = [{ id: 1, nick: 'Ana' }];
      expect(normalizeAnfitrionas(arr)).toBe(arr);
    });

    it('extrae data de { success, data }', () => {
      const data = [{ id: 1, nick: 'Ana' }];
      expect(normalizeAnfitrionas({ success: true, data })).toEqual(data);
    });

    it('devuelve array vacío en otros casos', () => {
      expect(normalizeAnfitrionas({ success: false })).toEqual([]);
      expect(normalizeAnfitrionas(null)).toEqual([]);
    });
  });

  describe('deduplicate', () => {
    it('elimina duplicados por key', () => {
      const arr = [{ id: 1, x: 'a' }, { id: 1, x: 'b' }, { id: 2, x: 'c' }];
      expect(deduplicate(arr, 'id')).toEqual([{ id: 1, x: 'a' }, { id: 2, x: 'c' }]);
    });

    it('usa fallback item.id cuando la key no existe', () => {
      const arr = [{ foo: 'x' }, { foo: 'y' }, { id: 3 }];
      const result = deduplicate(arr as any, 'id_inexistente');
      // los dos primeros caen al fallback "" (mismo), el tercero es único
      expect(result).toHaveLength(2);
    });
  });

  describe('addProductToCartUtils', () => {
    it('agrega producto nuevo al carrito con anfitrionas', () => {
      const dispatch = vi.fn();
      const cart: CartItem[] = [];

      addProductToCartUtils(
        { id: 10, nombre: 'Whisky', precio: 50000, comision: 1000 },
        cart,
        { 10: 2 },
        { 10: [1, 2] },
        [{ id: 1, id_usuario: 1, nick: 'Ana' }, { id: 2, id_usuario: 2, nick: 'Luz' }],
        dispatch
      );

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CART',
        payload: [
          {
            id_producto: 10,
            nombre: 'Whisky',
            precio: 50000,
            comision: 1000,
            cantidad: 2,
            subtotal: 100000,
            selectedHostesses: [1, 2],
            hostessNames: 'Ana, Luz',
            isChampagne: false
          }
        ]
      });
    });

    it('acumula cantidad en item existente con mismas anfitrionas', () => {
      const dispatch = vi.fn();
      const cart: CartItem[] = [
        {
          id_producto: 10,
          nombre: 'Whisky',
          precio: 50000,
          comision: 1000,
          cantidad: 1,
          subtotal: 50000,
          selectedHostesses: [1],
          hostessNames: 'Ana',
          isChampagne: false
        }
      ];

      addProductToCartUtils(
        { id: 10, nombre: 'Whisky', precio: 50000, comision: 1000 },
        cart,
        { 10: 1 },
        { 10: [1] },
        [{ id: 1, id_usuario: 1, nick: 'Ana' }],
        dispatch
      );

      const payload = dispatch.mock.calls[0][0].payload as CartItem[];
      expect(payload[0].cantidad).toBe(2);
      expect(payload[0].subtotal).toBe(100000);
    });

    it('usa cantidad por defecto 1 y sin anfitrionas', () => {
      const dispatch = vi.fn();

      addProductToCartUtils(
        { id: 5, nombre: 'Cerveza', precio: 3000 },
        [],
        {},
        {},
        [],
        dispatch
      );

      const payload = dispatch.mock.calls[0][0].payload as CartItem[];
      expect(payload[0].cantidad).toBe(1);
      expect(payload[0].subtotal).toBe(3000);
      expect(payload[0].hostessNames).toBeNull();
      expect(payload[0].selectedHostesses).toEqual([]);
    });
  });

  describe('mapForSaleProduct (catálogo for_sale, paridad con el dashboard)', () => {
    const raw = {
      presentacion_id: 'pres-1',
      presentacion_nombre: '710 ml',
      producto_id: 'prod-1',
      producto_nombre: 'Paceña',
      categoria_nombre: 'Cerveza',
      precio_venta: 20000,
      comision: 5000,
      stock_bar: 10
    };

    it('mapea al shape del carro: id = presentación, nombre compuesto, precio_venta', () => {
      const item = mapForSaleProduct(raw);
      expect(item.id).toBe('pres-1');
      expect(item.presentacion_id).toBe('pres-1');
      expect(item.producto_id).toBe('prod-1');
      expect(item.id_producto).toBe('prod-1');
      expect(item.nombre).toBe('Paceña 710 ml');
      expect(item.name).toBe('Paceña 710 ml');
      expect(item.precio).toBe(20000);
      expect(item.price).toBe(20000);
      expect(item.categoria).toBe('Cerveza');
      expect(item.stock_bar).toBe(10);
      expect(item.tipo_venta).toBe('botella');
    });

    it('venta simple (precio ≤ 10000) va sin comisión, como el dashboard', () => {
      expect(mapForSaleProduct({ ...raw, precio_venta: 5000, comision: 900 }).comision).toBe(0);
      expect(mapForSaleProduct({ ...raw, precio_venta: 20000, comision: 5000 }).comision).toBe(5000);
    });
  });

  describe('openCategory — catálogo de venta', () => {
    const rawRow = {
      presentacion_id: 'pres-9',
      presentacion_nombre: '330 ml',
      producto_id: 'prod-9',
      producto_nombre: 'Paceña',
      categoria_nombre: 'Cerveza',
      precio_venta: 5000,
      comision: 0,
      stock_bar: 5
    };

    it('con forSale pide /products?for_sale=1 y normaliza las filas', async () => {
      const dispatch = vi.fn();
      vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: [rawRow] } as any);

      await openCategory({ id: 7 } as any, dispatch as any, { forSale: true });

      expect(apiClientSafe).toHaveBeenCalledWith('/products?for_sale=1&category_id=7');
      const action = dispatch.mock.calls.find(
        (call: any) => call[0]?.type === 'OPEN_CATEGORY_MODAL'
      )?.[0];
      expect(action.products).toHaveLength(1);
      expect(action.products[0].id).toBe('pres-9');
      expect(action.products[0].precio).toBe(5000);
    });

    it('sin forSale conserva el endpoint admin (flujos de cuentas)', async () => {
      const dispatch = vi.fn();
      vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: [{ id: 'x' }] } as any);

      await openCategory({ id: 7 } as any, dispatch as any);

      expect(apiClientSafe).toHaveBeenCalledWith('/products?category_id=7');
      const action = dispatch.mock.calls.find(
        (call: any) => call[0]?.type === 'OPEN_CATEGORY_MODAL'
      )?.[0];
      expect(action.products).toEqual([{ id: 'x' }]);
    });
  });
});
