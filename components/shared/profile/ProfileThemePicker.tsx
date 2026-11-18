import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { THEME_OPTIONS, useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";
import { accentTextColor, relativeLuminance } from "@/utils/color";

interface Props {
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
}

export function ProfileThemePicker({ textPrimary, textSecondary, borderColor, isDark }: Props) {
  const setAccentColor = useThemeStore((state) => state.setAccentColor);
  const userId = useAuthStore((state) => state.user?.id);
  // Se compara contra el color guardado: en modo oscuro el acento negro se
  // muestra como blanco en la interfaz, pero la selección sigue siendo "Negro".
  const storedColor = useThemeStore((state) =>
    userId === undefined || userId === null
      ? '#E11D48'
      : state.userColors[String(userId)] || '#E11D48'
  );
  const selectedTheme = THEME_OPTIONS.find((theme) => theme.color.toLowerCase() === storedColor.toLowerCase()) ?? THEME_OPTIONS[0];
  const themeName = (name: string) => name === "Rojo (Default)" ? "Rojo" : name;

  // Detectar si el tema seleccionado es negro
  const isBlackSelected = selectedTheme.color.toLowerCase() === '#171717';

  // Gradiente adaptativo para el preview: negro en modo claro usa gradiente blanco
  const previewGradient = isBlackSelected && !isDark
    ? ['#FFFFFF', '#F9FAFB', '#F3F4F6']
    : selectedTheme.gradient;

  // Texto e íconos del preview: blanco en toda la paleta salvo Negro y Pizarra
  // (con el tema negro en modo claro el degradado es blanco y el texto oscuro).
  const previewTextColor = accentTextColor(previewGradient[0]);
  const isPreviewLight = previewTextColor === "#FFFFFF";

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: textPrimary }]}>Elige tu color</Text>
      <Text style={[styles.description, { color: textSecondary }]}>
        Personaliza los botones y detalles de tu app.
      </Text>
      <LinearGradient
        colors={previewGradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.preview}
      >
        <View pointerEvents="none" style={[styles.previewScrim, { backgroundColor: isPreviewLight ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.20)" }]} />
        <View style={[styles.previewIcon, { backgroundColor: isPreviewLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.18)" }]}>
          <Ionicons name="color-palette-outline" size={26} color={previewTextColor} />
        </View>
        <View style={styles.previewText}>
          <Text style={[styles.previewCaption, { color: previewTextColor }]}>TU COLOR ACTUAL</Text>
          <Text style={[styles.previewName, { color: previewTextColor }]}>{themeName(selectedTheme.name)}</Text>
        </View>
        <Ionicons name="checkmark-circle" size={24} color={previewTextColor} />
      </LinearGradient>
      <View style={styles.grid}>
        {THEME_OPTIONS.map((theme) => {
          const isSelected = storedColor.toLowerCase() === theme.color.toLowerCase();
          const isThemeBlack = theme.color.toLowerCase() === '#171717';
          // Gradiente adaptativo para el swatch del negro
          const swatchGradient = isThemeBlack && !isDark
            ? ['#FFFFFF', '#F9FAFB', '#F3F4F6']
            : theme.gradient;
          const swatchTextColor = accentTextColor(swatchGradient[0]);
          const isThemeLight = relativeLuminance(theme.color) > 0.7;
          // Para colores claros, usar un fondo gris en lugar de `${theme.color}18` (invisible en blanco)
          const optionBg = isSelected ? (isThemeLight ? "rgba(107,114,128,0.12)" : `${theme.color}18`) : "transparent";
          // Para colores claros, el borde usa un tono más oscuro
          // En modo oscuro el swatch negro se funde con el fondo: el borde
          // seleccionado pasa a blanco para seguir siendo visible.
          const optionBorder = isSelected
            ? isThemeLight
              ? "#6B7280"
              : isThemeBlack && isDark
                ? "#FFFFFF"
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
                pressed && { opacity: 0.7 },
              ]}
            >
              <LinearGradient
                colors={swatchGradient as [string, string, ...string[]]}
                style={styles.swatch}
              >
                {isSelected && <Ionicons name="checkmark" size={20} color={swatchTextColor} />}
              </LinearGradient>
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

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  preview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 16, overflow: "hidden" },
  previewScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  previewIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  previewText: { flex: 1 },
  previewCaption: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  previewName: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  option: { width: "48%", flexDirection: "row", alignItems: "center", gap: 10, padding: 10, minHeight: 58, borderRadius: 16, borderWidth: 2 },
  swatch: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionName: { flex: 1, fontSize: 13, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 14 },
});
