import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";

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
      >
        {saving ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.saveBtnText}>Guardar Cambios</Text>
        )}
      </Pressable>

      <Pressable style={styles.logoutBtn} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </Pressable>
    </View>
  );
}
