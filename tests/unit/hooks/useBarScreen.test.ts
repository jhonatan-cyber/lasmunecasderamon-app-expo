import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBarScreen } from '@/hooks/useBarScreen';
import { barService } from '@/services/bar';
import { emitRefreshBar } from '@/utils/realtime';

vi.mock('@/services/bar', () => ({
  barService: {
    stock: vi.fn(),
    movements: vi.fn(),
    pendingTransfers: vi.fn(),
    acceptTransfer: vi.fn(),
    rejectTransfer: vi.fn(),
    containers: vi.fn(),
    returnContainer: vi.fn(),
  },
}));

/**
 * Cadena `bar_shot_alert` (SSE del dashboard) → NotificationContext →
 * emitRefreshBar → useBarScreen. Aquí se cubre el último eslabón: la pantalla
 * Bar reacciona al evento y deja de escuchar al desmontar.
 */
describe('useBarScreen — refresh en vivo por bar_shot_alert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(barService.stock).mockResolvedValue({ success: true, data: [] } as never);
    vi.mocked(barService.pendingTransfers).mockResolvedValue({ success: true, data: [] } as never);
    vi.mocked(barService.movements).mockResolvedValue({ success: true, data: [] } as never);
  });

  it('refresca el stock cuando se emite refresh_bar', async () => {
    renderHook(() => useBarScreen());
    await waitFor(() => expect(barService.stock).toHaveBeenCalledTimes(1));

    act(() => {
      emitRefreshBar({ type: 'bar_shot_alert' });
    });

    await waitFor(() => expect(barService.stock).toHaveBeenCalledTimes(2));
  });

  it('deja de escuchar refresh_bar al desmontar', async () => {
    const { unmount } = renderHook(() => useBarScreen());
    await waitFor(() => expect(barService.stock).toHaveBeenCalledTimes(1));

    unmount();
    act(() => {
      emitRefreshBar({ type: 'bar_shot_alert' });
    });

    // Sin oyentes: la emisión no vuelve a llamar al servicio.
    expect(barService.stock).toHaveBeenCalledTimes(1);
  });
});
