import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useServicios } from '@/hooks/useServicios';
import { apiClientSafe } from '@/api/client';

const mockServicios = [
    {
        id_servicio: 1,
        codigo: 'SVC-001',
        tiempo: 30,
        fecha_crea: '2025-01-01',
        precio_servicio: 50000,
        comision_usuario: 15000,
        habitacion: 'VIP 1',
        anfitriona: 'María',
        cliente: 'Juan',
        estado: 1,
    },
    {
        id_servicio: 2,
        codigo: 'SVC-002',
        tiempo: 45,
        fecha_crea: '2025-01-02',
        precio_servicio: 75000,
        comision_usuario: 20000,
        habitacion: 'Suite 3',
        anfitriona: 'Ana',
        cliente: 'Carlos',
        estado: 2,
    },
];

describe('useServicios', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe cargar servicios al montarse', async () => {
        vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: mockServicios });

        const { result } = renderHook(() => useServicios());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.servicios).toHaveLength(2);
        expect(result.current.error).toBe('');
    });

    it('debe manejar error de conexión', async () => {
        vi.mocked(apiClientSafe).mockRejectedValueOnce(new Error('Error de conexión'));

        const { result } = renderHook(() => useServicios());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Error de conexión');
        expect(result.current.servicios).toEqual([]);
    });

    it('debe manejar error de API con mensaje', async () => {
        vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: false, message: 'Error al cargar servicios', data: null });

        const { result } = renderHook(() => useServicios());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Error al cargar servicios');
    });

    it('onRefresh debe refrescar datos', async () => {
        vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: [] });

        const { result } = renderHook(() => useServicios());

        await waitFor(() => expect(result.current.loading).toBe(false));

        vi.mocked(apiClientSafe).mockClear();
        vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: mockServicios });

        await act(async () => {
            result.current.onRefresh();
        });

        expect(result.current.refreshing).toBe(false);
        expect(result.current.servicios).toHaveLength(2);
    });

    it('handleAssistance debe enviar solicitud de asistencia', async () => {
        vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: null });

        const { result } = renderHook(() => useServicios());

        await waitFor(() => expect(result.current.loading).toBe(false));

        let res: boolean | undefined;
        await act(async () => {
            res = await result.current.handleAssistance(1, 'VIP 1', 'limpieza');
        });

        expect(res).toBe(true);
        expect(apiClientSafe).toHaveBeenCalledWith('/notifications/assistance', {
            method: 'POST',
            body: JSON.stringify({ servicioId: 1, roomName: 'VIP 1', type: 'limpieza' }),
        });
    });

    it('handleAssistance debe retornar false si falla', async () => {
        vi.mocked(apiClientSafe).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClientSafe).mockRejectedValueOnce(new Error('Error'));

        const { result } = renderHook(() => useServicios());

        await waitFor(() => expect(result.current.loading).toBe(false));

        let res: boolean | undefined;
        await act(async () => {
            res = await result.current.handleAssistance(1, 'VIP 1', 'limpieza');
        });

        expect(res).toBe(false);
    });
});
