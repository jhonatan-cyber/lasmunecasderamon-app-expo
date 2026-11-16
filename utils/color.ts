/** Utilidades de contraste WCAG compartidas por componentes con color dinámico. */

function channel(value: number): number {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
    const normalized = hex.replace('#', '');
    const full = normalized.length === 3
        ? normalized.split('').map((c) => c + c).join('')
        : normalized;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
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
 * Devuelve el color de texto (blanco o casi negro) con mejor contraste sobre
 * `background`. Se usa cuando el fondo viene del acento elegido por el usuario,
 * que puede ser claro (ámbar) u oscuro (pizarra).
 */
export function readableTextColor(background: string): string {
    return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#111827')
        ? '#FFFFFF'
        : '#111827';
}
