import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeScheme = 'light' | 'dark';

interface AppearanceState {
    /** Esquema elegido por el usuario. `null` significa "seguir al sistema". */
    scheme: ThemeScheme | null;
    setScheme: (scheme: ThemeScheme) => void;
    toggleScheme: () => void;
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
                Appearance.setColorScheme(scheme);
                set({ scheme });
            },

            toggleScheme: () => {
                const actual = get().scheme ?? (Appearance.getColorScheme() === 'light' ? 'light' : 'dark');
                get().setScheme(actual === 'dark' ? 'light' : 'dark');
            },
        }),
        {
            name: 'appearance-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ scheme: state.scheme }),
            onRehydrateStorage: () => (state) => {
                if (state?.scheme) {
                    Appearance.setColorScheme(state.scheme);
                }
            },
        },
    ),
);
