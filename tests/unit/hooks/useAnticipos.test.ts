import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnticipos } from '@/hooks/useAnticipos';
import { apiClient } from '@/api/client';

const mockSolicitudes = [
    {
        id_solicitud: 1,
        usuario_id: 1,
        fecha_crea: '2025-01-01',
        fecha_mod: null,
        monto: 50000,
        estado: 'pendiente',
        estado_texto: 'Pendiente',
    },
    {
        id_solicitud: 2,
        usuario_id: 1,
        fecha_crea: '2025-01-02',
        fecha_mod: null,
        monto: 75000,
        estado: 'confirmada',
        estado_texto: 'Confirmada',
    },
];

const mockPagos = [
    { id_pago: 1, monto: 25000, fecha: '2025-01-01' },
];

const mockMaximo = {
    success: true,
    data: {
        monto_maximo: 100000,
        monto_asistencia: 50000,
        monto_comisiones: 30000,
        monto_propinas: 20000,
        tiene_solicitud_pendiente: false,
    },
};

describe('useAnticipos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe cargar solicitudes y pagos al montarse', async () => {
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockSolicitudes });
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockPagos });
        vi.mocked(apiClient).mockResolvedValueOnce(mockMaximo);

        const { result } = renderHook(() => useAnticipos());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.solicitudes).toHaveLength(2);
        expect(result.current.pagos).toHaveLength(1);
        expect(result.current.montoMaximo).toBe(100000);
        expect(result.current.montoAsistencia).toBe(50000);
        expect(result.current.error).toBe('');
    });

    it('debe manejar error en fetchAnticipos', async () => {
        vi.mocked(apiClient).mockRejectedValueOnce(new Error('Error de conexión'));
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockPagos });
        vi.mocked(apiClient).mockResolvedValueOnce(mockMaximo);

        const { result } = renderHook(() => useAnticipos());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Error de conexión');
        expect(result.current.solicitudes).toEqual([]);
    });

    it('solicitarAnticipo debe hacer POST y refrescar datos', async () => {
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClient).mockResolvedValueOnce(mockMaximo);

        const { result } = renderHook(() => useAnticipos());

        await waitFor(() => expect(result.current.loading).toBe(false));

        
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true });
        
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockSolicitudes });
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockPagos });

        let res: boolean | undefined;
        await act(async () => {
            res = await result.current.solicitarAnticipo(50000, 'Motivo de prueba');
        });

        expect(res).toBe(true);
        const postCall = vi.mocked(apiClient).mock.calls.find(
            (call: any) => call[0] === '/anticipos/solicitudes' && call[1]?.method === 'POST'
        );
        expect(postCall).toBeTruthy();
    });

    it('solicitarAnticipo debe retornar false si la API falla', async () => {
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClient).mockResolvedValueOnce(mockMaximo);

        const { result } = renderHook(() => useAnticipos());

        await waitFor(() => expect(result.current.loading).toBe(false));

        vi.mocked(apiClient).mockResolvedValueOnce({ success: false, message: 'Error' });

        let res: boolean | undefined;
        await act(async () => {
            res = await result.current.solicitarAnticipo(50000, 'test');
        });

        expect(res).toBe(false);
    });

    it('onRefresh debe llamar a fetchAnticipos con isManual=true', async () => {
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClient).mockResolvedValueOnce(mockMaximo);

        const { result } = renderHook(() => useAnticipos());

        await waitFor(() => expect(result.current.loading).toBe(false));

        vi.mocked(apiClient).mockClear();
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockSolicitudes });
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockPagos });

        await act(async () => {
            result.current.onRefresh();
        });

        expect(result.current.refreshing).toBe(false);
    });
});
