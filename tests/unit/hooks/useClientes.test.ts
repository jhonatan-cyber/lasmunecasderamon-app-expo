import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useClientes } from '@/hooks/useClientes';

vi.mock('react-native', () => ({ Alert: { alert: vi.fn() } }));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useFocusEffect: () => {},
}));
vi.mock('@/utils/toast-lazy', () => ({ showToast: vi.fn() }));
vi.mock('@/api/client', () => ({
  apiClientSafe: vi.fn(() => Promise.resolve({ success: false })),
}));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#000',
    isDark: false,
    textPrimary: '#111',
    textSecondary: '#555',
  }),
}));
vi.mock('@/hooks/useResponsiveMetrics', () => ({
  useResponsiveMetrics: () => ({ isTablet: false }),
}));
vi.mock('@/services', () => ({
  clientesService: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    prepago: vi.fn(),
    getHistory: vi.fn(),
  },
}));
vi.mock('@/hooks/useDebouncedEventListener', () => ({
  useDebouncedEventListener: () => {},
}));
vi.mock('@/utils/realtime', () => ({
  REALTIME_EVENT_NAMES: { refreshClients: 'refreshClients' },
}));
vi.mock('@/utils/logger', () => ({
  default: {
    debug: vi.fn(),
    captureException: vi.fn(),
    fetchError: vi.fn(),
  },
}));

afterEach(() => { vi.clearAllMocks(); });

describe('useClientes: callbacks de fila estables', () => {
  it('mantiene la misma referencia en los handlers que recibe cada tarjeta', () => {
    const { result, rerender } = renderHook(() => useClientes());
    const handlers = {
      handleOpenEdit: result.current.handleOpenEdit,
      handleOpenLoad: result.current.handleOpenLoad,
      handleOpenHistory: result.current.handleOpenHistory,
      confirmDelete: result.current.confirmDelete,
      fetchClients: result.current.fetchClients,
    };

    rerender();

    expect(result.current.handleOpenEdit).toBe(handlers.handleOpenEdit);
    expect(result.current.handleOpenLoad).toBe(handlers.handleOpenLoad);
    expect(result.current.handleOpenHistory).toBe(handlers.handleOpenHistory);
    expect(result.current.confirmDelete).toBe(handlers.confirmDelete);
    expect(result.current.fetchClients).toBe(handlers.fetchClients);
  });
});
