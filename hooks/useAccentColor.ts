import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export function useAccentColor() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const user = useAuthStore(state => state.user);
    const { getColor, getGradient } = useThemeStore();

    const accentColor = getColor(user?.id);
    const gradientColors = getGradient(user?.id, isDark);

    // Si estamos en Light Mode, el gradiente del header por defecto era ['#2D2870', '#1E1B4B', '#0F0D2E']
    // Si estamos en Dark Mode, era ['#FFFFFF', '#F1F5F9']
    // El usuario pidió que el gradiente TAMBIÉN cambie.

    // Si el color es el default (#E11D48), mantenemos los gradientes originales si queremos, 
    // pero el usuario dijo "que el gradiente también cambie".

    // Podemos retornar también variaciones para fondos, bordes, etc.
    return {
        accentColor,
        gradientColors,
        isDark,
        // Helper para bordes sutiles con el color de acento
        accentBorder: `${accentColor}30`,
        // Helper para fondos muy sutiles
        accentBg: `${accentColor}15`,
    };
}
