import { Pressable, Text, View } from "react-native";
import { styles } from "../ServiceModal.styles";

interface ServiceModalActionsProps {
  accentColor: string;
  textSecondary: string;
  onClose: () => void;
  onApprove: () => void;
}

export function ServiceModalActions({
  accentColor,
  textSecondary,
  onClose,
  onApprove,
}: ServiceModalActionsProps) {
  return (
    <View style={styles.modalActionsRow}>
      <Pressable
        style={[
          styles.modalBtnAction,
          {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: accentColor,
          },
        ]}
        onPress={onClose}
      >
        <Text style={[styles.modalBtnActionText, { color: textSecondary }]}>
          Cerrar
        </Text>
      </Pressable>
      <Pressable
        style={[styles.modalBtnAction, { backgroundColor: accentColor }]}
        onPress={onApprove}
      >
        <Text style={[styles.modalBtnActionText, { color: "#FFFFFF" }]}>
          Aprobar Ahora
        </Text>
      </Pressable>
    </View>
  );
}
