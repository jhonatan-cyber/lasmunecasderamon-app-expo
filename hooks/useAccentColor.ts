import { useMemo } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';
import { DEFAULT_ACCENT_COLOR, normalizeAccentColor, useThemeStore } from '@/store/themeStore';
import { neonGlow } from '@/utils/color';
import { resolveThemePalette } from '@/utils/themePalette';

export function useAccentColor() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const user = useAuthStore(state => state.user);
    const userId = user?.id;

    // Color elegido por el usuario en el módulo de perfil. Se normaliza para
    // que los colores guardados con paletas anteriores caigan en la paleta
    // neón vigente.
    const storedAccent = useThemeStore(state => {
        const raw = userId === undefined || userId === null
            ? DEFAULT_ACCENT_COLOR
            : state.userColors[String(userId)] || DEFAULT_ACCENT_COLOR;
        return normalizeAccentColor(raw);
    });

    const palette = useMemo(
        () => resolveThemePalette(storedAccent, isDark),
        [storedAccent, isDark],
    );
    const { primaryColor } = palette;
    // Los consumidores existentes usan `accentColor` como relleno de marca.
    const accentColor = primaryColor;

    // El primario es un color plano: el array queda por compatibilidad con los
    // componentes que aún pintan con LinearGradient.
    const gradientColors = useMemo(
        () => [accentColor, accentColor, accentColor],
        [accentColor],
    );

    // Velo de los controles que van sobre el primario. En tonos luminosos el
    // velo es oscuro; en tonos profundos es blanco.
    const gradientControlBg = palette.isLightPrimary ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.18)';
    const gradientControlBorder = palette.isLightPrimary ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.22)';
    const gradientActiveBg = palette.isLightPrimary ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.30)';

    // Halo de neón: la luz que escapa del color. Fuerte en oscuro (el fondo
    // negro lo hace visible), suave en claro (sobre el blanco un halo intense
    // parece una mancha).
    const accentGlow = useMemo(
        () => neonGlow(palette.glowColor, isDark ? 'strong' : 'soft'),
        [palette.glowColor, isDark],
    );

    return {
        ...palette,
        accentColor,
        accentRoleColor: palette.accentColor,
        accentRoleText: palette.accentText,
        accentRoleTextMuted: palette.accentTextMuted,
        accentText: palette.primaryText,
        accentTextMuted: palette.primaryTextMuted,
        isLightAccent: palette.isLightPrimary,
        // El primario es plano: los tres tonos son el mismo color.
        gradientColors,
        // Contenido sobre el primario
        gradientText: palette.primaryText,
        gradientTextMuted: palette.primaryTextMuted,
        gradientControlBg,
        gradientControlBorder,
        gradientActiveBg,
        // Halo de neón para `boxShadow`
        accentGlow,
    };
}
