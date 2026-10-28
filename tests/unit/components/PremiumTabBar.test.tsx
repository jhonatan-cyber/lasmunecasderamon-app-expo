import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PremiumTabBar } from '@/components/ui/PremiumTabBar';

vi.mock('react-native', () => ({
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
  Pressable: ({ children, onPress }: any) => (
    <button onClick={onPress}>{children}</button>
  ),
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('react-native-reanimated', () => ({
  default: { View: ({ children }: any) => <div>{children}</div> },
  useAnimatedStyle: () => ({}),
  useSharedValue: () => ({ value: 0 }),
  withSpring: (value: number) => value,
}));

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({ gradientColors: ['#000000', '#111111'] }),
}));

const navigation = {
  emit: vi.fn(() => ({ defaultPrevented: false })),
  navigate: vi.fn(),
};

const renderTabBar = (
  descriptors: Record<string, { options: Record<string, unknown> }>,
) =>
  render(
    <PremiumTabBar
      state={{
        index: 0,
        routes: [
          { key: 'a', name: 'asistencia' },
          { key: 'b', name: 'index' },
        ],
      }}
      descriptors={descriptors}
      navigation={navigation}
    />,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PremiumTabBar — pestañas ocultas', () => {
  it('no renderiza la pestaña marcada como oculta por expo-router (href: null)', () => {
    renderTabBar({
      a: {
        options: {
          title: 'Asistencia',
          tabBarItemStyle: { display: 'none' },
        },
      },
      b: { options: { title: 'Inicio' } },
    });

    expect(screen.queryByText('Asistencia')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('renderiza la pestaña cuando no está marcada como oculta', () => {
    renderTabBar({
      a: { options: { title: 'Asistencia' } },
      b: { options: { title: 'Inicio' } },
    });

    expect(screen.getByText('Asistencia')).toBeDefined();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
