import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClientSafe } from '@/api/client';
import {
    INTENT_SENDERS,
    IDEMPOTENCY_HEADER,
    stampDeviceDate,
} from '@/services/outbox/service';
import type { OutboxIntent } from '@/services/outbox/types';

const intent = (payload: unknown, id = 'intent-cajero-1'): OutboxIntent => ({
    id,
    type: 'sale.create',
    payload,
    label: '',
    createdAt: 0,
    updatedAt: 0,
    status: 'pendiente',
    attempts: 0,
    lastError: null,
    appliedAt: null,
    response: null,
});

const VENTA = { metodo_pago: 'efectivo', total: 12000, device_date: '2026-09-28T22:10:00.000Z' };

describe('senders de la cola del cajero', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(apiClientSafe).mockResolvedValue({ success: true, data: null });
    });

    it('debe enviar la venta a /sales con el id de la intención como clave', async () => {
        await INTENT_SENDERS['sale.create'](intent(VENTA));

        expect(apiClientSafe).toHaveBeenCalledWith('/sales', {
            method: 'POST',
            headers: { [IDEMPOTENCY_HEADER]: 'intent-cajero-1' },
            body: JSON.stringify(VENTA),
        });
    });

    it('debe lanzar con el motivo del servidor cuando rechaza la venta', async () => {
        vi.mocked(apiClientSafe).mockResolvedValue({
            success: false,
            data: null,
            message: 'La caja está cerrada',
        });

        await expect(INTENT_SENDERS['sale.create'](intent(VENTA))).rejects.toThrow(
            'La caja está cerrada'
        );
    });

    it('debe enviar los consumos por PUT a la cuenta del payload', async () => {
        const consumos = { detalles: [{ producto_id: 'p1', cantidad: 2 }], usuarios: [7] };

        await INTENT_SENDERS['account.consumptions']({
            ...intent({ id_cuenta: 'cuenta-9', consumos }, 'intent-consumo-1'),
            type: 'account.consumptions',
        });

        expect(apiClientSafe).toHaveBeenCalledWith('/cuentas/cuenta-9', {
            method: 'PUT',
            headers: { [IDEMPOTENCY_HEADER]: 'intent-consumo-1' },
            body: JSON.stringify(consumos),
        });
    });

    it('debe enviar el cobro al endpoint transaccional con el id de la intención como clave', async () => {
        await INTENT_SENDERS['account.checkout']({
            ...intent({
                id_cuenta: 'c-9',
                metodo_pago: 'tarjeta',
                total_cobrado: 12000,
                propina: 1200,
            }),
            type: 'account.checkout',
        });

        expect(apiClientSafe).toHaveBeenCalledWith('/cuentas/c-9/cobrar-con-venta', {
            method: 'POST',
            headers: { [IDEMPOTENCY_HEADER]: 'intent-cajero-1' },
            body: JSON.stringify({ metodo_pago: 'tarjeta', total_cobrado: 12000, propina: 1200 }),
        });
    });

    it('debe lanzar con el motivo del servidor cuando rechaza el cobro', async () => {
        vi.mocked(apiClientSafe).mockResolvedValue({
            success: false,
            data: null,
            message: 'La cuenta ya fue procesada',
        });

        await expect(
            INTENT_SENDERS['account.checkout']({
                ...intent({ id_cuenta: 'c-9' }),
                type: 'account.checkout',
            })
        ).rejects.toThrow('La cuenta ya fue procesada');
    });

    it('no debe mandar nada si la intención de cobro no trae cuenta', async () => {
        await expect(
            INTENT_SENDERS['account.checkout']({
                ...intent({}),
                type: 'account.checkout',
            })
        ).rejects.toThrow(/no tiene cuenta/i);

        expect(apiClientSafe).not.toHaveBeenCalled();
    });

    it('no debe mandar nada si la intención de consumos está incompleta', async () => {
        await expect(
            INTENT_SENDERS['account.consumptions']({
                ...intent({ consumos: {} }),
                type: 'account.consumptions',
            })
        ).rejects.toThrow(/no tiene cuenta o productos/i);

        expect(apiClientSafe).not.toHaveBeenCalled();
    });
});

describe('stampDeviceDate', () => {
    const NOW = 1_800_000_000_000;

    it('debe sellar la hora del dispositivo al encolar', () => {
        const sellado = stampDeviceDate({ total: 100 }, () => NOW);

        expect(sellado).toEqual({ total: 100, device_date: new Date(NOW).toISOString() });
    });

    it('no debe pisar un device_date ya presente (el del momento de la operación)', () => {
        const payload = { total: 100, device_date: '2026-09-28T22:10:00.000Z' };

        expect(stampDeviceDate(payload, () => NOW)).toBe(payload);
    });

    it('debe sobrevivir a payloads que no son objetos', () => {
        expect(stampDeviceDate(null, () => NOW)).toBeNull();
        expect(stampDeviceDate('texto', () => NOW)).toBe('texto');
        expect(stampDeviceDate([1, 2], () => NOW)).toEqual([1, 2]);
    });
});
