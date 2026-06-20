import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  saving: boolean;
  accentColor: string;
  onSave: () => void;
  onLogout: () => void;
}

export function ProfileActions({ saving, accentColor, onSave, onLogout }: Props) {
  return (
    <View style={{ marginTop: 10, gap: 16 }}>
      <Pressable style={[styles.saveBtn, { backgroundColor: accentColor }, saving && { opacity: 0.7 }]} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Cambios</Text>}
      </Pressable>
      <Pressable style={styles.logoutBtn} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  saveBtn: { height: 60, borderRadius: 20, justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderWidth: 1, borderColor: "#EF4444", borderRadius: 18, marginTop: 8 },
  logoutBtnText: { color: "#EF4444", fontSize: 15, fontWeight: "700", marginLeft: 8 },
});
