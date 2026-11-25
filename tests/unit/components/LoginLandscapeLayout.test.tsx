import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LoginLandscapeLayout from '@/components/auth/LoginLandscapeLayout';

vi.mock('expo-image', () => ({
  Image: ({ accessibilityLabel }: { accessibilityLabel: string }) => (
    <img alt={accessibilityLabel} />
  ),
}));

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-native', async () => {
  const ReactNativeTest = await import('react');
  const flattenStyle = (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style)) {
      return style.reduce<Record<string, unknown>>(
        (flattened, item) => ({ ...flattened, ...flattenStyle(item) }),
        {},
      );
    }
    return typeof style === 'object' && style !== null
      ? style as Record<string, unknown>
      : {};
  };

  return {
    View: ({ children, style, ...props }: any) =>
      ReactNativeTest.createElement('div', { ...props, style: flattenStyle(style) }, children),
    StyleSheet: {
      absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      create: (styles: unknown) => styles,
    },
  };
});

afterEach(() => {
  cleanup();
});

describe('LoginLandscapeLayout', () => {
  it('mantiene la marca junto al contenido del acceso', () => {
    const { container } = render(
      <LoginLandscapeLayout
        backgroundColor="#FFFFFF"
        backgroundImageSource={1}
        logoImageSource={2}
        insets={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <button>Ingresar</button>
      </LoginLandscapeLayout>,
    );

    const layout = container.firstElementChild as HTMLElement;
    const brandPanel = layout.firstElementChild as HTMLElement;

    expect(layout.style.flexDirection).toBe('row');
    expect(brandPanel.style.width).toBe('45%');
    expect(screen.getByRole('img', { name: 'Logo de Las Muñecas de Ramón' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDefined();
  });
});