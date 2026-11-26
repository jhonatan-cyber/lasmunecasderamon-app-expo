import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCaja } from '@/hooks/useCaja';
import { connectivity } from '@/services/connectivity';
import { useCajaAbiertaStore } from '@/store/cajaAbiertaStore';

const mocks = vi.hoisted(() => ({
    showToast: vi.fn(),
    router: {},
    cajaService: {
        status: vi.fn(),
        resumen: vi.fn(),
        open: vi.fn(),
        retiros: vi.fn(),
        solicitarCierre: vi.fn(),
        reenviarAvisoCierre: vi.fn(),
    },
    entradasService: { listar: vi.fn() },
}));

vi.mock('@/utils/toast-lazy', () => ({ showToast: mocks.showToast }));
vi.mock('@/services', () => ({
    cajaService: mocks.cajaService,
    entradasService: mocks.entradasService,
}));
vi.mock('@/services/mirror', () => ({
    getMirror: () => ({
        readThroughDetailed: async (_key: string, fetcher: () => Promise<unknown>) => ({
            data: await fetcher(),
            fromCache: false,
        }),
    }),
    MIRROR_KEYS: { cashregisterStatus: 'cashregister-status', cashregisterSummary: 'cashregister-summary' },
    MIRROR_MAX_AGE_MS: { dinero: 60_000 },
}));
vi.mock('@/hooks/useAccentColor', () => ({ useAccentColor: () => ({ accentColor: '#933333' }) }));
vi.mock('expo-router', () => ({ useRouter: () => mocks.router }));
vi.mock('@/store/authStore', () => ({
    useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
        selector({ user: { id: 'cajero-1' } }),
}));

const CAJA_INFO = { id_caja: 'caja-1', fecha_apertura: '2026-09-28 09:00:00' };
const CAJA_STATS = {
    efectivo_en_caja: 30_000,
    total_efectivo: 35_000,
    monto_cierre_previsto: 25_000,
};

beforeEach(() => {
    vi.clearAllMocks();
    useCajaAbiertaStore.getState().reset();
    connectivity.handleNetworkState({ isConnected: true, isInternetReachable: true });
    mocks.cajaService.status.mockResolvedValue({
        success: true,
        data: { hasOpenCaja: true, cajaInfo: CAJA_INFO },
    });
    mocks.cajaService.resumen.mockResolvedValue({ success: true, data: CAJA_STATS });
    mocks.entradasService.listar.mockResolvedValue({ success: true, data: [] });
});

afterEach(() => {
    useCajaAbiertaStore.getState().reset();
    connectivity.handleNetworkState({});
});

describe('useCaja', () => {
    it('bloquea apertura, retiro y cierre sin conexión', async () => {
        const { result } = renderHook(() => useCaja());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => connectivity.handleNetworkState({ isConnected: false }));
        await waitFor(() => expect(result.current.isOffline).toBe(true));

        for (const modalType of ['abrir', 'retiro', 'cerrar'] as const) {
            act(() => result.current.dispatch({ type: 'OPEN_MODAL', payload: modalType }));
            await act(async () => result.current.handleSubmit());
        }

        expect(mocks.cajaService.open).not.toHaveBeenCalled();
        expect(mocks.cajaService.retiros).not.toHaveBeenCalled();
        expect(mocks.cajaService.solicitarCierre).not.toHaveBeenCalled();
        expect(mocks.showToast).toHaveBeenCalledTimes(3);
        expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({ text1: 'Sin conexión' }));
    });

    it('rechaza un retiro que supera el efectivo disponible', async () => {
        const { result } = renderHook(() => useCaja());
        await waitFor(() => expect(result.current.stats?.efectivo_en_caja).toBe(30_000));

        act(() => {
            result.current.dispatch({ type: 'OPEN_MODAL', payload: 'retiro' });
            result.current.handleMontoChange('40000');
        });
        await act(async () => result.current.handleSubmit());

        expect(result.current.monto).toBe('40.000');
        expect(mocks.cajaService.retiros).not.toHaveBeenCalled();
        expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({
            type: 'warning',
            text1: 'Monto excedido',
        }));
    });

    it('deja la caja abierta cuando la solicitud de cierre queda pendiente', async () => {
        mocks.cajaService.solicitarCierre.mockResolvedValue({
            success: true,
            data: { estado: 'pendiente', saldo_clientes_descontado: 2_500 },
        });
        const { result } = renderHook(() => useCaja());
        await waitFor(() => expect(result.current.cajaAbierta).toBe(true));

        act(() => result.current.dispatch({ type: 'OPEN_MODAL', payload: 'cerrar' }));
        await act(async () => result.current.handleSubmit());

        expect(mocks.cajaService.solicitarCierre).toHaveBeenCalledWith({
            id_caja: CAJA_INFO.id_caja,
            motivo: 'Cierre de turno',
        });
        expect(result.current.modalVisible).toBe(false);
        expect(result.current.cajaAbierta).toBe(true);
        expect(mocks.showToast).toHaveBeenCalledWith(expect.objectContaining({
            type: 'success',
            text1: 'Cierre enviado',
        }));
    });
});