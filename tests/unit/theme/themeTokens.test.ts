import { describe, expect, it } from 'vitest';

import { Colors, DEFAULT_PROFILE_ACCENT, ThemeTokens } from '@/constants/theme';
import { THEME_OPTIONS, normalizeAccentColor } from '@/store/themeStore';
import { contrastRatio } from '@/utils/color';
import { resolveThemePalette } from '@/utils/themePalette';

describe('tokens de tema compartidos', () => {
  it('mantiene los valores neutrales propuestos en ambos modos', () => {
    expect(ThemeTokens.light).toMatchObject({
      background: '#F7F7FA',
      surface: '#FFFFFF',
      surfaceElevated: '#F1F1F4',
      textPrimary: '#18181B',
      textSecondary: '#6B6B74',
      textMuted: '#6B6B74',
      textDisabled: '#A1A1AA',
      border: '#E4E4E7',
      borderStrong: '#D4D4D8',
      overlayScrim: 'rgba(0,0,0,0.40)',
    });
    expect(ThemeTokens.dark).toMatchObject({
      background: '#0B0B0F',
      surface: '#17171D',
      surfaceElevated: '#202027',
      textPrimary: '#F5F5F7',
      textSecondary: '#A1A1AA',
      textMuted: '#A1A1AA',
      textDisabled: '#666670',
      border: '#2D2D35',
      borderStrong: '#45454F',
      overlayScrim: 'rgba(0,0,0,0.70)',
    });
    expect(Colors.light.text).toBe('#18181B');
    expect(Colors.dark.textSecondary).toBe('#A1A1AA');
  });

  it('resuelve la paleta roja con sus roles de marca exactos', () => {
    const light = resolveThemePalette('#FF1B3D', false);
    const dark = resolveThemePalette('#FF1B3D', true);

    expect(light).toMatchObject({
      primaryColor: '#D50032',
      secondaryColor: '#A60028',
      accentColor: '#FF4D6D',
      glowColor: 'rgba(213,0,50,0.15)',
      backgroundColor: '#F7ECF1',
      surfaceColor: '#FFF8F9',
      surfaceElevatedColor: '#F2E2E7',
      borderColor: '#E7D0D6',
      borderStrongColor: '#D9BEC5',
    });
    expect(dark).toMatchObject({
      primaryColor: '#FF1744',
      secondaryColor: '#B31237',
      accentColor: '#FF4D6D',
      glowColor: 'rgba(255,23,68,0.35)',
      backgroundColor: '#1C0C12',
      surfaceColor: '#25171F',
      surfaceElevatedColor: '#302029',
      borderColor: '#462B36',
      borderStrongColor: '#5F3F4C',
    });
  });

  it('mantiene el contraste de textos normales sobre las superficies de cada modo', () => {
    [ThemeTokens.light, ThemeTokens.dark].forEach((theme) => {
      [theme.background, theme.surface, theme.surfaceElevated].forEach((surface) => {
        [theme.textPrimary, theme.textSecondary, theme.textMuted].forEach((text) => {
          expect(contrastRatio(surface, text)).toBeGreaterThanOrEqual(4.5);
        });
      });
    });
  });

  it('deriva roles de marca para cada acento sobre sus propias superficies', () => {
    THEME_OPTIONS.forEach(({ color }) => {
      [false, true].forEach((isDark) => {
        const palette = resolveThemePalette(color, isDark);
        const renderedSurface = palette.surfaceElevatedColor;

        expect(palette.primaryColor).toMatch(/^#[\da-f]{6}$/i);
        expect(palette.secondaryColor).toMatch(/^#[\da-f]{6}$/i);
        expect(palette.accentColor).toMatch(/^#[\da-f]{6}$/i);
        expect(palette.glowColor).toMatch(/^rgba\(/);
        expect(contrastRatio(palette.primaryColor, palette.primaryText)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.secondaryColor, palette.secondaryText)).toBeGreaterThanOrEqual(4.5);
        expect(palette.semanticColors).toEqual((isDark ? ThemeTokens.dark : ThemeTokens.light).semantic);
        expect(contrastRatio(renderedSurface, palette.primaryOnSurface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(renderedSurface, palette.secondaryUi)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(renderedSurface, palette.secondaryOnSurface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.accentColor, palette.accentText)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(renderedSurface, palette.accentOnSurface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(renderedSurface, palette.accentUi)).toBeGreaterThanOrEqual(3);
      });
    });
  });

  it('da a cada acento su propio fondo', () => {
    const tinted = [
      '#FF1B3D', '#C13BFF', '#0095FF', '#6C4DFF', '#00FFA6', '#FF8A00',
      '#FF2E9A', '#00F5FF', '#FFC400', '#DCE9F7', '#171717',
    ];

    [false, true].forEach((isDark) => {
      const base = isDark ? ThemeTokens.dark : ThemeTokens.light;
      tinted.forEach((color) => {
        const palette = resolveThemePalette(color, isDark);
        expect(palette.backgroundColor, color).not.toBe(base.background);
      });
    });
  });

  it('tiñe superficie y borde en todos los acentos con matiz', () => {
    const tinted = [
      '#FF1B3D', '#C13BFF', '#0095FF', '#6C4DFF', '#00FFA6', '#FF8A00',
      '#FF2E9A', '#00F5FF', '#FFC400', '#DCE9F7',
    ];

    [false, true].forEach((isDark) => {
      const base = isDark ? ThemeTokens.dark : ThemeTokens.light;
      tinted.forEach((color) => {
        const palette = resolveThemePalette(color, isDark);
        expect(palette.surfaceColor, color).not.toBe(base.surface);
        expect(palette.borderColor, color).not.toBe(base.border);
      });
    });
  });

  it('no repite paletas y migra los acentos fusionados', () => {
    expect(THEME_OPTIONS).toHaveLength(11);
    expect(normalizeAccentColor('#FFE600')).toBe('#FFC400');
    expect(normalizeAccentColor('#6E8CB8')).toBe('#DCE9F7');
  });

  it('da al acento por defecto su propia paleta teñida', () => {
    const light = resolveThemePalette(DEFAULT_PROFILE_ACCENT, false);
    const dark = resolveThemePalette(DEFAULT_PROFILE_ACCENT, true);

    expect(light.backgroundColor).toBe('#F7ECF1');
    expect(dark.backgroundColor).toBe('#1C0C12');
    expect(light.backgroundColor).not.toBe(ThemeTokens.light.background);
    expect(dark.backgroundColor).not.toBe(ThemeTokens.dark.background);
  });

  it('conserva los roles monocromos del acento Negro', () => {
    expect(resolveThemePalette('#171717', false)).toMatchObject({
      primaryColor: '#18181B',
      secondaryColor: '#52525B',
      accentColor: '#18181B',
      backgroundColor: '#ECECEF',
      isBlackAccent: true,
    });
    expect(resolveThemePalette('#171717', true)).toMatchObject({
      primaryColor: '#F5F5F7',
      secondaryColor: '#A1A1AA',
      accentColor: '#F5F5F7',
      backgroundColor: '#0C0C10',
      isBlackAccent: true,
    });
  });

  it('mantiene el contraste de textos sobre las superficies de cada paleta', () => {
    THEME_OPTIONS.forEach(({ color }) => {
      [false, true].forEach((isDark) => {
        const palette = resolveThemePalette(color, isDark);
        [
          palette.backgroundColor,
          palette.surfaceColor,
          palette.surfaceElevatedColor,
        ].forEach((surface) => {
          [palette.textPrimary, palette.textSecondary].forEach((text) => {
            expect(
              contrastRatio(surface, text),
              `${color} ${isDark ? 'oscuro' : 'claro'}`,
            ).toBeGreaterThanOrEqual(4.5);
          });
        });
      });
    });
  });
});
