import { useMemo } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';
import { THEME_OPTIONS, useThemeStore } from '@/store/themeStore';
import { accentTextColor, relativeLuminance } from '@/utils/color';

const DEFAULT_ACCENT = '#E11D48';
const BLACK_ACCENT = '#171717';

export function useAccentColor() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const user = useAuthStore(state => state.user);
    const userId = user?.id;

    // Color elegido por el usuario en el módulo de perfil (sin adaptar).
    const storedAccent = useThemeStore(state => {
        if (userId === undefined || userId === null) return DEFAULT_ACCENT;
        return state.userColors[String(userId)] || DEFAULT_ACCENT;
    });

    // Detectar si el acento es negro
    const isBlackAccent = storedAccent.toLowerCase() === BLACK_ACCENT;

    // El negro como acento no se ve sobre fondos negros: en modo oscuro el
    // acento de la interfaz pasa a blanco (tema monocromo). En modo claro se
    // mantiene negro, que es lo que el usuario eligió.
    const accentColor = isBlackAccent && isDark ? '#FFFFFF' : storedAccent;

    const gradientColors = useMemo(() => {
        if (isBlackAccent) {
            // Monocromo puro: negro en oscuro, blanco en claro.
            return isDark
                ? ['#1F1F1F', '#0F0F0F', '#000000']
                : ['#FFFFFF', '#F9FAFB', '#F3F4F6'];
        }
        const theme = THEME_OPTIONS.find(t => t.color.toLowerCase() === storedAccent.toLowerCase()) || THEME_OPTIONS[0];
        return theme.gradient;
    }, [isBlackAccent, isDark, storedAccent]);

    // Texto e íconos que se dibujan sobre el degradado del acento (headers,
    // tab bar). Con el tema negro en claro el degradado es blanco, así que el
    // contenido debe ser oscuro para seguir siendo legible.
    // Solo el tema negro en modo claro produce un degradado claro; el resto de
    // los acentos sigue usando contenido blanco como hasta ahora.
    const gradientIsLight = isBlackAccent && !isDark;
    const gradientText = gradientIsLight ? '#111827' : '#FFFFFF';
    const gradientTextMuted = gradientIsLight ? 'rgba(17,24,39,0.75)' : 'rgba(255,255,255,0.92)';
    const gradientOverlay = gradientIsLight ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.20)';
    const gradientControlBg = gradientIsLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.20)';
    const gradientControlBorder = gradientIsLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.20)';
    const gradientActiveBg = gradientIsLight ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.38)';

    // Detectar si el acento es muy claro (luminancia alta)
    const isAccentLight = relativeLuminance(accentColor) > 0.7;

    // Color de UI adaptativo: si el acento es claro en modo claro, usamos un tono más oscuro
    // para íconos, bordes y elementos sobre fondos claros
    const accentUi = useMemo(() => {
        if (isBlackAccent) {
            // Modo oscuro: blanco sobre negro. Modo claro: negro sobre blanco.
            return isDark ? '#FFFFFF' : '#111827';
        }
        if (isDark || !isAccentLight) return accentColor;
        // En modo claro con acento claro, usar un gris medio para mantener visibilidad
        return '#6B7280';
    }, [accentColor, isDark, isAccentLight, isBlackAccent]);

    // Paleta de superficies. Con el tema negro es monocroma estricta: todos los
    // fondos negros con textos blancos en oscuro, y blancos con textos negros
    // en claro.
    let bg, cardBg, textPrimary, textSecondary;
    if (isBlackAccent) {
        if (isDark) {
            bg = '#000000';
            cardBg = '#000000';
            textPrimary = '#FFFFFF';
            textSecondary = '#D4D4D4';
        } else {
            bg = '#FFFFFF';
            cardBg = '#FFFFFF';
            textPrimary = '#111827';
            textSecondary = '#4B5563';
        }
    } else {
        bg = isDark ? '#000000' : '#F3F4F6';
        cardBg = isDark ? '#111111' : '#FFFFFF';
        textPrimary = isDark ? '#FFFFFF' : '#111827';
        textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    }

    const borderColor = isBlackAccent
        ? isDark
            ? 'rgba(255,255,255,0.18)'
            : 'rgba(0,0,0,0.12)'
        : isDark
            ? `${accentColor}40`
            : 'rgba(0,0,0,0.05)';

    // Superficie secundaria (chips, inputs, badges) que no compite con las
    // tarjetas. En el tema negro también es monocroma.
    const surfaceMuted = isBlackAccent
        ? isDark
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(0,0,0,0.06)'
        : isDark
            ? '#1F2937'
            : '#F3F4F6';

    return {
        accentColor,
        // Texto legible sobre el acento (el usuario puede elegir uno claro u oscuro).
        // Texto sobre el acento: blanco en toda la paleta salvo Negro y Pizarra.
        accentText: accentTextColor(accentColor),
        // Color de UI adaptativo para íconos, bordes y badges sobre fondos claros
        accentUi,
        gradientColors,
        // Contenido sobre el degradado del acento
        gradientText,
        gradientTextMuted,
        gradientOverlay,
        gradientControlBg,
        gradientControlBorder,
        gradientActiveBg,
        isDark,
        isBlackAccent,
        bg,
        cardBg,
        borderColor,
        surfaceMuted,
        accentBorder: `${accentColor}30`,
        accentBg: `${accentColor}15`,
        textPrimary,
        textSecondary,
    };
}
