import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PILL_HEIGHT, PILL_TEXT_SIZE, Tabs } from '@/components/ui/Tabs';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));

vi.mock('react-native', () => {
  const flatten = (style: unknown): Record<string, unknown> => {
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.map(flatten));
    }
    return (style as Record<string, unknown>) ?? {};
  };

  return {
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
    Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
    StyleSheet: { create: (styles: unknown) => styles },
    View: ({ children }: any) => <div>{children}</div>,
    ScrollView: ({ children }: any) => <div>{children}</div>,
    Text: ({ children, style }: any) => (
      <span data-font-size={flatten(style).fontSize}>{children}</span>
    ),
    Pressable: ({ children, onPress, accessibilityLabel, accessibilityState, style, hitSlop }: any) => {
      const resolved = typeof style === 'function' ? style({ pressed: false }) : style;
      const flat = flatten(resolved);

      return (
        <button
          aria-label={accessibilityLabel}
          aria-pressed={accessibilityState?.selected ? 'true' : 'false'}
          data-hit-slop={hitSlop ? String(hitSlop.top) : ''}
          data-min-height={flat.minHeight}
          onClick={onPress}
        >
          {children}
        </button>
      );
    },
  };
});

afterEach(() => {
  cleanup();
});

const tabs = [
  { key: 'todos' as const, label: 'Todos' },
  { key: 'pendientes' as const, label: 'Pendientes', count: 3 },
];

const renderTabs = (onChange = vi.fn()) =>
  render(
    <Tabs
      tabs={tabs}
      activeKey="todos"
      onChange={onChange}
      accentColor="#E11D48"
      cardBg="#111111"
      textSecondary="#9CA3AF"
      borderColor="#333333"
      variant="pills"
    />,
  );

describe('Tabs — pills de filtro accesibles', () => {
  it('usa un texto de 12px, no de 10', () => {
    renderTabs();

    expect(PILL_TEXT_SIZE).toBe(12);
    expect(screen.getByText('Todos').getAttribute('data-font-size')).toBe('12');
  });

  it('completa el alto visual con hitSlop hasta 44pt efectivos', () => {
    renderTabs();

    const pill = screen.getByRole('button', { name: 'Todos' });

    expect(PILL_HEIGHT).toBe(32);
    expect(pill.getAttribute('data-min-height')).toBe('32');
    expect(pill.getAttribute('data-hit-slop')).toBe('6');
    // 32 + 6 arriba + 6 abajo = 44.
    expect(PILL_HEIGHT + 6 * 2).toBeGreaterThanOrEqual(44);
  });

  it('marca el tab activo y notifica el cambio', () => {
    const onChange = vi.fn();
    renderTabs(onChange);

    expect(
      screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Pendientes (3)' })
        .getAttribute('aria-pressed'),
    ).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Pendientes (3)' }));

    expect(onChange).toHaveBeenCalledWith('pendientes');
  });
});
