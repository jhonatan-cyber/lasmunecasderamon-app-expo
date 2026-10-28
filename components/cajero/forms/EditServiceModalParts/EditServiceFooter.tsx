import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { styles } from "../EditServiceModal.styles";

interface EditServiceFooterProps {
  loading: boolean;
  disabled: boolean;
  accentColor: string;
  borderColor: string;
  textSecondary: string;
  onCancel: () => void;
  onSave: () => void;
}

export function EditServiceFooter({
  loading,
  disabled,
  accentColor,
  borderColor,
  textSecondary,
  onCancel,
  onSave,
}: EditServiceFooterProps) {
  return (
    <View style={styles.footer}>
      <Pressable
        style={[styles.btn, styles.cancelBtn, { borderColor }]}
        onPress={onCancel}
      >
        <Text style={[styles.btnText, { color: textSecondary }]}>CANCELAR</Text>
      </Pressable>
      <Pressable
        style={[
          styles.btn,
          styles.saveBtn,
          { backgroundColor: accentColor },
        ]}
        onPress={onSave}
        disabled={disabled}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={[styles.btnText, { color: "#FFF" }]}>
            INICIAR SERVICIO
          </Text>
        )}
      </Pressable>
    </View>
  );
}
