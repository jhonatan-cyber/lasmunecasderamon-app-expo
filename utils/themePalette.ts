import { DEFAULT_PROFILE_ACCENT, ThemeTokens } from '@/constants/colorTokens';
import { ensureContrast, resolveAccentSurface } from '@/utils/color';

const BLACK_ACCENT = '#171717';

interface BrandRoles {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

function hexToHsl(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const channels = [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }

  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return [hue, saturation, lightness];
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  const match = lightness - chroma / 2;
  const rgb = section < 1 ? [chroma, secondary, 0]
    : section < 2 ? [secondary, chroma, 0]
      : section < 3 ? [0, chroma, secondary]
        : section < 4 ? [0, secondary, chroma]
          : section < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];

  return `#${rgb.map((value) => Math.round((value + match) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function toneFromAccent(accent: string, lightness: number): string {
  const [hue, saturation] = hexToHsl(accent);
  return hslToHex(hue, saturation, lightness);
}

function rgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha.toFixed(2)})`;
}

function resolveBrandRoles(storedAccent: string, isDark: boolean): BrandRoles {
  const themeTokens = isDark ? ThemeTokens.dark : ThemeTokens.light;
  if (storedAccent.toLowerCase() === DEFAULT_PROFILE_ACCENT.toLowerCase()) {
    return {
      primary: themeTokens.primary,
      secondary: themeTokens.secondary,
      accent: themeTokens.accent,
      glow: themeTokens.glowColor,
    };
  }

  if (storedAccent.toLowerCase() === BLACK_ACCENT) {
    const primary = isDark ? '#F5F5F7' : '#18181B';
    return {
      primary,
      secondary: isDark ? '#A1A1AA' : '#52525B',
      accent: primary,
      glow: rgba(primary, isDark ? 0.35 : 0.15),
    };
  }

  const primary = toneFromAccent(storedAccent, isDark ? 0.545 : 0.42);
  return {
    primary,
    secondary: toneFromAccent(storedAccent, isDark ? 0.39 : 0.325),
    accent: toneFromAccent(storedAccent, 0.65),
    glow: rgba(primary, isDark ? 0.35 : 0.15),
  };
}

/** Resuelve roles de marca por acento y mantiene neutrales comunes por modo. */
export function resolveThemePalette(storedAccent: string, isDark: boolean) {
  const themeTokens = isDark ? ThemeTokens.dark : ThemeTokens.light;
  const isBlackAccent = storedAccent.toLowerCase() === BLACK_ACCENT;
  const roles = resolveBrandRoles(storedAccent, isDark);
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