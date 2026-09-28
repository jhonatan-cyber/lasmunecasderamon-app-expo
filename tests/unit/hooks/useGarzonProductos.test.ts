import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/utils/toast-lazy', () => ({ showToast, hideToast: vi.fn() }));

const outbox = vi.hoisted(() => ({
    enqueueAndSend: vi.fn(),
    flush: vi.fn(),
    listUnresolved: vi.fn(() => []),
    subscribe: vi.fn(() => () => {}),
    retry: vi.fn(),
    discard: vi.fn(),
    list: vi.fn(() => []),
    pendingCount: vi.fn(() => 0),
    clear: vi.fn(),
    isFlushing: vi.fn(() => false),
}));
vi.mock('@/services/outbox', () => ({ getOutbox: () => outbox }));

import { MIRROR_KEYS, setMirrorForTests } from '@/services/mirror';
import { createMirrorRepository } from '@/services/mirror/repository';
import { ensureMirrorSchema } from '@/services/mirror/schema';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';

import { useGarzonProductos } from '@/hooks/useGarzonProductos';

const CATEGORY_ID = 'cat-1';

const PRODUCTO = {
    id: 'prod-1',
    name: 'Corona 210',
    price: 5000,
    commission: 0,
    status: 1,
};

const intentoPendiente = {
    id: 'intent-1',
    type: 'order.create',
    payload: {},
    label: 'Pedido ABC12345',
    createdAt: 1,
    updatedAt: 1,
    status: 'pendiente' as const,
    attempts: 1,
    lastError: 'Network request failed',
    appliedAt: null,
    response: null,
};

describe('useGarzonProductos · pedido sin red', () => {
    let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;

    beforeEach(async () => {
        const { useLocalSearchParams } = await import('expo-router');
        vi.mocked(useLocalSearchParams).mockReturnValue({
            categoryId: CATEGORY_ID,
            categoryName: 'Cervezas',
        } as never);

        driver = createNodeSqliteMirrorDriver();
        ensureMirrorSchema(driver, () => 1_700_000_000_000);

        // Espejo sin red, con el catálogo ya guardado de una sesión anterior.
        const mirror = createMirrorRepository(driver, { isOffline: () => true });
        mirror.put(MIRROR_KEYS.productsByCategory(CATEGORY_ID), {
            success: true,
            data: [PRODUCTO],
        });
        setMirrorForTests(mirror);

        useAuthStore.setState({
            user: {
                id: 'u-garzon',
                name: 'Sebas',
                lastName: 'G',
                email: 'sebas@lasmunecasderamon.com',
                role: 'garzon',
                foto: '',
                username: 'sebas',
            },
        });
        useCartStore.setState({ cart: [], tipEnabled: false, tipPercentage: 10 });

        outbox.enqueueAndSend.mockReset();
        outbox.enqueueAndSend.mockResolvedValue(intentoPendiente);
        showToast.mockReset();
    });

    afterEach(() => {
        setMirrorForTests(null);
        driver.close();
    });

    const montarConProductoEnCarro = async () => {
        const { result } = renderHook(() => useGarzonProductos());

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.addToCart(PRODUCTO as never);
        });

        return result;
    };

    it('debe tomar el catálogo del espejo cuando no hay red', async () => {
        const { result } = renderHook(() => useGarzonProductos());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.products.map(p => p.name)).toEqual(['Corona 210']);
        expect(result.current.fromCache).toBe(true);
    });

    it('debe encolar el pedido cuando no hay red, sin perderlo', async () => {
        const result = await montarConProductoEnCarro();

        await act(async () => {
            await result.current.submitOrder();
        });

        expect(outbox.enqueueAndSend).toHaveBeenCalledTimes(1);
        const intent = outbox.enqueueAndSend.mock.calls[0][0];
        expect(intent.type).toBe('order.create');
        expect(intent.label).toContain('Pedido');
        expect(intent.payload.meseroId).toBe('u-garzon');
        expect(intent.payload.detalles).toHaveLength(1);
        expect(intent.payload.detalles[0].productoId).toBe('prod-1');

        // El usuario se entera de que quedó guardado, y el carro se vacía.
        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'info', text1: expect.stringContaining('guardado') })
        );
        expect(useCartStore.getState().cart).toEqual([]);
    });

    it('debe avisar éxito cuando el servidor confirmó el pedido', async () => {
        outbox.enqueueAndSend.mockResolvedValue({ ...intentoPendiente, status: 'aplicada' });
        const result = await montarConProductoEnCarro();

        await act(async () => {
            await result.current.submitOrder();
        });

        expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
        expect(useCartStore.getState().cart).toEqual([]);
    });

    it('debe mostrar el motivo cuando el servidor rechazó el pedido', async () => {
        outbox.enqueueAndSend.mockResolvedValue({
            ...intentoPendiente,
            status: 'fallida',
            lastError: 'Código es requerido',
        });
        const result = await montarConProductoEnCarro();

        await act(async () => {
            await result.current.submitOrder();
        });

        expect(showToast).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'error', text2: 'Código es requerido' })
        );
        // Un rechazo no vacía el carro: el garzón puede corregir y reintentar.
        expect(useCartStore.getState().cart).toHaveLength(1);
    });

    it('no debe encolar nada con el carro vacío', async () => {
        const { result } = renderHook(() => useGarzonProductos());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.submitOrder();
        });

        expect(outbox.enqueueAndSend).not.toHaveBeenCalled();
    });
});
