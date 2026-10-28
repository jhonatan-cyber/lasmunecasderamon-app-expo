import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { apiClientSafe } from '@/api/client';
import { useDashboardData } from '@/hooks/useDashboardData';
const state = vi.hoisted(() => ({ userId: 'user-a' }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: any) => selector({ user: { id: state.userId } }),
    { getState: () => ({ updateProfile: vi.fn() }) },
  ),
}));
vi.mock('@/hooks/useDebouncedEventListener', () => ({
  useDebouncedEventListener: vi.fn(),
  useDebouncedEventListeners: vi.fn(),
}));
beforeEach(() => {
  state.userId = 'user-a';
  vi.mocked(useQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: new Error('offline'),
    refetch: vi.fn(),
  } as any);
});
afterEach(cleanup);
it('expone un fallo real sin convertirlo en un calendario vacío', () => {
  const { result } = renderHook(() => useDashboardData('barman'));
  expect(result.current.error).toBeInstanceOf(Error);
});
it('conserva los eventos anteriores si falla una actualización', () => {
  vi.mocked(useQuery).mockReturnValue({
    data: { events: [{ id: 'a' }] },
    isLoading: false,
    isFetching: false,
    error: new Error('offline'),
    refetch: vi.fn(),
  } as any);
  const { result } = renderHook(() => useDashboardData('cajero'));
  expect(result.current.error).toBeNull();
  expect(result.current.events).toEqual([{ id: 'a' }]);
});
it('separa el caché al cambiar de cuenta aunque ambas tengan el mismo rol', () => {
  const { rerender } = renderHook(() => useDashboardData('garzon'));
  const first = (vi.mocked(useQuery).mock.lastCall![0] as any).queryKey;
  state.userId = 'user-b';
  rerender();
  const second = (vi.mocked(useQuery).mock.lastCall![0] as any).queryKey;
  expect(first).not.toEqual(second);
});
it.each(['anfitriona', 'cajero', 'barman', 'garzon'] as const)(
  'usa los eventos personales en el inicio de %s',
  async (role) => {
    vi.mocked(apiClientSafe).mockImplementation(
      async (url: string) =>
        ({
          success: true,
          data:
            url === '/events/user'
              ? [
                  {
                    id: 'a',
                    type: 'asistencia',
                    amount: 10000,
                    date: '2026-10-14',
                  },
                ]
              : url === '/auth/me'
                ? { user: { id: 'user-a' } }
                : url === '/users/status'
                  ? { status: 1 }
                  : url === '/users/me/stats'
                    ? { stats: { montoAnticipoMaximo: 10000 } }
                    : [],
        }) as any,
    );
    renderHook(() => useDashboardData(role));
    const options = vi.mocked(useQuery).mock.lastCall![0] as any;
    const data = await options.queryFn();
    expect(data.events[0]).toMatchObject({ id: 'a', amount: 10000 });
    expect(data.payoutTotal).toBe(10000);
  },
);
