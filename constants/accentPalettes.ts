import { BLACK_ACCENT } from '@/constants/accents';
import { DEFAULT_PROFILE_ACCENT, ThemeTokens } from '@/constants/colorTokens';
import { contrastRatio, ensureContrast, relativeLuminance } from '@/utils/color';

type Mode = 'light' | 'dark';

/** Conjunto de tokens de un modo; misma forma que `ThemeTokens.light/dark`. */
export interface ThemeTokenSet {
  primary: string;
  secondary: string;
  accent: string;
  glowColor: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  borderSubtle: string;
  overlayScrim: string;
  overlaySubtle: string;
  interaction: {
    pressedOpacity: number;
    disabledOpacity: number;
    focusColor: string;
  };
  semantic: {
    error: string;
    errorSurface: string;
    success: string;
    successSurface: string;
    warning: string;
    warningSurface: string;
    info: string;
    infoSurface: string;
  };
}

/**
 * Proporción de acento que se mezcla en cada neutral. Es deliberadamente baja
 * (3–14 %): la paleta debe leerse neutra con una temperatura propia, no como
 * un fondo de color. Un fondo saturado le quita significado a los semánticos
 * (error, éxito) y compite con la marca.
 */
const TINT: Record<Mode, {
  background: number;
  surface: number;
  surfaceElevated: number;
  border: number;
  borderSubtle: number;
  borderStrong: number;
}> = {
  light: {
    background: 0.05,
    surface: 0.03,
    surfaceElevated: 0.07,
    border: 0.10,
    borderSubtle: 0.06,
    borderStrong: 0.12,
  },
  dark: {
    background: 0.07,
    surface: 0.06,
    surfaceElevated: 0.07,
    border: 0.12,
    borderSubtle: 0.08,
    borderStrong: 0.14,
  },
};

interface AccentPaletteConfig {
  /** Multiplicador del tinte neutro. `0` deja los neutrales base intactos. */
  tint: number;
  /** Multiplicador de saturación de los roles de marca. */
  saturation: number;
}

const DEFAULT_PALETTE_CONFIG: AccentPaletteConfig = { tint: 1, saturation: 1 };

/**
 * Ajustes por acento. Solo para los casos donde la generación automática no
 * da un resultado aceptable.
 */
const PALETTE_CONFIG: Record<string, Partial<AccentPaletteConfig>> = {
  // Casi acromáticos: un tinte alto los vuelve grises sucios.
  // Plata es un gris frío, no un azul: se le baja la saturación de marca.
  '#DCE9F7': { tint: 0.6, saturation: 0.2 },
  // Amarillos y verdes/cianes muy luminosos: se baja la saturación para que la
  // versión corregida por contraste no quede oliva ni pastosa.
  '#FFC400': { saturation: 0.85 },
  '#00FFA6': { saturation: 0.9 },
  '#00F5FF': { saturation: 0.9 },
};

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '').trim();
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(channels: number[]): string {
  return `#${channels
    .map((value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

/** Mezcla lineal en sRGB: `amount` 0 devuelve `from`, 1 devuelve `to`. */
function mixHex(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  return toHex(a.map((value, index) => value + (b[index] - value) * amount));
}

function rgba(hex: string, alpha: number): string {
  const [red, green, blue] = parseHex(hex);
  return `rgba(${red},${green},${blue},${alpha.toFixed(2)})`;
}

function hexToHsl(hex: string): [number, number, number] {
  const [red, green, blue] = parseHex(hex).map((value) => value / 255);
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

  return toHex(rgb.map((value) => (value + match) * 255));
}

interface BrandTones {
  primary: string;
  secondary: string;
  accent: string;
}

function normalizeHex(color: string): string {
  return color.toUpperCase();
}

/**
 * Ajusta la luminosidad HSL hasta cumplir el contraste pedido **sin perder la
 * saturación**. `ensureContrast` mezcla hacia blanco/negro y apaga los tonos
 * (un violeta oscuro terminaba lavado a lavanda); aquí se mueve solo la L.
 */
function ensureToneContrast(color: string, background: string, targetRatio: number): string {
  if (contrastRatio(background, color) >= targetRatio) return color;

  const [hue, saturation, lightness] = hexToHsl(color);
  const direction = relativeLuminance(background) < 0.5 ? 1 : -1;

  for (let step = 0.01; step <= 1; step += 0.01) {
    const next = Math.min(1, Math.max(0, lightness + direction * step));
    const candidate = hslToHex(hue, saturation, next);
    if (contrastRatio(background, candidate) >= targetRatio) return candidate;
    if (next === 0 || next === 1) break;
  }

  return ensureContrast(color, background, targetRatio);
}

/**
 * Tonos de marca derivados del acento. La luminancia se mantiene en los
 * valores acordados (42 % / 54.5 % primario, 32.5 % / 39 % secundario, 65 %
 * acento) y la saturación se escala según el acento.
 */
function brandTones(accent: string, mode: Mode, saturationScale: number): BrandTones {
  const [hue, saturation] = hexToHsl(accent);
  const s = Math.max(0, Math.min(1, saturation * saturationScale));
  return {
    primary: hslToHex(hue, s, mode === 'dark' ? 0.545 : 0.42),
    secondary: hslToHex(hue, s, mode === 'dark' ? 0.39 : 0.325),
    accent: hslToHex(hue, s, 0.65),
  };
}

/**
 * El acento por defecto conserva los roles de marca acordados exactamente
 * (`ThemeTokens`), aunque sus neutrales ahora sí se tiñen con su matiz.
 */
function defaultBrand(mode: Mode): BrandTones {
  const tokens = ThemeTokens[mode];
  return {
    primary: tokens.primary,
    secondary: tokens.secondary,
    accent: tokens.accent,
  };
}

/** El acento Negro no tiene matiz: los roles de marca van en escala de grises. */
function monochromeBrand(mode: Mode): BrandTones {
  const primary = mode === 'dark' ? '#F5F5F7' : '#18181B';
  return {
    primary,
    secondary: mode === 'dark' ? '#A1A1AA' : '#52525B',
    accent: primary,
  };
}

/**
 * Construye la paleta completa de un acento: neutrales teñidos con su matiz y
 * roles de marca corregidos para cumplir contraste **contra esas superficies**
 * (no contra las compartidas).
 */
export function buildAccentPalette(accent: string, isDark: boolean): ThemeTokenSet {
  const mode: Mode = isDark ? 'dark' : 'light';
  const base = ThemeTokens[mode];
  const normalized = accent.trim();
  const isDefault = normalized.toLowerCase() === DEFAULT_PROFILE_ACCENT.toLowerCase();
  const config = { ...DEFAULT_PALETTE_CONFIG, ...(PALETTE_CONFIG[normalized.toUpperCase()] ?? {}) };
  const tint = (from: string, ratio: number) => mixHex(from, normalized, ratio * config.tint);

  const background = tint(base.background, TINT[mode].background);
  const surface = tint(base.surface, TINT[mode].surface);
  const surfaceElevated = tint(base.surfaceElevated, TINT[mode].surfaceElevated);
  const border = tint(base.border, TINT[mode].border);
  const borderSubtle = tint(base.borderSubtle, TINT[mode].borderSubtle);
  const borderStrong = tint(base.borderStrong, TINT[mode].borderStrong);

  const isBlack = normalized.toLowerCase() === BLACK_ACCENT;
  const brand = isBlack
    ? monochromeBrand(mode)
    : isDefault
      ? defaultBrand(mode)
      : brandTones(normalized, mode, config.saturation);

  // Un primario luminoso (Ámbar, Cian, Esmeralda) no llega a 4.5:1 sobre un
  // fondo claro: se corrige contra el fondo de *esta* paleta.
  // El acento por defecto conserva sus roles de marca exactos: ya están
  // acordados y `secondaryOnSurface` cubre los usos como texto.
  const primary = normalizeHex(isDefault ? brand.primary : ensureToneContrast(brand.primary, background, 4.5));
  const secondary = normalizeHex(isDefault ? brand.secondary : ensureToneContrast(brand.secondary, surfaceElevated, 4.5));

  const textSecondary = normalizeHex(ensureContrast(
    ensureContrast(base.textSecondary, surface, 4.5),
    surfaceElevated,
    4.5,
  ));

  return {
    primary,
    secondary,
    accent: brand.accent,
    glowColor: rgba(primary, mode === 'dark' ? 0.35 : 0.15),
    background,
    surface,
    surfaceElevated,
    surfaceMuted: surfaceElevated,
    textPrimary: normalizeHex(ensureContrast(base.textPrimary, background, 4.5)),
    textSecondary,
    textDisabled: base.textDisabled,
    textMuted: textSecondary,
    border,
    borderStrong,
    borderSubtle,
    overlayScrim: base.overlayScrim,
    overlaySubtle: base.overlaySubtle,
    interaction: {
      pressedOpacity: base.interaction.pressedOpacity,
      disabledOpacity: base.interaction.disabledOpacity,
      focusColor: primary,
    },
    // Los semánticos son globales: un error verde en la paleta Esmeralda
    // rompería el significado del estado.
    semantic: base.semantic,
  };
}

const paletteCache = new Map<string, ThemeTokenSet>();

/** Versión memoizada: cada paleta × 2 modos se construye una sola vez. */
export function resolveAccentTokens(accent: string, isDark: boolean): ThemeTokenSet {
  const key = `${isDark ? 'dark' : 'light'}:${accent.trim().toLowerCase()}`;
  const cached = paletteCache.get(key);
  if (cached) return cached;

  const palette = buildAccentPalette(accent, isDark);
  paletteCache.set(key, palette);
  return palette;
}
