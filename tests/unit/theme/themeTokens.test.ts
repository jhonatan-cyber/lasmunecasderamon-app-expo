import { describe, expect, it } from 'vitest';

import { Colors, ThemeTokens } from '@/constants/theme';
import { THEME_OPTIONS } from '@/store/themeStore';
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

  it('resuelve la paleta roja propuesta en ambos modos', () => {
    const light = resolveThemePalette('#FF1B3D', false);
    const dark = resolveThemePalette('#FF1B3D', true);

    expect(light).toMatchObject({
      primaryColor: '#D50032',
      secondaryColor: '#A60028',
      accentColor: '#FF4D6D',
      glowColor: 'rgba(213,0,50,0.15)',
      backgroundColor: '#F7F7FA',
      surfaceColor: '#FFFFFF',
      surfaceElevatedColor: '#F1F1F4',
      borderColor: '#E4E4E7',
      borderStrongColor: '#D4D4D8',
    });
    expect(dark).toMatchObject({
      primaryColor: '#FF1744',
      secondaryColor: '#B31237',
      accentColor: '#FF4D6D',
      glowColor: 'rgba(255,23,68,0.35)',
      backgroundColor: '#0B0B0F',
      surfaceColor: '#17171D',
      surfaceElevatedColor: '#202027',
      borderColor: '#2D2D35',
      borderStrongColor: '#45454F',
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

  it('deriva roles de marca para cada acento sin cambiar los neutrales', () => {
    THEME_OPTIONS.forEach(({ color }) => {
      [false, true].forEach((isDark) => {
        const base = isDark ? ThemeTokens.dark : ThemeTokens.light;
        const palette = resolveThemePalette(color, isDark);
        const renderedSurface = base.surfaceElevated;

        expect(palette.primaryColor).toMatch(/^#[\da-f]{6}$/i);
        expect(palette.secondaryColor).toMatch(/^#[\da-f]{6}$/i);
        expect(palette.accentColor).toMatch(/^#[\da-f]{6}$/i);
        expect(palette.glowColor).toMatch(/^rgba\(/);
        expect(contrastRatio(palette.primaryColor, palette.primaryText)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.secondaryColor, palette.secondaryText)).toBeGreaterThanOrEqual(4.5);
        expect(palette.backgroundColor).toBe(base.background);
        expect(palette.surfaceColor).toBe(base.surface);
        expect(palette.surfaceElevatedColor).toBe(base.surfaceElevated);
        expect(palette.textPrimary).toBe(base.textPrimary);
        expect(palette.textSecondary).toBe(base.textSecondary);
        expect(palette.textDisabled).toBe(base.textDisabled);
        expect(palette.borderColor).toBe(base.border);
        expect(palette.borderStrongColor).toBe(base.borderStrong);
        expect(palette.overlayScrim).toBe(base.overlayScrim);
        expect(palette.semanticColors).toEqual(base.semantic);
        expect(contrastRatio(renderedSurface, palette.primaryOnSurface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(renderedSurface, palette.secondaryUi)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(renderedSurface, palette.secondaryOnSurface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(palette.accentColor, palette.accentText)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(renderedSurface, palette.accentOnSurface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(renderedSurface, palette.accentUi)).toBeGreaterThanOrEqual(3);
      });
    });
  });
});