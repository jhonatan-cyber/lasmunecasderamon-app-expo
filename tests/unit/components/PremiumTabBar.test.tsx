import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PremiumTabBar } from '@/components/ui/PremiumTabBar';

vi.mock('react-native', () => ({
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
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

type NavigateTabFn = (routeKey: string) => void;

const renderTabBar = (
  descriptors: Record<string, { options: Record<string, unknown> }>,
  navigateToTab: NavigateTabFn = vi.fn(),
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
      emitter={{ emit: () => ({ defaultPrevented: false }) }}
      navigateToTab={navigateToTab}
      descriptors={descriptors}
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

describe('PremiumTabBar — navegación', () => {
  it('navega al tab de Inicio usando la clave de ruta del navegador', () => {
    const navigateToTab = vi.fn<NavigateTabFn>();
    renderTabBar(
      {
        a: { options: { title: 'Asistencia' } },
        b: { options: { title: 'Inicio' } },
      },
      navigateToTab,
    );

    screen.getAllByRole('button')[1].click();

    expect(navigateToTab).toHaveBeenCalledWith('b');
  });

  it('no navega si la pestaña ya está enfocada', () => {
    const navigateToTab = vi.fn<NavigateTabFn>();
    render(
      <PremiumTabBar
        state={{
          index: 1,
          routes: [
            { key: 'a', name: 'asistencia' },
            { key: 'b', name: 'index' },
          ],
        }}
        emitter={{ emit: () => ({ defaultPrevented: false }) }}
        navigateToTab={navigateToTab}
        descriptors={{
          a: { options: { title: 'Asistencia' } },
          b: { options: { title: 'Inicio' } },
        }}
      />,
    );

    screen.getAllByRole('button')[1].click();

    expect(navigateToTab).not.toHaveBeenCalled();
  });
});
