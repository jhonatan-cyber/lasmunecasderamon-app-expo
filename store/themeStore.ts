import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ThemeColors {
    primary: string;
    gradient: string[];
}

export const THEME_OPTIONS = [
    { name: 'Rojo (Default)', color: '#E11D48', gradient: ['#E11D48', '#BE123C', '#9F1239'] },
    { name: 'Violeta', color: '#7C3AED', gradient: ['#7C3AED', '#6D28D9', '#5B21B6'] },
    { name: 'Azul', color: '#2563EB', gradient: ['#2563EB', '#1D4ED8', '#1E40AF'] },
    { name: 'Índigo', color: '#4F46E5', gradient: ['#4F46E5', '#4338CA', '#3730A3'] },
    { name: 'Esmeralda', color: '#059669', gradient: ['#059669', '#047857', '#065F46'] },
    { name: 'Naranja', color: '#EA580C', gradient: ['#EA580C', '#C2410C', '#9A3412'] },
    { name: 'Rosa', color: '#DB2777', gradient: ['#DB2777', '#BE185D', '#9D174D'] },
    { name: 'Cian', color: '#0891B2', gradient: ['#0891B2', '#0E7490', '#155E75'] },
    { name: 'Ámbar', color: '#D97706', gradient: ['#D97706', '#B45309', '#92400E'] },
    { name: 'Pizarra', color: '#475569', gradient: ['#475569', '#334155', '#1E293B'] },
];

interface ThemeState {
    userColors: Record<string, string>; // userId -> hex color
    getColor: (userId?: number) => string;
    getGradient: (userId?: number, isDark?: boolean) => string[];
    setAccentColor: (userId: number, color: string) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            userColors: {},

            getColor: (userId) => {
                if (userId === undefined || userId === null) return '#E11D48';
                const color = get().userColors[String(userId)];
                return color || '#E11D48';
            },

            getGradient: (userId, isDark) => {
                const color = get().getColor(userId);
                const theme = THEME_OPTIONS.find(t => t.color.toLowerCase() === color.toLowerCase()) || THEME_OPTIONS[0];
                return theme.gradient;
            },

            setAccentColor: (userId, color) => {
                if (userId === undefined || userId === null) return;
                console.log(`Setting accent color for user ${userId}: ${color}`);
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
