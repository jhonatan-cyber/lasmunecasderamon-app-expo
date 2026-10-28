import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";

export const ESTADO_CIVIL_OPTIONS = [
  "Soltero/a",
  "Casado/a",
  "Unión Libre",
  "Divorciado/a",
  "Viudo/a",
  "Separado/a",
];

interface CivilStatusModalProps {
  visible: boolean;
  selected: string;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function CivilStatusModal({
  visible,
  selected,
  accentColor,
  cardBg,
  textPrimary,
  onSelect,
  onClose,
}: CivilStatusModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
          <Text style={[styles.modalTitle, { color: textPrimary }]}>
            Estado Civil
          </Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {ESTADO_CIVIL_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={styles.modalOption}
                onPress={() => {
                  onSelect(opt);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    {
                      color: textPrimary,
                      fontWeight: selected === opt ? "800" : "400",
                    },
                  ]}
                >
                  {opt}
                </Text>
                {selected === opt && (
                  <Ionicons name="checkmark" size={20} color={accentColor} />
                )}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.cancelModalBtn} onPress={onClose}>
            <Text style={[styles.cancelModalBtnText, { color: "#EF4444" }]}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
