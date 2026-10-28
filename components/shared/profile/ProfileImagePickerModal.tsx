import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, Text, View } from "react-native";
import { styles } from "../PremiumProfileView.styles";

interface ProfileImagePickerModalProps {
  visible: boolean;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onClose: () => void;
}

export function ProfileImagePickerModal({
  visible,
  accentColor,
  cardBg,
  textPrimary,
  onTakePhoto,
  onPickImage,
  onClose,
}: ProfileImagePickerModalProps) {
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
            Elegir Foto
          </Text>
          <Pressable style={styles.modalOption} onPress={onTakePhoto}>
            <Ionicons name="camera-outline" size={24} color={accentColor} />
            <Text style={[styles.modalOptionText, { color: textPrimary }]}>
              Cámara
            </Text>
          </Pressable>
          <Pressable style={styles.modalOption} onPress={onPickImage}>
            <Ionicons name="image-outline" size={24} color={accentColor} />
            <Text style={[styles.modalOptionText, { color: textPrimary }]}>
              Galería
            </Text>
          </Pressable>
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
