/**
 * Utility for color manipulation in the app theme
 */

/**
 * Rotates the hue of a hex color
 * @param hex The hex color string (e.g., "#E11D48")
 * @param angle The angle in degrees to rotate (0-360)
 * @returns The rotated hex color
 */
export function rotateColor(hex: string, angle: number): string {
    // Remove # if present
    hex = hex.replace('#', '');

    // Convert hex to RGB
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    // Convert RGB to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    // Rotate Hue
    h = (h + angle / 360) % 1;

    // Convert HSL back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    // Convert RGB to hex
    const toHex = (x: number) => {
        const out = Math.round(x * 255).toString(16);
        return out.length === 1 ? '0' + out : out;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates an array of colors analogous to the base color
 * @param baseColor Hex string
 * @param count Number of colors to generate
 * @param step Angle step between colors
 */
export function generateAnalogousPalette(baseColor: string, count: number, step: number = 30): string[] {
    const palette = [];
    for (let i = 0; i < count; i++) {
        // Alternar rotación positiva y negativa para mantener armonía cercana al original
        // o simplemente ir rotando. Rotar secuencialmente suele verse más "limpio"
        palette.push(rotateColor(baseColor, i * step));
    }
    return palette;
}
