import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import logger from '@/utils/logger';

export interface ThemeOption {
    name: string;
    /** Color plano del acento: la paleta es neón, sin degradado. */
    color: string;
}

/**
 * Paleta de acentos en versión **neón brillante**: colores saturados y
 * luminosos, pensados para brillar sobre el fondo negro en modo oscuro.
 *
 * Cada color es plano. El brillo no viene de un degradado sino del halo
 * (`accentGlow`) que se aplica a las superficies de marca.
 */
export const THEME_OPTIONS: ThemeOption[] = [
    { name: 'Rojo (Default)', color: '#FF1B3D' },
    { name: 'Violeta', color: '#C13BFF' },
    { name: 'Azul', color: '#0095FF' },
    { name: 'Índigo', color: '#6C4DFF' },
    { name: 'Esmeralda', color: '#00FFA6' },
    { name: 'Naranja', color: '#FF8A00' },
    { name: 'Rosa', color: '#FF2E9A' },
    { name: 'Cian', color: '#00F5FF' },
    { name: 'Ámbar', color: '#FFC400' },
    { name: 'Dorado', color: '#FFE600' },
    { name: 'Plata', color: '#DCE9F7' },
    { name: 'Pizarra', color: '#6E8CB8' },
    { name: 'Negro', color: '#171717' },
];

export const DEFAULT_ACCENT_COLOR = THEME_OPTIONS[0].color;

/**
 * Colores de paletas anteriores (la saturada de 2025 y la original de
 * Tailwind). Se guardan en el dispositivo, así que al cambiar la paleta hay
 * que traducirlos: si no, el usuario se quedaría con un color viejo que ya no
 * existe en el selector.
 */
const LEGACY_ACCENT_MAP: Record<string, string> = {
    // Paleta anterior (saturada, con degradado)
    '#FF2D55': '#FF1B3D',
    '#B44AFF': '#C13BFF',
    '#00BFFF': '#0095FF',
    '#7B61FF': '#6C4DFF',
    '#00FF9C': '#00FFA6',
    '#FF6B2B': '#FF8A00',
    '#FF4DA6': '#FF2E9A',
    '#00F0FF': '#00F5FF',
    '#FFB800': '#FFC400',
    '#FFD700': '#FFE600',
    '#C0C0C0': '#DCE9F7',
    '#6C7A89': '#6E8CB8',
    '#1A1A2E': '#171717',
    // Paleta original (Tailwind)
    '#E11D48': '#FF1B3D',
    '#BE123C': '#FF1B3D',
    '#9F1239': '#FF1B3D',
    '#7C3AED': '#C13BFF',
    '#6D28D9': '#C13BFF',
    '#5B21B6': '#C13BFF',
    '#2563EB': '#0095FF',
    '#1D4ED8': '#0095FF',
    '#1E40AF': '#0095FF',
    '#4F46E5': '#6C4DFF',
    '#4338CA': '#6C4DFF',
    '#3730A3': '#6C4DFF',
    '#059669': '#00FFA6',
    '#047857': '#00FFA6',
    '#065F46': '#00FFA6',
    '#EA580C': '#FF8A00',
    '#C2410C': '#FF8A00',
    '#9A3412': '#FF8A00',
    '#DB2777': '#FF2E9A',
    '#BE185D': '#FF2E9A',
    '#9D174D': '#FF2E9A',
    '#0891B2': '#00F5FF',
    '#0E7490': '#00F5FF',
    '#155E75': '#00F5FF',
    '#D97706': '#FFC400',
    '#B45309': '#FFC400',
    '#92400E': '#FFC400',
    '#475569': '#6E8CB8',
    '#334155': '#6E8CB8',
    '#1E293B': '#6E8CB8',
};

function hexToRgb(hex: string): [number, number, number] {    const normalized = hex.replace('#', '').trim();
    const full = normalized.length === 3
        ? normalized.split('').map((c) => c + c).join('')
        : normalized;
    if (full.length !== 6) return [0, 0, 0];
    return [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
    ];
}

/** Acento de la paleta neón más cercano al color indicado. */
function nearestAccent(color: string): string {
    const [r, g, b] = hexToRgb(color);
    let best = THEME_OPTIONS[0].color;
    let bestDistance = Number.POSITIVE_INFINITY;
    THEME_OPTIONS.forEach((theme) => {
        const [tr, tg, tb] = hexToRgb(theme.color);
        const distance = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2;
        if (distance < bestDistance) {
            bestDistance = distance;
            best = theme.color;
        }
    });
    return best;
}

/** El mapa de colores viejos se consulta en minúsculas. */
const LEGACY_ACCENT_LOOKUP: Record<string, string> = Object.entries(LEGACY_ACCENT_MAP)
    .reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key.toLowerCase()] = value;
        return acc;
    }, {});

/**
 * Traduce cualquier color guardado a la paleta neón vigente: los colores de
 * paletas viejas se mapean uno a uno y los desconocidos caen en el acento
 * más cercano.
 */
export function normalizeAccentColor(color?: string | null): string {
    if (!color) return DEFAULT_ACCENT_COLOR;
    const key = color.trim().toLowerCase();
    if (LEGACY_ACCENT_LOOKUP[key]) return LEGACY_ACCENT_LOOKUP[key];
    const exact = THEME_OPTIONS.find((theme) => theme.color.toLowerCase() === key);
    if (exact) return exact.color;
    return nearestAccent(color.trim());
}

interface ThemeState {
    userColors: Record<string, string>;
    getColor: (userId?: string | number) => string;
    setAccentColor: (userId: string | number, color: string) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            userColors: {},

            getColor: (userId) => {
                if (userId === undefined || userId === null) return DEFAULT_ACCENT_COLOR;
                const color = get().userColors[String(userId)];
                return normalizeAccentColor(color);
            },

            setAccentColor: (userId, color) => {
                if (userId === undefined || userId === null) return;
                logger.info(`Setting accent color for user ${userId}: ${color}`);
                set((state) => ({
                    userColors: {
                        ...state.userColors,
                        [String(userId)]: color
                    }
                }));
            },
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
