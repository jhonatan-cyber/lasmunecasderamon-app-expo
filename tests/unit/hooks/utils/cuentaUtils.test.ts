import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CartItem, Anfitriona } from '@lasmunecasderamon/types';

vi.mock('@/utils/toast-lazy', () => ({
  default: vi.fn(),
  showToast: vi.fn()
}));

import {
  setIvaRate,
  getIvaDecimal,
  getIvaPercent,
  setExpensiveDrinkThreshold,
  isExpensiveDrink,
  setCardSplit,
  getCardSplit,
  isChampagneProduct,
  getHostessLimit,
  buildCommissionPreview
} from '@/hooks/utils/cuentaUtils';

describe('cuentaUtils', () => {
  afterEach(() => {
    setIvaRate(0.19);
    setExpensiveDrinkThreshold(30000);
    setCardSplit(0.51, 0.49);
  });

  describe('IVA', () => {
    it('getIvaDecimal devuelve la tasa actual', () => {
      expect(getIvaDecimal()).toBe(0.19);
      setIvaRate(0.16);
      expect(getIvaDecimal()).toBe(0.16);
    });

    it('getIvaPercent redondea a porcentaje entero', () => {
      expect(getIvaPercent()).toBe(19);
      setIvaRate(0.165);
      expect(getIvaPercent()).toBe(17);
    });
  });

  describe('isExpensiveDrink', () => {
    it('detecta bebidas caras por umbral', () => {
      expect(isExpensiveDrink({ precio: 35000 })).toBe(true);
      expect(isExpensiveDrink({ price: 29999 })).toBe(false);
    });

    it('respeta el umbral configurado', () => {
      setExpensiveDrinkThreshold(10000);
      expect(isExpensiveDrink({ precio: 12000 })).toBe(true);
      expect(isExpensiveDrink({ price: 5000 })).toBe(false);
    });

    it('trata precio ausente como 0', () => {
      expect(isExpensiveDrink({})).toBe(false);
    });
  });

  describe('getCardSplit', () => {
    it('divide total entre venta y propina redondeando a miles', () => {
      const { venta, propina } = getCardSplit(100000);
      expect(venta).toBe(51000);
      expect(propina).toBe(49000);
    });

    it('respeta un split personalizado', () => {
      setCardSplit(0.6, 0.4);
      const { venta, propina } = getCardSplit(100000);
      expect(venta).toBe(60000);
      expect(propina).toBe(40000);
    });

    it('nunca devuelve propina negativa', () => {
      const { propina } = getCardSplit(-1000);
      expect(propina).toBe(0);
    });
  });

  describe('isChampagneProduct', () => {
    it('detecta categorías de champán en distintas variantes', () => {
      expect(isChampagneProduct({ categoria: 'Champaña' })).toBe(true);
      expect(isChampagneProduct({ categoria: 'CHAMPAGNE' })).toBe(true);
      expect(isChampagneProduct({ categoria: 'shampaña' })).toBe(true);
      expect(isChampagneProduct({ categoria: 'Licores' })).toBe(false);
      expect(isChampagneProduct({})).toBe(false);
    });
  });

  describe('getHostessLimit', () => {
    it('usa max_anfitrionas si está definido', () => {
      expect(getHostessLimit({ max_anfitrionas: 3 })).toBe(3);
      expect(getHostessLimit({ max_anfitrionas: 2 }, 2)).toBe(4);
    });

    it('ignora max_anfitrionas 0/null', () => {
      expect(getHostessLimit({ max_anfitrionas: 0 })).toBe(1);
      expect(getHostessLimit({ max_anfitrionas: null })).toBe(1);
      expect(getHostessLimit({ max_anfitrionas: undefined })).toBe(1);
    });

    it('aplica límite por tier para champán', () => {
      expect(getHostessLimit({ precio: 250000, categoria: 'Champaña' })).toBe(5);
      expect(getHostessLimit({ precio: 210000, categoria: 'Champaña' })).toBe(4);
      expect(getHostessLimit({ precio: 150000, categoria: 'Champaña' })).toBe(3);
      expect(getHostessLimit({ precio: 130000, categoria: 'Champaña' })).toBe(2);
      expect(getHostessLimit({ precio: 50000, categoria: 'Champaña' })).toBe(1);
    });

    it('aplica límite por tier multiplicado por cantidad', () => {
      expect(getHostessLimit({ precio: 250000, categoria: 'Champaña' }, 2)).toBe(10);
    });
  });

  describe('buildCommissionPreview', () => {
    const hostesses: Anfitriona[] = [
      { id: 1, id_usuario: 1, nick: 'Ana' },
      { id: 2, id_usuario: 2, nick: 'Luz' }
    ];

    const makeItem = (overrides: Partial<CartItem>): CartItem => ({
      id_producto: 'p1',
      nombre: 'Prod',
      precio: 1000,
      comision: 0,
      cantidad: 1,
      subtotal: 1000,
      selectedHostesses: [],
      hostessNames: null,
      isChampagne: false,
      ...overrides
    });

    it('calcula comisión total y distribución no-champán', () => {
      const items: CartItem[] = [
        makeItem({ id_producto: 'a', comision: 100, cantidad: 2, selectedHostesses: [1, 2] }),
        makeItem({ id_producto: 'b', comision: 50, cantidad: 1, selectedHostesses: [2] })
      ];

      const result = buildCommissionPreview(items, hostesses);

      expect(result.totalCommission).toBe(250);
      // En no-champán cada anfitriona recibe la comisión completa del item
      expect(result.assignedCommission).toBe(450);
      expect(result.hostessDistribution).toHaveLength(2);
      const luz = result.hostessDistribution.find(h => h.id === '2');
      expect(luz?.name).toBe('Luz');
      expect(luz?.amount).toBe(250);
    });

    it('reparte uniformemente las comisiones de champán (resto al primero)', () => {
      const items: CartItem[] = [
        makeItem({
          id_producto: 'c',
          comision: 101,
          cantidad: 1,
          isChampagne: true,
          selectedHostesses: [1, 2]
        })
      ];

      const result = buildCommissionPreview(items, hostesses);

      expect(result.totalCommission).toBe(101);
      const ana = result.hostessDistribution.find(h => h.id === '1');
      const luz = result.hostessDistribution.find(h => h.id === '2');
      expect(ana?.amount).toBe(51);
      expect(luz?.amount).toBe(50);
    });

    it('omite items sin comisión o sin anfitrionas', () => {
      const items: CartItem[] = [
        makeItem({ id_producto: 'x', comision: 0, selectedHostesses: [1] }),
        makeItem({ id_producto: 'y', comision: 100, selectedHostesses: [] })
      ];

      const result = buildCommissionPreview(items, hostesses);
      expect(result.totalCommission).toBe(100);
      expect(result.assignedCommission).toBe(0);
      expect(result.hostessDistribution).toHaveLength(0);
    });

    it('usa nombre genérico para anfitriona no encontrada', () => {
      const items: CartItem[] = [
        makeItem({ comision: 100, selectedHostesses: [99] })
      ];

      const result = buildCommissionPreview(items, hostesses);
      expect(result.hostessDistribution[0].name).toBe('Anfitriona 99');
    });
  });
});
