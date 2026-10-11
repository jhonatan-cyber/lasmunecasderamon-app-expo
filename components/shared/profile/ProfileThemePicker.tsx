import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { THEME_OPTIONS, useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";

interface Props {
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export function ProfileThemePicker({ accentColor, textPrimary, textSecondary, borderColor }: Props) {
  const setAccentColor = useThemeStore((state) => state.setAccentColor);
  const userId = useAuthStore((state) => state.user?.id);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  preview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18, borderRadius: 20, marginBottom: 16 },
  previewIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  previewText: { flex: 1 },
  previewCaption: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  previewName: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  option: { width: "48%", flexDirection: "row", alignItems: "center", gap: 10, padding: 10, minHeight: 58, borderRadius: 16, borderWidth: 2 },
  swatch: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionName: { flex: 1, fontSize: 13, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 14 },
});
