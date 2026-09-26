import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useClientes } from '@/hooks/useClientes';
import { apiClientSafe } from '@/api/client';
import { clientesService } from '@/services';

/**
 * Check de caja cerrada en la carga de saldo prepago (Módulo Clientes): el
 * prepago descuenta de caja en el backend (`deductFromCaja`), así que con
 * caja cerrada el guard de `handleLoadBalance` corta antes del POST y el
 * modal muestra el banner con el botón deshabilitado.
 *
 * `@/services` se mockea completo: clientesService usa `@/api/client-safe`
 * (que no pasa por el mock de `@/api/client`) y dispararía HTTP real.
 */
vi.mock('@/services', () => ({
    clientesService: {
        list: vi.fn(() => Promise.resolve({ success: true, data: [] })),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        prepago: vi.fn(() => Promise.resolve({ success: true })),
        getHistory: vi.fn(() => Promise.resolve({ success: true, data: [] })),
    },
}));

const mockClients = {
    success: true,
    data: [
        { id: 'cl1', name: 'Juan', lastName: 'Pérez', saldo: 0, deuda: 0 },
    ],
};

const mockCajaCerrada = { success: true, data: { hasOpenCaja: false, cajaInfo: null } };
const mockCajaAbierta = { success: true, data: { hasOpenCaja: true, cajaInfo: { id_caja: 'caja1' } } };

describe('useClientes — check de caja para el prepago', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(clientesService.list).mockResolvedValue(mockClients as any);
    });

    const mockCaja = (res: unknown) =>
        vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
            if (url === '/cashregister/status') return res as any;
            return { success: true, data: [] };
        });

    it('expone cajaAbierta=false cuando no hay caja abierta', async () => {
        mockCaja(mockCajaCerrada);

        const { result } = renderHook(() => useClientes());
        await waitFor(() => expect(result.current.cajaAbierta).toBe(false));
    });

    it('con caja cerrada, el guard bloquea handleLoadBalance sin llamar al prepago', async () => {
        mockCaja(mockCajaCerrada);

        const { result } = renderHook(() => useClientes());
        await waitFor(() => expect(result.current.cajaAbierta).toBe(false));

        await act(async () => {
            result.current.handleOpenLoad({ id: 'cl1', name: 'Juan', lastName: 'Pérez', saldo: 0, deuda: 0 } as any);
            result.current.setLoadingAmount('10.000');
        });

        await act(async () => {
            await result.current.handleLoadBalance();
        });

        expect(clientesService.prepago).not.toHaveBeenCalled();
        expect(result.current.loadModalVisible).toBe(true); // el modal sigue abierto
    });

    it('con caja abierta, handleLoadBalance llega a llamar al prepago', async () => {
        mockCaja(mockCajaAbierta);

        const { result } = renderHook(() => useClientes());
        await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

        await act(async () => {
            result.current.handleOpenLoad({ id: 'cl1', name: 'Juan', lastName: 'Pérez', saldo: 0, deuda: 0 } as any);
            result.current.setLoadingAmount('10.000');
        });

        await act(async () => {
            await result.current.handleLoadBalance();
        });

        expect(clientesService.prepago).toHaveBeenCalledTimes(1);
        expect(result.current.loadModalVisible).toBe(false); // éxito cierra el modal
    });

    it('refreshCajaStatus no pisa el estado conocido si la consulta falla', async () => {
        mockCaja(mockCajaCerrada);

        const { result } = renderHook(() => useClientes());
        await waitFor(() => expect(result.current.cajaAbierta).toBe(false));

        vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
            if (url === '/cashregister/status') throw new Error('network down');
            return { success: true, data: [] } as any;
        });

        await act(async () => {
            await result.current.refreshCajaStatus();
        });

        expect(result.current.cajaAbierta).toBe(false);
    });
});
