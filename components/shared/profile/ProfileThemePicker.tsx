import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { THEME_OPTIONS, useThemeStore } from "@/store/themeStore";
import { useAuthStore } from "@/store/authStore";

interface Props {
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export function ProfileThemePicker({ accentColor, textPrimary, textSecondary, borderColor }: Props) {
  const { setAccentColor } = useThemeStore();
  const user = useAuthStore((state) => state.user);

  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: textSecondary }]}>Apariencia del Sistema</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
        <View style={{ flexDirection: "row", gap: 12, paddingRight: 20 }}>
          {THEME_OPTIONS.map((theme) => {
            const isSelected = accentColor.toLowerCase() === theme.color.toLowerCase();
            return (
              <Pressable
                key={theme.color}
                onPress={() => { if (user?.id) setAccentColor(user.id, theme.color); }}
                style={[
                  styles.colorCircle,
                  { backgroundColor: theme.color },
                  isSelected && { borderWidth: 3, borderColor: textPrimary, transform: [{ scale: 1.15 }] },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={24} color="#FFF" />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "700", marginBottom: 8, marginLeft: 4 },
  colorCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
});
