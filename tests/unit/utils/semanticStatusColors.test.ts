import { describe, expect, it } from 'vitest';

import { ThemeTokens } from '@/constants/theme';
import { contrastRatio } from '@/utils/color';
import { getAdvanceStatusTone, resolveSemanticStatusColors } from '@/utils/semanticStatusColors';

describe('colores de estados semánticos', () => {
  it.each([
    ['pendiente', 'pending'],
    ['pagada', 'success'],
    ['confirmada', 'success'],
    ['liquidada', 'success'],
    ['rechazada', 'error'],
    ['estado-inesperado', 'neutral'],
  ] as const)('clasifica %s como %s', (status, expectedTone) => {
    expect(getAdvanceStatusTone(status)).toBe(expectedTone);
  });

  it.each([false, true])('mantiene contraste AA de los badges en modo %s', (isDark) => {
    const theme = isDark ? ThemeTokens.dark : ThemeTokens.light;
    const surface = theme.surfaceElevated;
    const tones = ['pending', 'success', 'error', 'info'] as const;

    tones.forEach((tone) => {
      const colors = resolveSemanticStatusColors(tone, theme.semantic, surface, theme.textSecondary);
      expect(contrastRatio(colors.backgroundColor, colors.textColor)).toBeGreaterThanOrEqual(4.5);
    });
  });
});