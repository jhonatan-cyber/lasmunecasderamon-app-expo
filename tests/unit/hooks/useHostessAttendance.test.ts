import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { apiClientSafe } from '@/api/client';
import { useAsistencia } from '@/hooks/useAsistencia';
vi.mock('@/store/authStore', () => ({ useAuthStore: (selector: any) => selector({ user: { role: 'Anfitriona' } }) }));
beforeEach(() => vi.mocked(apiClientSafe).mockReset());
it('carga el historial completo y el descuento de alojamiento del mismo backend', async () => {
  vi.mocked(apiClientSafe).mockImplementation(async (endpoint: string) => ({
    success: true,
    data: endpoint === '/attendance/user' ? [{ descuento_total: 12000 }] : endpoint === '/attendance/user?tipo=detalle' ? [{ estado: 1, sueldo: 50000, aporte: 5000 }] : []
  }) as any);
  const { result } = renderHook(useAsistencia);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.isHostess).toBe(true);
  expect(result.current.housingDiscountTotal).toBe(12000);
  expect(apiClientSafe).toHaveBeenCalledWith('/attendance/user?tipo=detalle', expect.anything());
  expect(apiClientSafe).toHaveBeenCalledWith('/attendance/user', expect.anything());
});
