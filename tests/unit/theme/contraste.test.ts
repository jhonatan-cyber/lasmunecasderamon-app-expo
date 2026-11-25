import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ACCENT_COLOR, THEME_OPTIONS, normalizeAccentColor } from '@/store/themeStore';
import { MetricBanner } from '@/components/ui/MetricCards';
import { HistorySummaryCards } from '@/components/cajero/clientes/HistorySummaryCards';
import { HistoryItemCard } from '@/components/cajero/clientes/HistoryItemCard';
import {
  blendOver,
  contrastRatio,
  ensureContrast,
  resolveAccentSurface,
} from '@/utils/color';

const componentTheme = vi.hoisted(() => ({ current: {} as Record<string, any> }));

vi.mock('react-native', async () => {
  const React = await import('react');
  const element = (tag: string) => ({
    children,
    style,
    numberOfLines: _numberOfLines,
    accessibilityLabel: _accessibilityLabel,
    accessibilityRole: _accessibilityRole,
    accessibilityState: _accessibilityState,
    accessibilityHint: _accessibilityHint,
    accessibilityViewIsModal: _accessibilityViewIsModal,
    collapsable: _collapsable,
    ...props
  }: any) =>
    React.createElement(tag, {
      ...props,
      'data-style': style == null ? undefined : JSON.stringify(style),
    }, children);

  return {
    AccessibilityInfo: {
      isReduceMotionEnabled: () => Promise.resolve(false),
      addEventListener: () => ({ remove: () => {} }),
    },
    Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
    Pressable: element('button'),
    StyleSheet: { create: (styles: unknown) => styles },
    Text: element('span'),
    View: element('div'),
    useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  };
});

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/components/ui/AnimatedView', async () => {
  const React = await import('react');
  return { AnimatedView: ({ children }: any) => React.createElement('div', null, children) };
});
vi.mock('@/components/ui/StatusBadge', async () => {
  const React = await import('react');
  return {
    StatusBadge: ({ label }: any) => React.createElement('span', null, label),
    paymentIconFor: () => 'cash',
  };
});
vi.mock('@/hooks/useAccentColor', () => ({ useAccentColor: () => componentTheme.current }));
vi.mock('@/hooks/useRenderCount', () => ({ useRenderCount: () => {} }));
vi.mock('@/hooks/useResponsiveMetrics', () => ({ useResponsiveMetrics: () => ({ isTablet: false }) }));

const MIN_TEXT = 4.5;
const MIN_UI = 3;
const LIGHT_SURFACE = '#F3F4F6';
const DARK_SURFACE = '#1F2937';
const DARK_CARD_SURFACE = '#111111';
const BLACK_ACCENT = '#171717';

/** El hook convierte el negro en blanco cuando el modo es oscuro. */
function acentoResuelto(color: string, isDark: boolean): string {
  return color.toLowerCase() === BLACK_ACCENT && isDark ? '#FFFFFF' : color;
}

function flattenedStyle(element: Element | null): Record<string, string> {
  const styles = JSON.parse(element?.getAttribute('data-style') ?? 'null');
  const flatten = (style: unknown): Record<string, string> => {
    if (Array.isArray(style)) {
      return style.reduce<Record<string, string>>((result, item) => ({ ...result, ...flatten(item) }), {});
    }
    return style && typeof style === 'object' ? style as Record<string, string> : {};
  };
  return flatten(styles);
}

function renderedBackground(element: Element | null, surface: string): string {
  let current = element;
  while (current) {
    const background = flattenedStyle(current).backgroundColor;
    if (background && background !== 'transparent') {
      return background.length === 9
        ? blendOver(background.slice(0, 7), surface, parseInt(background.slice(7), 16) / 255)
        : background;
    }
    current = current.parentElement;
  }
  return surface;
}

function themeForComponent(theme: (typeof THEME_OPTIONS)[number], isDark: boolean) {
  const accentColor = acentoResuelto(theme.color, isDark);
  const surface = isDark ? DARK_SURFACE : LIGHT_SURFACE;
  const accentOnSurface = theme.color.toLowerCase() === BLACK_ACCENT
    ? isDark ? '#FFFFFF' : '#111827'
    : ensureContrast(accentColor, surface, MIN_TEXT);
  const cardBg = theme.color.toLowerCase() === BLACK_ACCENT
    ? isDark ? '#000000' : '#FFFFFF'
    : isDark ? DARK_CARD_SURFACE : '#FFFFFF';

  return {
    accentColor,
    accentOnSurface,
    accentUi: ensureContrast(accentColor, surface, MIN_UI),
    accentBg: `${accentColor}15`,
    borderColor: isDark ? `${accentColor}40` : 'rgba(0,0,0,0.12)',
    cardBg,
    surfaceMuted: isDark ? '#1F2937' : LIGHT_SURFACE,
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#9CA3AF' : '#4B5563',
    isDark,
  };
}

afterEach(() => cleanup());

describe('Matriz de contraste de los acentos neón (WCAG AA)', () => {
  THEME_OPTIONS.forEach((theme) => {
    describe(theme.name, () => {
      it('el acento es un color plano, sin degradado', () => {
        expect(theme.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect((theme as { gradient?: unknown }).gradient).toBeUndefined();
      });

      it('el texto sobre el acento llega a 4.5:1 en claro y oscuro', () => {
        [false, true].forEach((isDark) => {
          const accent = acentoResuelto(theme.color, isDark);
          const plan = resolveAccentSurface(accent);
          const expectedText = contrastRatio(accent, '#FFFFFF') >= contrastRatio(accent, '#0A0A14')
            ? '#FFFFFF'
            : '#0A0A14';
          expect(plan.text, `${theme.name} ${isDark ? 'oscuro' : 'claro'}`).toBe(expectedText);
          expect(
            contrastRatio(accent, plan.text),
            `${theme.name} ${isDark ? 'oscuro' : 'claro'}`,
          ).toBeGreaterThanOrEqual(MIN_TEXT);
        });
      });

      it('el subtítulo atenuado sobre el acento llega a 4.5:1', () => {
        [false, true].forEach((isDark) => {
          const accent = acentoResuelto(theme.color, isDark);
          const plan = resolveAccentSurface(accent);
          const rendered = blendOver(plan.text, accent, plan.mutedAlpha);
          expect(
            contrastRatio(accent, rendered),
            `${theme.name} ${isDark ? 'oscuro' : 'claro'}`,
          ).toBeGreaterThanOrEqual(MIN_TEXT);
        });
      });

      it('el acento como texto sobre la superficie llega a 4.5:1', () => {
        expect(
          contrastRatio(
            LIGHT_SURFACE,
            ensureContrast(acentoResuelto(theme.color, false), LIGHT_SURFACE, MIN_TEXT),
          ),
          `${theme.name} claro`,
        ).toBeGreaterThanOrEqual(MIN_TEXT);
        expect(
          contrastRatio(
            DARK_SURFACE,
            ensureContrast(acentoResuelto(theme.color, true), DARK_SURFACE, MIN_TEXT),
          ),
          `${theme.name} oscuro`,
        ).toBeGreaterThanOrEqual(MIN_TEXT);
      });

      it('el acento como icono o borde llega a 3:1', () => {
        expect(
          contrastRatio(
            LIGHT_SURFACE,
            ensureContrast(acentoResuelto(theme.color, false), LIGHT_SURFACE, MIN_UI),
          ),
          `${theme.name} claro`,
        ).toBeGreaterThanOrEqual(MIN_UI);
        expect(
          contrastRatio(
            DARK_SURFACE,
            ensureContrast(acentoResuelto(theme.color, true), DARK_SURFACE, MIN_UI),
          ),
          `${theme.name} oscuro`,
        ).toBeGreaterThanOrEqual(MIN_UI);
      });
    });
  });
});

describe('El negro como acento', () => {
  it('en modo oscuro se convierte en blanco y el texto pasa a oscuro', () => {
    const accent = acentoResuelto(BLACK_ACCENT, true);
    const plan = resolveAccentSurface(accent);
    expect(accent).toBe('#FFFFFF');
    expect(contrastRatio(accent, plan.text)).toBeGreaterThanOrEqual(MIN_TEXT);
  });

  it('en modo claro se mantiene negro con texto blanco', () => {
    const accent = acentoResuelto(BLACK_ACCENT, false);
    const plan = resolveAccentSurface(accent);
    expect(accent).toBe('#171717');
    expect(plan.text).toBe('#FFFFFF');
    expect(contrastRatio(accent, plan.text)).toBeGreaterThanOrEqual(MIN_TEXT);
  });
});

describe('Paleta neón', () => {
  it('no repite color entre opciones', () => {
    const colors = THEME_OPTIONS.map((theme) => theme.color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('el accent por defecto es la primera opción', () => {
    expect(DEFAULT_ACCENT_COLOR).toBe(THEME_OPTIONS[0].color);
  });

  it('traduce los colores de paletas anteriores a su versión neón', () => {
    expect(normalizeAccentColor('#FF2D55')).toBe('#FF1B3D');
    expect(normalizeAccentColor('#B44AFF')).toBe('#C13BFF');
    expect(normalizeAccentColor('#00F0FF')).toBe('#00F5FF');
    expect(normalizeAccentColor('#1A1A2E')).toBe('#171717');
    expect(normalizeAccentColor('#E11D48')).toBe('#FF1B3D');
  });

  it('deja intactos los colores de la paleta vigente', () => {
    THEME_OPTIONS.forEach((theme) => {
      expect(normalizeAccentColor(theme.color)).toBe(theme.color);
    });
  });

  it('cae en el acento más cercano si el color no existe', () => {
    expect(THEME_OPTIONS.map((t) => t.color)).toContain(normalizeAccentColor('#FF2E55'));
  });
});

describe('Contraste en componentes renderizados', () => {
  THEME_OPTIONS.forEach((theme) => {
    [false, true].forEach((isDark) => {
      it(`${theme.name} mantiene 4.5:1 en MetricBanner (${isDark ? 'oscuro' : 'claro'})`, () => {
        const themeTokens = themeForComponent(theme, isDark);
        componentTheme.current = themeTokens;
        const amount = `Importe ${theme.name} ${isDark ? 'oscuro' : 'claro'}`;

        render(React.createElement(MetricBanner, { label: 'Contraste', amount }));

        const amountElement = screen.getByText(amount);
        const foreground = flattenedStyle(amountElement).color;
        const background = flattenedStyle(amountElement.parentElement).backgroundColor;

        expect(foreground).toBe(themeTokens.accentOnSurface);
        expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(MIN_TEXT);
      });
    });
  });

  [false, true].forEach((isDark) => {
    it(`HistoryItemCard usa accentOnSurface para importes de servicio (${isDark ? 'oscuro' : 'claro'})`, () => {
      const themeTokens = themeForComponent(THEME_OPTIONS[0], isDark);
      componentTheme.current = themeTokens;
      const item = {
        id: 'servicio-1',
        category: 'SERVICIO',
        fecha_crea: '2026-11-24T12:00:00.000Z',
        monto: 1250,
        detalle: {
          habitacion: 'Suite 1',
          tiempo: 60,
          anfitrionas: ['Ana'],
        },
      };

      render(React.createElement(HistoryItemCard, {
        item,
        index: 0,
        isDark,
        textPrimary: themeTokens.textPrimary,
        textSecondary: themeTokens.textSecondary,
      }));

      const amount = screen.getByText(`-$${item.monto.toLocaleString('es-CL')}`);
      const foreground = flattenedStyle(amount).color;
      const background = renderedBackground(amount.parentElement, themeTokens.surfaceMuted);

      expect(foreground).toBe(themeTokens.accentOnSurface);
      expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(MIN_TEXT);

      ['Habitación', 'Ana'].forEach((labelText) => {
        const label = screen.getByText(labelText);
        const labelColor = flattenedStyle(label).color;
        const labelBackground = renderedBackground(label, themeTokens.surfaceMuted);

        expect(labelColor).toBe(themeTokens.accentOnSurface);
        expect(contrastRatio(labelBackground, labelColor)).toBeGreaterThanOrEqual(MIN_TEXT);
      });
    });
  });

  THEME_OPTIONS.forEach((theme) => {
    [false, true].forEach((isDark) => {
      it(`${theme.name} mantiene 4.5:1 en HistorySummaryCards (${isDark ? 'oscuro' : 'claro'})`, () => {
        const themeTokens = themeForComponent(theme, isDark);
        componentTheme.current = themeTokens;

        render(React.createElement(HistorySummaryCards, {
          totalServicios: 1250,
          totalConsumo: 350,
          totalCargas: 900,
        }));

        const label = screen.getByText('Servicios');
        const foreground = flattenedStyle(label).color;
        const background = renderedBackground(label.parentElement, themeTokens.cardBg);

        expect(foreground).toBe(themeTokens.accentOnSurface);
        expect(contrastRatio(background, foreground)).toBeGreaterThanOrEqual(MIN_TEXT);
      });
    });
  });
});
