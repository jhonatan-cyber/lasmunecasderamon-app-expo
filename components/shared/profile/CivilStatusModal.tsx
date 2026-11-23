import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
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
        <View style={[styles.modalContent, { backgroundColor: cardBg, width: '92%', maxWidth: 480 }]} accessibilityViewIsModal>
          <Text maxFontSizeMultiplier={1.4} style={[styles.modalTitle, { color: textPrimary }]}>
            Estado Civil
          </Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {ESTADO_CIVIL_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={[styles.modalOption, { backgroundColor: cardBg }]}
                accessibilityRole="radio"
                accessibilityLabel={opt}
                accessibilityState={{ checked: selected === opt }}
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
          <Pressable style={styles.cancelModalBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancelar selección de estado civil">
            <Text style={[styles.cancelModalBtnText, { color: accentColor }]}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
