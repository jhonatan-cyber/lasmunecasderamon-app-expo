import React, { Fragment, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PersonalScreen from '@/app/(app)/cajero/personal';

const h = vi.hoisted(() => ({
  rowRenders: {} as Record<string, number>,
  apiClientSafe: vi.fn(),
}));

type RenderProps = {
  children?: ReactNode;
  style?: unknown;
  onPress?: () => void;
  onRefresh?: () => void;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  value?: string;
};

vi.mock('react-native', () => ({
  View: ({ children }: RenderProps) => <div>{children}</div>,
  Text: ({ children }: RenderProps) => <span>{children}</span>,
  Pressable: ({ children, onPress }: RenderProps) => <button onClick={onPress}>{children}</button>,
  TextInput: ({ value, onChangeText, placeholder }: RenderProps) => (
    <input
      aria-label="buscar-personal"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChangeText?.(event.target.value)}
    />
  ),
  RefreshControl: ({ onRefresh }: RenderProps) => <button onClick={onRefresh}>Actualizar</button>,
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios },
  StyleSheet: { create: (styles: unknown) => styles },
  FlatList: ({ data, renderItem, keyExtractor, ListEmptyComponent }: any) => (
    <div>
      {data.length > 0
        ? data.map((item: any, index: number) => (
            <Fragment key={keyExtractor(item)}>{renderItem({ item, index })}</Fragment>
          ))
        : ListEmptyComponent}
    </div>
  ),
}));
vi.mock('@/components/shared/VirtualizedList', () => ({
  default: ({ data, renderItem, keyExtractor, ListEmptyComponent }: any) => (
    <div>
      {data.length > 0
        ? data.map((item: any, index: number) => (
            <Fragment key={keyExtractor(item)}>{renderItem({ item, index })}</Fragment>
          ))
        : ListEmptyComponent}
    </div>
  ),
}));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react');
  return {
    Stack: { Screen: () => null },
    useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
    useFocusEffect: (callback: () => void | (() => void)) => useEffect(callback, [callback]),
  };
});
vi.mock('@/components/ui/AnimatedView', () => ({
  AnimatedView: ({ children }: RenderProps) => <div>{children}</div>,
}));
vi.mock('@/components/ui/PremiumHeader', () => ({ PremiumHeader: () => null }));
vi.mock('@/components/ui/SkeletonLoader', () => ({ SkeletonLoader: () => null }));
vi.mock('@/components/cajero/personal/PersonalQRModal', () => ({ PersonalQRModal: () => null }));
vi.mock('@/api/client', () => ({ BASE_URL: '' }));
vi.mock('@/api/client-safe', () => ({ apiClientSafe: h.apiClientSafe }));
vi.mock('@/utils/eventBus', () => ({
  eventBus: { addListener: vi.fn(() => ({ remove: vi.fn() })) },
}));
vi.mock('@/utils/toast-lazy', () => ({ showToast: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  default: { debug: vi.fn(), captureException: vi.fn(), fetchError: vi.fn() },
}));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#000',
    accentBg: '#eee',
    bg: '#fff',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#ddd',
  }),
}));
vi.mock('@/hooks/useResponsiveMetrics', () => ({
  useResponsiveMetrics: () => ({ width: 400, isTablet: false, isLandscape: false }),
}));
vi.mock('@/hooks/useRenderCount', () => ({
  useRenderCount: (name: string, props?: Record<string, unknown>) => {
    if (name !== 'PersonalCard' || props?.userId === undefined) return;
    const id = String(props.userId);
    h.rowRenders[id] = (h.rowRenders[id] ?? 0) + 1;
  },
}));

const STAFF = [
  { id: 'u1', name: 'Ana', lastName: 'Pérez', nick: 'ana', role: 'Garzon' },
  { id: 'u2', name: 'Bruno', lastName: 'Díaz', nick: 'bruno', role: 'Garzon' },
  { id: 'u3', name: 'Carla', lastName: 'Soto', nick: 'carla', role: 'Cajero' },
];

beforeEach(() => {
  h.rowRenders = {};
  h.apiClientSafe.mockReset().mockImplementation(async (path: string) => {
    if (path.startsWith('/users')) return { success: true, data: STAFF };
    return { success: false };
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PersonalScreen: repintado de filas al buscar', () => {
  it('no vuelve a renderizar las tarjetas que siguen en la lista', async () => {
    render(<PersonalScreen />);

    await waitFor(() => expect(screen.getByText('Ana')).toBeTruthy());
    expect(h.rowRenders['u1']).toBe(1);

    fireEvent.change(screen.getByLabelText('buscar-personal'), { target: { value: 'ana' } });

    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.queryByText('Bruno')).toBeNull();
    expect(h.rowRenders['u1']).toBe(1);
  });
});
