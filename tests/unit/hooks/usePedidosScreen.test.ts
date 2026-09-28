import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MIRROR_KEYS, setMirrorForTests } from '@/services/mirror';
import { createMirrorRepository } from '@/services/mirror/repository';
import { ensureMirrorSchema } from '@/services/mirror/schema';
import { createNodeSqliteMirrorDriver } from '../../helpers/nodeSqliteMirrorDriver';

const categoriesService = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/services', () => ({ categoriesService }));

import { usePedidosScreen } from '@/hooks/usePedidosScreen';

const CATEGORIAS = [
    { id: 'cat-1', name: 'Cervezas', description: '', status: 1, total_products: 4, display_order: 1 },
    { id: 'cat-2', name: 'Tragos', description: '', status: 1, total_products: 9, display_order: 2 },
];

describe('usePedidosScreen · espejo local', () => {
    let driver: ReturnType<typeof createNodeSqliteMirrorDriver>;
    let online: boolean;

    beforeEach(() => {
        driver = createNodeSqliteMirrorDriver();
        // El esquema del espejo llega por migración; acá se aplica a mano.
        ensureMirrorSchema(driver, () => 1_700_000_000_000);
        online = true;
        setMirrorForTests(createMirrorRepository(driver, { isOffline: () => !online }));

        categoriesService.list.mockReset();
        categoriesService.list.mockResolvedValue({ success: true, data: CATEGORIAS });
    });

    afterEach(() => {
        setMirrorForTests(null);
        driver.close();
    });

    it('debe leer de la red y dejar el catálogo espejado', async () => {
        const { result } = renderHook(() => usePedidosScreen());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.categories.map(c => c.name)).toEqual(['Cervezas', 'Tragos']);
        expect(result.current.fromCache).toBe(false);
        expect(result.current.error).toBe('');

        await act(async () => {
            await result.current.fetchCategories();
        });

        expect(
            driver.getFirst<{ total: number }>('SELECT COUNT(*) AS total FROM mirror_cache')?.total
        ).toBe(1);
    });

    it('debe seguir mostrando el catálogo guardado cuando se corta la red', async () => {
        const primero = renderHook(() => usePedidosScreen());
        await waitFor(() => expect(primero.result.current.loading).toBe(false));
        primero.unmount();

        online = false;
        categoriesService.list.mockRejectedValue(new Error('Network request failed'));

        const { result } = renderHook(() => usePedidosScreen());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.fromCache).toBe(true);
        expect(result.current.categories.map(c => c.name)).toEqual(['Cervezas', 'Tragos']);
        expect(result.current.syncedAt).toBeGreaterThan(0);
        expect(result.current.error).toBe('');
    });

    it('debe avisar sin red y sin catálogo guardado', async () => {
        online = false;
        categoriesService.list.mockRejectedValue(new Error('Network request failed'));

        const { result } = renderHook(() => usePedidosScreen());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.categories).toEqual([]);
        expect(result.current.fromCache).toBe(false);
        expect(result.current.error).toContain('Sin conexión');
    });

    it('debe usar el dato guardado si el servidor falla estando conectado', async () => {
        const primero = renderHook(() => usePedidosScreen());
        await waitFor(() => expect(primero.result.current.loading).toBe(false));
        primero.unmount();

        categoriesService.list.mockRejectedValue(new Error('servidor caído'));

        const { result } = renderHook(() => usePedidosScreen());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.fromCache).toBe(true);
        expect(result.current.categories).toHaveLength(2);
    });

    it('debe exponer el error del servidor cuando no hay nada guardado', async () => {
        categoriesService.list.mockRejectedValue(new Error('El servidor rechazó la consulta'));

        const { result } = renderHook(() => usePedidosScreen());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('El servidor rechazó la consulta');
    });

    it('debe filtrar categorías inactivas y ordenar por display_order', async () => {
        categoriesService.list.mockResolvedValue({
            success: true,
            data: [
                { ...CATEGORIAS[1], status: 0 },
                { ...CATEGORIAS[1], display_order: 9 },
                { ...CATEGORIAS[0], display_order: 2 },
            ],
        });

        const { result } = renderHook(() => usePedidosScreen());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.categories.map(c => c.display_order)).toEqual([2, 9]);
    });

    it('debe sobrevivir a una respuesta sin datos', async () => {
        categoriesService.list.mockResolvedValue({ success: false, message: 'nada' });

        const { result } = renderHook(() => usePedidosScreen());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.categories).toEqual([]);
        expect(result.current.error).toBe('nada');
    });

    it('debe usar la clave de espejo del catálogo', async () => {
        const { result } = renderHook(() => usePedidosScreen());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(MIRROR_KEYS.categories).toBe('catalog.categories');
        expect(driver.getFirst<{ key: string }>('SELECT key FROM mirror_cache')?.key).toBe(
            'catalog.categories'
        );
    });
});
