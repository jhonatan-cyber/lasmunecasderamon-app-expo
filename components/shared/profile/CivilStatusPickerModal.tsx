import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const ESTADO_CIVIL_OPTIONS = ["Soltero/a", "Casado/a", "Unión Libre", "Divorciado/a", "Viudo/a", "Separado/a"];

interface Props {
  visible: boolean;
  formData: any;
  updateField: (field: string, value: string) => void;
  accentColor: string;
  textPrimary: string;
  cardBg: string;
  onClose: () => void;
}

export function CivilStatusPickerModal({ visible, formData, updateField, accentColor, textPrimary, cardBg, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
          <Text style={[styles.modalTitle, { color: textPrimary }]}>Estado Civil</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {ESTADO_CIVIL_OPTIONS.map((opt) => (
              <Pressable key={opt} style={styles.modalOption} onPress={() => { updateField("estadoCivil", opt); onClose(); }}>
                <Text style={[styles.modalOptionText, { color: textPrimary, fontWeight: formData.estadoCivil === opt ? "800" : "400" }]}>
                  {opt}
                </Text>
                {formData.estadoCivil === opt && <Ionicons name="checkmark" size={20} color={accentColor} />}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.cancelModalBtn} onPress={onClose}>
            <Text style={[styles.cancelModalBtnText, { color: "#EF4444" }]}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 40 },
  modalContent: { width: "100%", borderRadius: 30, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 20, textAlign: "center" },
  modalOption: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#37415120", justifyContent: "space-between" },
  modalOptionText: { fontSize: 16, fontWeight: "600", marginLeft: 12 },
  cancelModalBtn: { marginTop: 20, padding: 12, borderWidth: 1, borderColor: "#EF4444", borderRadius: 18 },
  cancelModalBtnText: { fontSize: 16, fontWeight: "800", textAlign: "center" },
});
