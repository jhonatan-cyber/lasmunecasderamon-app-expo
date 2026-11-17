import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeScheme = 'light' | 'dark';

interface AppearanceState {
    /** Esquema elegido por el usuario. `null` significa "seguir al sistema". */
    scheme: ThemeScheme | null;
    setScheme: (scheme: ThemeScheme) => void;
    toggleScheme: () => void;
}

/** Get system color scheme safely across platforms */
function getSystemScheme(): ThemeScheme {
    if (Platform.OS !== 'web') {
        const scheme = Appearance.getColorScheme();
        return scheme === 'dark' ? 'dark' : 'light';
    } else {
        // On web, use window.matchMedia to detect system preference
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    }
}

/** Apply theme to web document */
function applyWebScheme(scheme: ThemeScheme | null) {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Remove existing scheme classes
    root.classList.remove('light', 'dark');
    
    // Set the color-scheme CSS property for native UI elements
    const effectiveScheme = scheme ?? getSystemScheme();
    root.classList.add(effectiveScheme);
    root.style.colorScheme = effectiveScheme;
}

/**
 * El esquema de color se guardaba solo en memoria: al reiniciar la app volvía
 * al tema del sistema. Este store lo persiste y lo aplica al rehidratar, antes
 * de que se monte la primera pantalla.
 */
export const useAppearanceStore = create<AppearanceState>()(
    persist(
        (set, get) => ({
            scheme: null,

            setScheme: (scheme) => {
                if (Platform.OS !== 'web') {
                    Appearance.setColorScheme(scheme);
                } else {
                    applyWebScheme(scheme);
                }
                set({ scheme });
            },

            toggleScheme: () => {
                const actual = get().scheme ?? getSystemScheme();
                get().setScheme(actual === 'dark' ? 'light' : 'dark');
            },
        }),
        {
            name: 'appearance-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ scheme: state.scheme }),
            onRehydrateStorage: () => (state) => {
                if (state?.scheme) {
                    if (Platform.OS !== 'web') {
                        Appearance.setColorScheme(state.scheme);
                    } else {
                        applyWebScheme(state.scheme);
                    }
                }
            },
        },
    ),
);
