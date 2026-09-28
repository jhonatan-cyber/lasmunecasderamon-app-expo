import { describe, expect, it } from 'vitest';

import { buildSalePayload } from '@/hooks/utils/salePayload';
import { buildConsumptionsPayload } from '@/hooks/utils/cuentaUtils';

describe('buildSalePayload', () => {
    const base = {
        cart: [
            {
                producto_id: 'prod-1',
                presentacion_id: 'pres-1',
                precio: 5000,
                quantity: 2,
                comision: 300,
                anfitrionas: ['a-1', { id_usuario: 'a-2' }],
            },
        ],
        selectedCliente: { id: 'cli-1' },
        selectedHabitacion: { id: 'hab-1' },
        metodoPago: 'efectivo',
        pagosMixtos: [],
        totals: { subtotal: 10000, tip: 1000, total: 11000 },
        selectedTime: 60,
        hasCommissionItem: true,
    };

    it('debe armar los detalles con botella por presentación y comisión por cantidad', () => {
        const payload = buildSalePayload(base as any);

        expect(payload.detalles[0]).toEqual({
            producto_id: 'prod-1',
            presentacion_id: 'pres-1',
            tipo_venta: 'botella',
            cantidad: 2,
            precio: 5000,
            sub_total: 10000,
            comision: 600,
            hostesses: ['a-1', 'a-2'],
        });
        expect(payload.usuarios).toEqual(['a-1', 'a-2']);
    });

    it('sin presentación no debe declarar tipo_venta', () => {
        const payload = buildSalePayload({
            ...base,
            cart: [{ id: 'prod-2', precio: 1000, quantity: 1, comision: 0, anfitrionas: [] }],
        } as any);

        expect(payload.detalles[0].presentacion_id).toBeNull();
        expect(payload.detalles[0].tipo_venta).toBeUndefined();
    });

    it('solo debe mandar habitación si hay comisión (paridad con el dashboard)', () => {
        const conComision = buildSalePayload(base as any);
        const sinComision = buildSalePayload({ ...base, hasCommissionItem: false } as any);

        expect(conComision.habitacion_id).toBe('hab-1');
        expect(conComision.tiempo).toBe(60);
        expect(sinComision.habitacion_id).toBeNull();
        // El tiempo se conserva como en el payload original: sin habitación el
        // servidor no lo usa.
        expect(sinComision.tiempo).toBe(60);
    });

    it('solo debe incluir pagos mixtos cuando el método es mixto', () => {
        const mixto = buildSalePayload({
            ...base,
            metodoPago: 'mixto',
            pagosMixtos: [{ metodo: 'efectivo', monto: 5000 }],
        } as any);

        expect(mixto.pagos_mixtos).toEqual([{ metodo: 'efectivo', monto: 5000 }]);
        expect(buildSalePayload(base as any).pagos_mixtos).toBeUndefined();
    });

    it('debe tolerar un carrito con anfitrionas como objetos y como ids', () => {
        const payload = buildSalePayload({
            ...base,
            cart: [
                {
                    producto_id: 'prod-1',
                    precio: 100,
                    quantity: 1,
                    comision: 0,
                    anfitrionas: [{ id: 5 }, 9, null],
                },
            ],
        } as any);

        expect(payload.usuarios).toEqual([5, 9]);
    });
});

describe('buildConsumptionsPayload', () => {
    const cart = [
        {
            id_producto: 'prod-9',
            precio: 2000,
            cantidad: 3,
            comision: 100,
            selectedHostesses: [4],
            isChampagne: false,
        },
    ];

    it('debe sumar las anfitrionas ya asignadas a la cuenta con las nuevas', () => {
        const payload = buildConsumptionsPayload({
            cart: cart as any,
            cuentaDetalle: { usuarios: [{ usuario_id: 2 }, { id_usuario: 3 }] },
            cuentaOriginal: { habitacion_id: null },
            selectedHabitacion: null,
            selectedTime: 0,
            extraTiempo: 0,
            hasExistingTimer: false,
        });

        expect(payload.usuarios.sort()).toEqual([2, 3, 4]);
        expect(payload.detalles[0]).toEqual({
            producto_id: 'prod-9',
            precio: 2000,
            cantidad: 3,
            sub_total: 6000,
            comision: 300,
            hostesses: [4],
            isChampagne: false,
        });
    });

    it('debe sumar el tiempo extra cuando la cuenta ya tiene habitación', () => {
        const payload = buildConsumptionsPayload({
            cart: cart as any,
            cuentaDetalle: null,
            cuentaOriginal: { habitacion_id: 'hab-1' },
            selectedHabitacion: null,
            selectedTime: 0,
            extraTiempo: 30,
            hasExistingTimer: true,
        });

        expect(payload.extraTiempo).toBe(30);
        expect(payload.tiempo).toBeUndefined();
    });

    it('debe abrir habitación solo si no hay temporizador ya corriendo', () => {
        const comun = {
            cart: cart as any,
            cuentaDetalle: null,
            cuentaOriginal: { habitacion_id: null },
            selectedHabitacion: { id_habitacion: 'hab-2' },
            selectedTime: 60,
            extraTiempo: 0,
        };

        const nueva = buildConsumptionsPayload({ ...comun, hasExistingTimer: false } as any);
        const existente = buildConsumptionsPayload({ ...comun, hasExistingTimer: true } as any);

        expect(nueva).toMatchObject({ habitacion_id: 'hab-2', tiempo: 60 });
        // Con temporizador en curso la habitación no se re-declara: se mantiene.
        expect(existente.habitacion_id).toBe('hab-2');
        expect(existente.tiempo).toBe(60);
    });

    it('debe prorratear la misma habitación como tiempo extra en vez de reabrirla', () => {
        const payload = buildConsumptionsPayload({
            cart: cart as any,
            cuentaDetalle: { habitacion_id: 'hab-1' },
            cuentaOriginal: { habitacion_id: 'hab-1' },
            selectedHabitacion: { id_habitacion: 'hab-1' },
            selectedTime: 30,
            extraTiempo: 15,
            hasExistingTimer: true,
        });

        expect(payload.extraTiempo).toBe(45);
        expect(payload.tiempo).toBeUndefined();
    });
});
