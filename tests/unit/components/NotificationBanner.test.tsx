import React, { type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBanner } from '@/components/ui/NotificationBanner';

const h = vi.hoisted(() => ({
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  notification: null as
    | { id: string; type: string; text1: string; text2?: string; visibilityTime: number }
    | null,
  modalOpen: false,
}));

type RenderProps = {
  children?: ReactNode;
  style?: unknown;
  onPress?: () => void;
  testID?: string;
};

const flatten = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, item) => ({ ...acc, ...flatten(item) }), {});
  }
  return (style ?? {}) as Record<string, unknown>;
};

vi.mock('react-native', () => {
  const noopAnimation = { start: (cb?: (r: { finished: boolean }) => void) => cb?.({ finished: true }) };
  return {
    Animated: {
      Value: class {
        setValue = vi.fn();
      },
      View: ({ children }: RenderProps) => <div>{children}</div>,
      parallel: () => noopAnimation,
      timing: () => noopAnimation,
      spring: () => noopAnimation,
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: () => Promise.resolve(false),
      addEventListener: () => ({ remove: () => {} }),
    },
    Dimensions: { get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }) },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    Pressable: ({ children, onPress }: RenderProps) => <button onClick={onPress}>{children}</button>,
    Text: ({ children }: RenderProps) => <span>{children}</span>,
    View: ({ children, style, testID }: RenderProps) => (
      <div data-testid={testID} data-padding-top={String(flatten(style).paddingTop ?? '')}>
        {children}
      </div>
    ),
    StyleSheet: { create: (styles: unknown) => styles },
  };
});
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => h.insets,
}));
vi.mock('@/hooks/useAccentColor', () => ({ useAccentColor: () => ({ isDark: false }) }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/utils/modalLayer', () => ({ useModalLayerOpen: () => h.modalOpen }));
vi.mock('@/utils/inAppNotifications', () => ({
  subscribeNotifications: () => () => {},
  getCurrentNotification: () => h.notification,
  hideToast: vi.fn(),
}));

const NUEVA_NOTIFICACION = {
  id: 'n1',
  type: 'info',
  text1: 'Pedido listo',
  text2: 'Mesa 4',
  visibilityTime: 4000,
};

beforeEach(() => {
  h.insets = { top: 0, bottom: 0, left: 0, right: 0 };
  h.notification = NUEVA_NOTIFICACION;
  h.modalOpen = false;
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('NotificationBanner: posición y capa de modales', () => {
  it('deja el banner bajo el área segura del dispositivo', () => {
    h.insets = { top: 47, bottom: 0, left: 0, right: 0 };

    render(<NotificationBanner />);

    expect(screen.getByTestId('toast-overlay').getAttribute('data-padding-top')).toBe('55');
  });

  it('oculta el banner del árbol raíz mientras hay un modal abierto', () => {
    h.modalOpen = true;

    const { container } = render(<NotificationBanner />);

    expect(container.firstChild).toBeNull();
  });

  it('sigue mostrando el banner de la raíz cuando no hay modales abiertos', () => {
    render(<NotificationBanner />);

    expect(screen.getByTestId('toast-overlay')).toBeTruthy();
  });
});
