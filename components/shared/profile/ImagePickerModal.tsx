import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  visible: boolean;
  accentColor: string;
  textPrimary: string;
  cardBg: string;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onClose: () => void;
}

export function ImagePickerModal({ visible, accentColor, textPrimary, cardBg, onTakePhoto, onPickImage, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
          <Text style={[styles.modalTitle, { color: textPrimary }]}>Elegir Foto</Text>
          <Pressable style={styles.modalOption} onPress={onTakePhoto}>
            <Ionicons name="camera-outline" size={24} color={accentColor} />
            <Text style={[styles.modalOptionText, { color: textPrimary }]}>Cámara</Text>
          </Pressable>
          <Pressable style={styles.modalOption} onPress={onPickImage}>
            <Ionicons name="image-outline" size={24} color={accentColor} />
            <Text style={[styles.modalOptionText, { color: textPrimary }]}>Galería</Text>
          </Pressable>
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
  modalOption: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#37415120" },
  modalOptionText: { fontSize: 16, fontWeight: "600", marginLeft: 12 },
  cancelModalBtn: { marginTop: 20, padding: 12, borderWidth: 1, borderColor: "#EF4444", borderRadius: 18 },
  cancelModalBtnText: { fontSize: 16, fontWeight: "800", textAlign: "center" },
});
