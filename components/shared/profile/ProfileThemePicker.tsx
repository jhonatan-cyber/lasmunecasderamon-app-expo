import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { THEME_OPTIONS, useThemeStore } from "@/store/themeStore";
import { useAppearanceStore } from "@/store/appearanceStore";
import { useAuthStore } from "@/store/authStore";

interface Props {
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export function ProfileThemePicker({ accentColor, textPrimary, textSecondary, borderColor }: Props) {
  const setAccentColor = useThemeStore((state) => state.setAccentColor);
  const setScheme = useAppearanceStore((state) => state.setScheme);
  const scheme = useColorScheme() ?? "dark";
  const userId = useAuthStore((state) => state.user?.id);
  const appearanceOptions = [
    { id: "light" as const, label: "Claro", icon: "sunny-outline" as const },
    { id: "dark" as const, label: "Oscuro", icon: "moon-outline" as const },
  ];
  const selectedTheme = THEME_OPTIONS.find((theme) => theme.color.toLowerCase() === accentColor.toLowerCase()) ?? THEME_OPTIONS[0];
  const themeName = (name: string) => name === "Rojo (Default)" ? "Rojo" : name;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: textPrimary }]}>Elige tu color</Text>
      <Text style={[styles.description, { color: textSecondary }]}>
        Personaliza los botones y detalles de tu app.
      </Text>
      <LinearGradient
        colors={selectedTheme.gradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.preview}
      >
        <View pointerEvents="none" style={styles.previewScrim} />
        <View style={styles.previewIcon}>
          <Ionicons name="color-palette-outline" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.previewText}>
          <Text style={styles.previewCaption}>TU COLOR ACTUAL</Text>
          <Text style={styles.previewName}>{themeName(selectedTheme.name)}</Text>
        </View>
        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
      </LinearGradient>
      <View style={styles.grid}>
        {THEME_OPTIONS.map((theme) => {
          const isSelected = accentColor.toLowerCase() === theme.color.toLowerCase();
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
                { borderColor: isSelected ? theme.color : borderColor, backgroundColor: isSelected ? `${theme.color}18` : "transparent" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <LinearGradient
                colors={theme.gradient as [string, string, ...string[]]}
                style={styles.swatch}
              >
                {isSelected && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
              </LinearGradient>
              <Text style={[styles.optionName, { color: textPrimary }]}>{themeName(theme.name)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: textSecondary }]}>
        Se aplica al instante y se guarda para tu perfil en este dispositivo.
      </Text>

      <Text style={[styles.sectionTitle, { color: textPrimary }]}>Apariencia</Text>
      <Text style={[styles.description, { color: textSecondary }]}>
        Cambia entre fondo claro y oscuro. Se recuerda en este dispositivo.
      </Text>
      <View style={styles.appearanceRow} accessibilityLabel="Tema de la aplicación">
        {appearanceOptions.map((option) => {
          const isSelected = scheme === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityLabel={`Tema ${option.label}`}
              accessibilityState={{ checked: isSelected }}
              onPress={() => setScheme(option.id)}
              style={({ pressed }) => [
                styles.appearanceOption,
                {
                  borderColor: isSelected ? accentColor : borderColor,
                  backgroundColor: isSelected ? `${accentColor}18` : "transparent",
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name={option.icon} size={20} color={textPrimary} />
              <Text style={[styles.appearanceLabel, { color: textPrimary }]}>{option.label}</Text>
              {isSelected && <Ionicons name="checkmark-circle" size={18} color={accentColor} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  preview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 16, overflow: "hidden" },
  previewScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.20)" },
  previewIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  previewText: { flex: 1 },
  previewCaption: { color: "rgba(255,255,255,0.95)", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  previewName: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  option: { width: "48%", flexDirection: "row", alignItems: "center", gap: 10, padding: 10, minHeight: 58, borderRadius: 16, borderWidth: 2 },
  swatch: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionName: { flex: 1, fontSize: 13, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 24, marginBottom: 6 },
  appearanceRow: { flexDirection: "row", gap: 10 },
  appearanceOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 12,
  },
  appearanceLabel: { fontSize: 14, fontWeight: "700" },
});
