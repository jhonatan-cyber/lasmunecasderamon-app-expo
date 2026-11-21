import { describe, expect, it } from 'vitest';
import { DEFAULT_ACCENT_COLOR, THEME_OPTIONS, normalizeAccentColor } from '@/store/themeStore';
import {
  blendOver,
  contrastRatio,
  ensureContrast,
  resolveAccentSurface,
} from '@/utils/color';

const MIN_TEXT = 4.5;
const MIN_UI = 3;
const LIGHT_SURFACE = '#F3F4F6';
const DARK_SURFACE = '#000000';
const BLACK_ACCENT = '#171717';

/** El hook convierte el negro en blanco cuando el modo es oscuro. */
function acentoResuelto(color: string, isDark: boolean): string {
  return color.toLowerCase() === BLACK_ACCENT && isDark ? '#FFFFFF' : color;
}

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
