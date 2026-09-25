import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGratificaciones } from '@/hooks/useGratificaciones';
import { apiClientSafe } from '@/api/client';
import { emitRefreshGratificaciones } from '@/utils/realtime';

/**
 * Cadena SSE `new_gratificacion_request` / `gratificacion_processed` (admin) →
 * NotificationContext → emitRefreshGratificaciones → useGratificaciones.
 * Aquí se cubre el último eslabón: la lista abierta se refresca sola.
 */
describe('useGratificaciones — refresh en vivo por SSE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refresca la lista al recibir refresh_gratificaciones', async () => {
    let gratificacionesLlamada = 0;
    vi.mocked(apiClientSafe).mockImplementation(async (url: string) => {
      if (url.startsWith('/gratificaciones')) {
        gratificacionesLlamada++;
        return {
          success: true,
          data: [
            {
              id: gratificacionesLlamada,
              id_usuario: 'u1',
              usuario: 'Damo',
              monto: 5000,
              descripcion: 'Buen servicio',
              estado: 2,
              fecha_crea: '2026-09-25 10:00:00',
            },
          ],
        };
      }
      // /users?status=active (empleados para el formulario)
      return { success: true, data: [] };
    });

    const { result } = renderHook(() => useGratificaciones());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.gratificaciones).toHaveLength(1);
    expect(result.current.gratificaciones[0].id).toBe('1');

    act(() => {
      emitRefreshGratificaciones({ type: 'gratificacion_processed' });
    });

    await waitFor(() => expect(result.current.gratificaciones[0]?.id).toBe('2'));
    expect(gratificacionesLlamada).toBe(2);
    expect(result.current.gratificaciones[0].monto).toBe(5000);
  });

  it('deja de escuchar al desmontar', async () => {
    let llamadas = 0;
    vi.mocked(apiClientSafe).mockImplementation(async () => {
      llamadas++;
      return { success: true, data: [] };
    });

    const { unmount } = renderHook(() => useGratificaciones());
    // Carga inicial: /gratificaciones + /users?status=active
    await waitFor(() => expect(llamadas).toBeGreaterThanOrEqual(2));

    const antes = llamadas;
    unmount();
    act(() => {
      emitRefreshGratificaciones({ type: 'gratificacion_processed' });
    });
    expect(llamadas).toBe(antes);
  });
});
