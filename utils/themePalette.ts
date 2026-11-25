import { BLACK_ACCENT } from '@/constants/accents';
import { resolveAccentTokens } from '@/constants/accentPalettes';
import { ensureContrast, resolveAccentSurface } from '@/utils/color';

/**
 * Resuelve la paleta del acento elegido y sus roles derivados.
 *
 * Los neutrales (fondo, superficies, bordes) salen de la paleta propia del
 * acento (`constants/accentPalettes.ts`); los roles de texto/UI sobre
 * superficies se calculan aquí contra esas superficies, no contra las
 * compartidas.
 */
export function resolveThemePalette(storedAccent: string, isDark: boolean) {
  const themeTokens = resolveAccentTokens(storedAccent, isDark);
  const isBlackAccent = storedAccent.trim().toLowerCase() === BLACK_ACCENT;
  const roles = {
    primary: themeTokens.primary,
    secondary: themeTokens.secondary,
    accent: themeTokens.accent,
    glow: themeTokens.glowColor,
  };
  const primarySurface = resolveAccentSurface(roles.primary);
  const secondarySurface = resolveAccentSurface(roles.secondary);
  const accentSurface = resolveAccentSurface(roles.accent);
  const surfaceBg = themeTokens.surfaceElevated;
  const accentUi = ensureContrast(roles.accent, surfaceBg, 3);
  const accentOnSurface = ensureContrast(roles.accent, surfaceBg, 4.5);
  const primaryUi = ensureContrast(roles.primary, surfaceBg, 3);
  const primaryOnSurface = ensureContrast(roles.primary, surfaceBg, 4.5);
  const secondaryUi = ensureContrast(roles.secondary, surfaceBg, 3);
  const secondaryOnSurface = ensureContrast(roles.secondary, surfaceBg, 4.5);

  return {
    primaryColor: roles.primary,
    secondaryColor: roles.secondary,
    accentColor: roles.accent,
    glowColor: roles.glow,
    primaryText: primarySurface.text,
    primaryTextMuted: primarySurface.muted,
    primaryUi,
    primaryOnSurface,
    isLightPrimary: primarySurface.isLightAccent,
    secondaryText: secondarySurface.text,
    secondaryTextMuted: secondarySurface.muted,
    secondaryUi,
    secondaryOnSurface,
    accentText: accentSurface.text,
    accentTextMuted: accentSurface.muted,
    accentUi,
    accentOnSurface,
    isLightAccent: accentSurface.isLightAccent,
    backgroundColor: themeTokens.background,
    surfaceColor: themeTokens.surface,
    surfaceElevatedColor: themeTokens.surfaceElevated,
    overlayScrim: themeTokens.overlayScrim,
    overlaySubtle: themeTokens.overlaySubtle,
    pressedOpacity: themeTokens.interaction.pressedOpacity,
    disabledOpacity: themeTokens.interaction.disabledOpacity,
    focusColor: accentUi,
    semanticColors: themeTokens.semantic,
    isDark,
    isBlackAccent,
    bg: themeTokens.background,
    cardBg: themeTokens.surface,
    borderColor: themeTokens.border,
    borderStrongColor: themeTokens.borderStrong,
    surfaceMuted: themeTokens.surfaceElevated,
    accentBorder: `${roles.accent}30`,
    accentBg: `${roles.accent}15`,
    textPrimary: themeTokens.textPrimary,
    textSecondary: themeTokens.textSecondary,
    textDisabled: themeTokens.textDisabled,
  };
}
