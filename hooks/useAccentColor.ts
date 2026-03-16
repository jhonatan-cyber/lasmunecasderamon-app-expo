import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { THEME_OPTIONS, useThemeStore } from '../store/themeStore';

export function useAccentColor() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const user = useAuthStore(state => state.user);
    const userId = user?.id;

    // Suscripción directa al color del usuario en el store para máxima reactividad
    const accentColor = useThemeStore(state => {
        if (userId === undefined || userId === null) return '#E11D48';
        return state.userColors[String(userId)] || '#E11D48';
    });

    // Colores derivados con useMemo para eficiencia
    const gradientColors = useMemo(() => {
        const theme = THEME_OPTIONS.find(t => t.color.toLowerCase() === accentColor.toLowerCase()) || THEME_OPTIONS[0];
        return theme.gradient;
    }, [accentColor]);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

    return {
        accentColor,
        gradientColors,
        isDark,
        bg,
        cardBg,
        borderColor,
        accentBorder: `${accentColor}30`,
        accentBg: `${accentColor}15`,
    };
}
