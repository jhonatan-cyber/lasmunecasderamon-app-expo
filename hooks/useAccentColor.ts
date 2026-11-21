import { useMemo } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/store/authStore';
import { DEFAULT_ACCENT_COLOR, normalizeAccentColor, useThemeStore } from '@/store/themeStore';
import { ensureContrast, neonGlow, resolveAccentSurface } from '@/utils/color';

const BLACK_ACCENT = '#171717';

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

    // Detectar si el acento es negro
    const isBlackAccent = storedAccent.toLowerCase() === BLACK_ACCENT;

    // El negro como acento no se ve sobre fondos negros: en modo oscuro el
    // acento de la interfaz pasa a blanco (tema monocromo). En modo claro se
    // mantiene negro, que es lo que el usuario eligió.
    const accentColor = isBlackAccent && isDark ? '#FFFFFF' : storedAccent;

    // El acento es un **color plano**: no hay degradado. El array se conserva
    // para los componentes que aún pintan con LinearGradient, pero sus tres
    // tonos son idénticos, así que en pantalla se ve un color sólido.
    const gradientColors = useMemo(
        () => [accentColor, accentColor, accentColor],
        [accentColor],
    );

    // Texto e íconos que se dibujan sobre el color de acento (header, tab
    // bar, botones). El color se elige por medición: blanco sobre los acentos
    // profundos y casi negro sobre los neón luminosos (Cian, Ámbar, Esmeralda).
    const surfacePlan = useMemo(() => resolveAccentSurface(accentColor), [accentColor]);

    // Velo de los controles que van sobre el acento (botón "Nuevo", pestañas
    // del header, ítem activo). En un acento luminoso el velo es oscuro; en un
    // acento profundo es blanco.
    const gradientControlBg = surfacePlan.isLightAccent ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.18)';
    const gradientControlBorder = surfacePlan.isLightAccent ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.22)';
    const gradientActiveBg = surfacePlan.isLightAccent ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.30)';

    // Referencia conservadora para el contraste del acento en claro: se mide
    // contra el gris (#F3F4F6), la superficie más exigente, para que el acento
    // también supere el umbral sobre la tarjeta y la pantalla blancas.
    const surfaceBg = isDark ? '#000000' : '#F3F4F6';

    // Color de UI adaptativo (íconos, bordes, badges): al menos 3:1.
    const accentUi = useMemo(() => {
        if (isBlackAccent) {
            // Modo oscuro: blanco sobre negro. Modo claro: negro sobre blanco.
            return isDark ? '#FFFFFF' : '#111827';
        }
        return ensureContrast(accentColor, surfaceBg, 3);
    }, [accentColor, isBlackAccent, isDark, surfaceBg]);

    // Acento como texto de tamaño normal: al menos 4.5:1. Es el token que
    // deben usar los importes y etiquetas que hoy pintaban con `accentColor`.
    const accentOnSurface = useMemo(() => {
        if (isBlackAccent) return isDark ? '#FFFFFF' : '#111827';
        return ensureContrast(accentColor, surfaceBg, 4.5);
    }, [accentColor, isBlackAccent, isDark, surfaceBg]);

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
        // El fondo de la app es blanco en claro y negro en oscuro. Las
        // tarjetas también son blancas en claro: se distinguen de la pantalla
        // por su borde (rgba(0,0,0,0.12)) y su sombra, no por el relleno.
        bg = isDark ? '#000000' : '#FFFFFF';
        cardBg = isDark ? '#111111' : '#FFFFFF';
        textPrimary = isDark ? '#FFFFFF' : '#111827';
        textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    }

    // El borde separa las tarjetas blancas de la pantalla blanca: en claro
    // tiene que verse (0.12) y no solo insinuarce (0.05).
    const borderColor = isBlackAccent
        ? isDark
            ? 'rgba(255,255,255,0.18)'
            : 'rgba(0,0,0,0.12)'
        : isDark
            ? `${accentColor}40`
            : 'rgba(0,0,0,0.12)';

    // Superficie secundaria (chips, inputs, badges) que no compite con las
    // tarjetas. En el tema negro también es monocroma.
    const surfaceMuted = isBlackAccent
        ? isDark
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(0,0,0,0.06)'
        : isDark
            ? '#1F2937'
            : '#F3F4F6';

    // Halo de neón: la luz que escapa del color. Fuerte en oscuro (el fondo
    // negro lo hace visible), suave en claro (sobre el blanco un halo intense
    // parece una mancha).
    const accentGlow = useMemo(
        () => neonGlow(accentColor, isDark ? 'strong' : 'soft'),
        [accentColor, isDark],
    );

    return {
        accentColor,
        // Texto legible sobre el acento (el usuario puede elegir uno claro u oscuro).
        accentText: surfacePlan.text,
        // Texto secundario sobre el acento (subtítulos del header y del tab bar).
        accentTextMuted: surfacePlan.muted,
        // Color de UI adaptativo para íconos, bordes y badges sobre fondos claros
        accentUi,
        // Acento legible como texto sobre la superficie actual
        accentOnSurface,
        // El acento es plano: los tres tonos son el mismo color.
        gradientColors,
        // Contenido sobre el color de acento
        gradientText: surfacePlan.text,
        gradientTextMuted: surfacePlan.muted,
        gradientControlBg,
        gradientControlBorder,
        gradientActiveBg,
        // Halo de neón para `boxShadow`
        accentGlow,
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
