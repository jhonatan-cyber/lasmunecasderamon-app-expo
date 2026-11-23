import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";
import { accentTextColor } from "@/utils/color";

interface ProfileActionsProps {
  saving: boolean;
  accentColor: string;
  onSave: () => void;
  onLogout: () => void;
}

export function ProfileActions({
  saving,
  accentColor,
  onSave,
  onLogout,
}: ProfileActionsProps) {
  const accentText = accentTextColor(accentColor);

  return (
    <View style={styles.actionContainer}>
      <Pressable
        style={[
          styles.saveBtn,
          { backgroundColor: accentColor },
          saving && { opacity: 0.7 },
        ]}
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Guardar cambios del perfil"
      >
        {saving ? (
          <ActivityIndicator color={accentText} />
        ) : (
          <Text style={[styles.saveBtnText, { color: accentText }]}>Guardar Cambios</Text>
        )}
      </Pressable>

      <Pressable style={styles.logoutBtn} onPress={onLogout} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
        <Ionicons name="log-out-outline" size={20} color={accentColor} />
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </Pressable>
    </View>
  );
}
