import { describe, expect, it } from 'vitest';
import {
  calcularPropina,
  calcularTotalVenta
} from '@lasmunecasderamon/sale-totals';

/**
 * ⚠️ ESPEJO del test del dashboard (`lib/business/saleTotals.ts`):
 * `tests/unit/lib/business/saleTotals.test.ts`. Mantén los casos idénticos en
 * ambos repos para que el cálculo de propina/total no pueda divergir entre
 * flujos.
 */
describe('saleTotals (función compartida con el dashboard)', () => {
  it('el total es subtotal + propina', () => {
    expect(calcularTotalVenta({ subtotal: 10000, propina: 0 })).toBe(10000);
  });

  it('suma la propina al total', () => {
    expect(calcularTotalVenta({ subtotal: 10000, propina: 1000 })).toBe(11000);
  });

  it('con subtotal 0 el total es 0', () => {
    expect(calcularTotalVenta({ subtotal: 0, propina: 0 })).toBe(0);
  });

  describe('calcularPropina (reparto)', () => {
    it('calcula la propina solo si está habilitada', () => {
      expect(calcularPropina(10000, 10, true)).toBe(1000);
      expect(calcularPropina(10000, 10, false)).toBe(0);
    });

    it('respeta el porcentaje configurado de propina_venta', () => {
      expect(calcularPropina(20000, 8, true)).toBe(1600);
    });

    it('redondea al entero más cercano y maneja subtotal 0', () => {
      expect(calcularPropina(9999, 10, true)).toBe(1000);
      expect(calcularPropina(0, 10, true)).toBe(0);
    });
  });
});
