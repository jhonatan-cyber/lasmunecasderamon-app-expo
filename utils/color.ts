/** Utilidades de contraste WCAG compartidas por componentes con color dinámico. */

function parseHex(hex: string): [number, number, number] {
    const normalized = hex.replace('#', '');
    const full = normalized.length === 3
        ? normalized.split('').map((c) => c + c).join('')
        : normalized;
    return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
    ];
}

function channel(value: number): number {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
    const [r, g, b] = parseHex(hex);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(background: string, foreground: string): number {
    const l1 = relativeLuminance(background);
    const l2 = relativeLuminance(foreground);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Aplana `foreground` sobre `background` con la opacidad indicada y devuelve un
 * hex opaco. Sirve para medir el contraste real de velos, textos con alfa y
 * fondos translúcidos.
 */
export function blendOver(foreground: string, background: string, alpha: number): string {
    const f = parseHex(foreground);
    const b = parseHex(background);
    const out = f.map((value, index) =>
        Math.round(value * alpha + b[index] * (1 - alpha)),
    );
    return `#${out.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Negro usado como extremo de "texto oscuro". Es más profundo que `#111827`
 * a propósito: sobre los acentos neón (saturados y luminosos) gana margen de
 * contraste, que es justo lo que necesitan para llegar a 4.5:1.
 */
export const DARK_TEXT = '#0A0A14';

/**
 * Devuelve el color de texto (blanco o casi negro) con mejor contraste sobre
 * `background`.
 */
export function readableTextColor(background: string): string {
    return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, DARK_TEXT)
        ? '#FFFFFF'
        : DARK_TEXT;
}

/**
 * Ajusta `color` hacia blanco o negro hasta alcanzar el contraste pedido contra
 * `background`. Conserva el tono (lo mezcla, no lo reemplaza) y devuelve el
 * primer valor que cumple; si ninguno lo logra, devuelve el extremo.
 */
export function ensureContrast(
    color: string,
    background: string,
    targetRatio: number,
): string {
    if (contrastRatio(background, color) >= targetRatio) return color;

    // Sobre fondos oscuros se aclara; sobre fondos claros se oscurece.
    const toward = relativeLuminance(background) < 0.5 ? '#FFFFFF' : '#000000';
    for (let alpha = 0.02; alpha <= 1; alpha += 0.02) {
        const candidate = blendOver(toward, color, alpha);
        if (contrastRatio(background, candidate) >= targetRatio) return candidate;
    }
    return toward;
}

/**
 * Color de texto para dibujar sobre el color de acento elegido en perfil.
 * Se elige siempre el de mayor contraste: blanco en los acentos oscuros y casi
 * negro en los claros (Esmeralda, Naranja, Cian y Ámbar).
 */
export function accentTextColor(accent: string): string {
    return readableTextColor(accent);
}

/**
 * Devuelve el color con una opacidad aplicada, para fondos translúcidos
 * (chips de ícono, velos sobre la superficie). Acepta hex de 3 o 6 dígitos.
 */
export function withAlpha(color: string, alpha: number): string {
    const normalized = color.replace('#', '').trim();
    const full = normalized.length === 3
        ? normalized.split('').map((c) => c + c).join('')
        : normalized;
    if (full.length !== 6) return color;
    const channel = (value: string): number => parseInt(value, 16);
    const r = channel(full.slice(0, 2));
    const g = channel(full.slice(2, 4));
    const b = channel(full.slice(4, 6));
    const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Plan de texto para una superficie que es un **color plano** (el acento neón).
 * El acento ya no tiene degradado, así que el texto y el subtítulo se miden
 * contra el mismo color sólido.
 */
export interface AccentSurfacePlan {
    /** Texto principal (títulos e iconos) sobre el acento. */
    text: string;
    /** Texto secundario (subtítulos) sobre el acento, con la opacidad justa. */
    muted: string;
    /** Opacidad del subtítulo: la más suave que todavía cumple 4.5:1. */
    mutedAlpha: number;
    /** true cuando el acento es luminoso y el texto sobre él es oscuro. */
    isLightAccent: boolean;
}

/**
 * Elige el color de texto (blanco o negro) y la opacidad del subtítulo para
 * que ambos superen el umbral WCAG AA sobre un acento **plano**.
 *
 * Se elige el extremo de mayor contraste y, en el subtítulo, la opacidad más
 * baja (la más suave) que todavía cumple 4.5:1.
 */
export function resolveAccentSurface(accent: string, minRatio = 4.5): AccentSurfacePlan {
    const whiteRatio = contrastRatio(accent, '#FFFFFF');
    const darkRatio = contrastRatio(accent, DARK_TEXT);
    const base = whiteRatio >= darkRatio ? '#FFFFFF' : DARK_TEXT;

    // Opacidad mínima del subtítulo: por debajo deja de leerse como jerarquía
    // y ya no es un "texto atenuado" sino un error de bajo contraste.
    for (let alpha = 0.7; alpha <= 1.0001; alpha += 0.02) {
        const value = Math.min(1, Number(alpha.toFixed(2)));
        const rendered = blendOver(base, accent, value);
        if (contrastRatio(accent, rendered) >= minRatio) {
            return {
                text: base,
                muted: withAlpha(base, value),
                mutedAlpha: value,
                isLightAccent: base === DARK_TEXT,
            };
        }
    }

    // Ninguna opacidad atenuada cumple: el subtítulo va opaco.
    return {
        text: base,
        muted: withAlpha(base, 1),
        mutedAlpha: 1,
        isLightAccent: base === DARK_TEXT,
    };
}

/**
 * Halo de neón para `boxShadow` de React Native: la luz que escapa del color.
 * En modo oscuro el halo es fuerte (el fondo negro lo hace visible); en claro
 * se suaviza para que no parezca una mancha de tinta sobre el blanco.
 */
export function neonGlow(color: string, strength: 'soft' | 'strong' = 'strong'): string {
    const blur = strength === 'strong' ? 20 : 12;
    const spread = strength === 'strong' ? 3 : 0;
    return `0 0 ${blur}px ${spread}px ${color}`;
}
