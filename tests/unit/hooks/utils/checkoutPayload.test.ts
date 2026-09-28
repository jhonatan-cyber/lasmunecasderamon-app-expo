import { describe, expect, it } from 'vitest';

import { buildCheckoutPayload, describeCheckout } from '@/hooks/utils/checkoutPayload';

describe('buildCheckoutPayload', () => {
    it('arma el cuerpo del cobro transaccional', () => {
        expect(
            buildCheckoutPayload({
                cuentaId: 'c-9',
                metodoPago: 'tarjeta',
                subtotal: 12000,
                propina: 1200,
                habitacionId: 'h-1',
            })
        ).toEqual({
            id_cuenta: 'c-9',
            metodo_pago: 'tarjeta',
            total_cobrado: 12000,
            propina: 1200,
            habitacion_id: 'h-1',
        });
    });

    it('normaliza ids numéricos y deja la habitación en null cuando no hay', () => {
        expect(
            buildCheckoutPayload({
                cuentaId: 42,
                metodoPago: 'efectivo',
                subtotal: 10000,
                propina: 0,
                habitacionId: null,
            })
        ).toEqual({
            id_cuenta: '42',
            metodo_pago: 'efectivo',
            total_cobrado: 10000,
            propina: 0,
            habitacion_id: null,
        });
    });

    it('nunca manda NaN al servidor', () => {
        const payload = buildCheckoutPayload({
            cuentaId: 'c-9',
            metodoPago: 'efectivo',
            subtotal: Number(undefined),
            propina: Number(''),
        });

        expect(payload.total_cobrado).toBe(0);
        expect(payload.propina).toBe(0);
    });
});

describe('describeCheckout', () => {
    it('reconoce el cobro por lo que pagó el cliente y el código de la cuenta', () => {
        expect(describeCheckout({ codigo: 'CTA-1', total: 13200 })).toContain('$13.200');
        expect(describeCheckout({ codigo: 'CTA-1', total: 13200 })).toContain('CTA-1');
    });

    it('sobrevive sin código ni total', () => {
        expect(describeCheckout({})).toBe('Cobro $0');
    });
});
