import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTimerVoiceAnnouncer } from '@/context/hooks/useTimerVoiceAnnouncer';

const mocks = vi.hoisted(() => ({
  speak: vi.fn(),
}));

vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));
vi.mock('expo-speech', () => ({ speak: mocks.speak }));
vi.mock('@/utils/realtime', () => ({ emitRefreshSales: vi.fn() }));
vi.mock('@/utils/userRole', () => ({ isCajeroRole: () => true }));
vi.mock('@/utils/logger', () => ({
  default: { captureException: vi.fn(), debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/utils/timeUtils', () => ({
  calculateRemainingTime: () => 270,
  parseDateSafe: (value: unknown) => new Date(value as string),
}));

const timer = {
  id: 1,
  isActive: true,
  isPaused: false,
  estado: 1,
  startTime: new Date('2026-11-17T10:00:00Z'),
  roomName: 'Sala 1',
};

describe('useTimerVoiceAnnouncer: solo trabaja con timers en curso', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.speak.mockClear();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('no anuncia ni programa chequeos mientras no hay timers activos', async () => {
    const { rerender } = renderHook(
      ({ hasActiveTimers }: { hasActiveTimers: boolean }) =>
        useTimerVoiceAnnouncer({
          timersRef: { current: [timer] } as any,
          serverOffset: 0,
          user: { role: 'cajero' } as any,
          setTimers: vi.fn(),
          setExpiredTimer: vi.fn(),
          hasActiveTimers,
        }),
      { initialProps: { hasActiveTimers: false } },
    );

    vi.advanceTimersByTime(10_000);

    expect(mocks.speak).not.toHaveBeenCalled();

    rerender({ hasActiveTimers: true });

    expect(mocks.speak).toHaveBeenCalledTimes(1);
  });
});
