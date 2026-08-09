import { describe, expect, it } from 'vitest';
import {
  calcularPropina,
  calcularCargoTarjeta,
  calcularTotalVenta
} from '@lasmunecasderamon/sale-totals';

/**
 * ⚠️ ESPEJO del test del dashboard (`lib/business/saleTotals.ts`):
 * `tests/unit/lib/business/saleTotals.test.ts`. Mantén los casos idénticos en
 * ambos repos para que el contrato del cargo por tarjeta no pueda divergir
 * entre flujos.
 */
describe('saleTotals (función compartida con el dashboard)', () => {
  it('con tarjeta suma el cargo por tarjeta', () => {
    expect(calcularCargoTarjeta(10000, 10, 'tarjeta')).toBe(1000);
    expect(calcularTotalVenta({ subtotal: 10000, propina: 0, impuestoPropinaPct: 10, metodoPago: 'tarjeta' })).toBe(11000);
  });

  it('sin método tarjeta no aplica cargo', () => {
    expect(calcularCargoTarjeta(10000, 10, 'efectivo')).toBe(0);
    expect(calcularCargoTarjeta(10000, 10, 'transferencia')).toBe(0);
    expect(calcularCargoTarjeta(10000, 10, 'prepago')).toBe(0);
    expect(calcularTotalVenta({ subtotal: 10000, propina: 0, impuestoPropinaPct: 10, metodoPago: 'efectivo' })).toBe(10000);
  });

  it('el total separa propina (reparto) del cargo por tarjeta', () => {
    expect(
      calcularTotalVenta({ subtotal: 10000, propina: 1000, impuestoPropinaPct: 10, metodoPago: 'tarjeta' })
    ).toBe(12000);
  });

  it('respeta el porcentaje configurado de impuesto_propina', () => {
    expect(calcularCargoTarjeta(20000, 5, 'tarjeta')).toBe(1000);
    expect(calcularTotalVenta({ subtotal: 20000, propina: 0, impuestoPropinaPct: 5, metodoPago: 'tarjeta' })).toBe(21000);
  });

  it('con subtotal 0 el cargo es 0 aunque sea tarjeta', () => {
    expect(calcularCargoTarjeta(0, 10, 'tarjeta')).toBe(0);
    expect(calcularTotalVenta({ subtotal: 0, propina: 0, impuestoPropinaPct: 10, metodoPago: 'tarjeta' })).toBe(0);
  });

  it('redondea el cargo al entero más cercano', () => {
    expect(calcularCargoTarjeta(9999, 10, 'tarjeta')).toBe(1000);
    expect(calcularCargoTarjeta(1234, 10, 'tarjeta')).toBe(123);
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

    it('la propina (reparto) y el cargo por tarjeta no se mezclan en el total', () => {
      expect(
        calcularTotalVenta({
          subtotal: 10000,
          propina: calcularPropina(10000, 10, true),
          impuestoPropinaPct: 10,
          metodoPago: 'tarjeta'
        })
      ).toBe(12000);
    });
  });
});
