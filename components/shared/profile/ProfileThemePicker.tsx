import Ionicons from "@expo/vector-icons/Ionicons";
import { BorderRadius } from '@/constants/spacing';
import { ThemeTokens } from '@/constants/colorTokens';
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DEFAULT_ACCENT_COLOR, THEME_OPTIONS, normalizeAccentColor, useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { neonGlow, resolveAccentSurface } from "@/utils/color";
import { resolveThemePalette } from "@/utils/themePalette";

export function ProfileThemePicker({ textPrimary, textSecondary, borderColor, isDark }: {
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
}) {
  const setAccentColor = useThemeStore((state) => state.setAccentColor);
  const userId = useAuthStore((state) => state.user?.id);
  // Se compara contra el color guardado: en modo oscuro el acento negro se
  // muestra como blanco en la interfaz, pero la selección sigue siendo "Negro".
  const storedColor = useThemeStore((state) =>
    normalizeAccentColor(
      userId === undefined || userId === null
        ? DEFAULT_ACCENT_COLOR
        : state.userColors[String(userId)] || DEFAULT_ACCENT_COLOR
    )
  );
  const selectedTheme = THEME_OPTIONS.find((theme) => theme.color.toLowerCase() === storedColor.toLowerCase()) ?? THEME_OPTIONS[0];
  const themeName = (name: string) => name === "Rojo (Default)" ? "Rojo" : name;
  const themeTokens = isDark ? ThemeTokens.dark : ThemeTokens.light;
  const selectedPalette = resolveThemePalette(storedColor, isDark);

  const previewColor = selectedPalette.primaryColor;
  const previewTextColor = selectedPalette.primaryText;
  const previewAccentTextColor = selectedPalette.accentText;
  const glowOf = (color: string) => {
    const glowColor = resolveThemePalette(color, isDark).glowColor;
    return neonGlow(glowColor, isDark ? "strong" : "soft");
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: textPrimary }]}>Elige tu color</Text>
      <Text style={[styles.description, { color: textSecondary }]}>
        Personaliza los botones y detalles de tu app.
      </Text>
      <View
        style={[
          styles.preview,
          { backgroundColor: previewColor, boxShadow: glowOf(storedColor) },
        ]}
      >
        <View style={[styles.previewIcon, { backgroundColor: selectedPalette.accentColor }]}>
          <Ionicons name="color-palette-outline" size={26} color={previewAccentTextColor} />
        </View>
        <View style={styles.previewText}>
          <Text style={[styles.previewCaption, { color: previewTextColor }]}>TU COLOR ACTUAL</Text>
          <Text style={[styles.previewName, { color: previewTextColor }]}>{themeName(selectedTheme.name)}</Text>
        </View>
        <Ionicons name="checkmark-circle" size={24} color={previewTextColor} />
      </View>
      <View style={styles.grid}>
        {THEME_OPTIONS.map((theme) => {
          const isSelected = storedColor.toLowerCase() === theme.color.toLowerCase();
          const isThemeBlack = theme.color.toLowerCase() === '#171717';
          // Texto legible sobre el color plano del swatch.
          const swatchTextColor = resolveAccentSurface(theme.color).text;
          // Para colores claros, usar un fondo gris en lugar de `${theme.color}18` (invisible en blanco)
          const optionBg = isSelected ? (isThemeLight(theme.color) ? themeTokens.overlaySubtle : `${theme.color}18`) : "transparent";
          // Para colores claros, el borde usa un tono más oscuro
          // En modo oscuro el swatch negro se funde con el fondo: el borde
          // seleccionado pasa a blanco para seguir siendo visible.
          const optionBorder = isSelected
            ? isThemeLight(theme.color)
              ? textSecondary
              : isThemeBlack && isDark
                ? themeTokens.textPrimary
                : theme.color
            : borderColor;
          return (
            <Pressable
              key={theme.color}
              accessibilityRole="radio"
              accessibilityLabel={`Color ${themeName(theme.name)}`}
              accessibilityState={{ checked: isSelected, disabled: userId == null }}
              disabled={userId == null}
              onPress={() => { if (userId != null) setAccentColor(userId, theme.color); }}
              style={({ pressed }) => [
                styles.option,
                { borderColor: optionBorder, backgroundColor: optionBg },
                pressed && { opacity: themeTokens.interaction.pressedOpacity },
                userId == null && { opacity: themeTokens.interaction.disabledOpacity },
              ]}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: theme.color,
                    // El swatch seleccionado enciende: es el mismo halo que
                    // usan el header y la barra de pestañas.
                    boxShadow: isSelected ? glowOf(theme.color) : undefined,
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={20} color={swatchTextColor} />}
              </View>
              <Text style={[styles.optionName, { color: textPrimary }]}>{themeName(theme.name)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: textSecondary }]}>
        Se aplica al instante y se guarda para tu perfil en este dispositivo.
      </Text>
    </View>
  );
}

/** Un acento con luminancia alta se pierde sobre el blanco: lleva borde gris. */
function isThemeLight(color: string): boolean {
  return resolveAccentSurface(color).isLightAccent;
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  // Sin `overflow: hidden`: el halo neón de la tarjeta se dibuja fuera del borde.
  preview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: BorderRadius.card, marginBottom: 16 },
  previewIcon: { width: 48, height: 48, borderRadius: BorderRadius.full, alignItems: "center", justifyContent: "center" },
  previewText: { flex: 1 },
  previewCaption: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  previewName: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  option: { width: "48%", flexDirection: "row", alignItems: "center", gap: 10, padding: 10, minHeight: 58, borderRadius: BorderRadius.full, borderWidth: 2 },
  swatch: { width: 32, height: 32, borderRadius: BorderRadius.full, alignItems: "center", justifyContent: "center" },
  optionName: { flex: 1, fontSize: 13, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 14 },
});
