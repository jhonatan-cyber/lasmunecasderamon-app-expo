import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsistencia } from '@/hooks/useAsistencia';
import { apiClient } from '@/api/client';

const mockAsistencias = [
    {
        id_asistencia: 1,
        usuario_id: 1,
        fecha: '2025-01-01',
        hora: '09:00',
        sueldo: 50000,
        aporte: 5000,
        estado: 1,
    },
    {
        id_asistencia: 2,
        usuario_id: 1,
        fecha: '2025-01-02',
        hora: '09:00',
        sueldo: 50000,
        aporte: 5000,
        estado: 0,
    },
];

describe('useAsistencia', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe cargar asistencias al montarse', async () => {
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockAsistencias });
        vi.mocked(apiClient).mockResolvedValueOnce([]); 

        const { result } = renderHook(() => useAsistencia());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.asistencias).toHaveLength(2);
        expect(result.current.error).toBe('');
    });

    it('debe cargar gratificaciones correctamente', async () => {
        const mockGratificaciones = [
            { id: '1', usuario_id: 1, monto: 10000, descripcion: 'Bono', fecha_hora: '2025-01-01', estado: 1 },
        ];

        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockAsistencias });
        vi.mocked(apiClient).mockResolvedValueOnce(mockGratificaciones);

        const { result } = renderHook(() => useAsistencia());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.gratificaciones).toHaveLength(1);
        expect(result.current.gratificaciones[0].monto).toBe(10000);
    });

    it('debe manejar error en fetchAsistencias', async () => {
        vi.mocked(apiClient).mockRejectedValueOnce(new Error('Error de conexión'));
        vi.mocked(apiClient).mockResolvedValueOnce([]);

        const { result } = renderHook(() => useAsistencia());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Error de conexión');
    });

    it('debe permitir cambiar el tab activo', async () => {
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClient).mockResolvedValueOnce([]);

        const { result } = renderHook(() => useAsistencia());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.activeTab).toBe('asistencias');

        await act(async () => {
            result.current.setActiveTab('gratificaciones');
        });

        expect(result.current.activeTab).toBe('gratificaciones');
    });

    it('debe permitir cambiar el filtro', async () => {
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClient).mockResolvedValueOnce([]);

        const { result } = renderHook(() => useAsistencia());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.filter).toBe('all');

        await act(async () => {
            result.current.setFilter('pendiente');
        });

        expect(result.current.filter).toBe('pendiente');
    });

    it('onRefresh debe refrescar asistencias y gratificaciones', async () => {
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: [] });
        vi.mocked(apiClient).mockResolvedValueOnce([]);

        const { result } = renderHook(() => useAsistencia());

        await waitFor(() => expect(result.current.loading).toBe(false));

        vi.mocked(apiClient).mockClear();
        vi.mocked(apiClient).mockResolvedValueOnce({ success: true, data: mockAsistencias });
        vi.mocked(apiClient).mockResolvedValueOnce([]);

        await act(async () => {
            result.current.onRefresh();
        });

        expect(result.current.refreshing).toBe(false);
        expect(result.current.asistencias).toHaveLength(2);
    });
});
