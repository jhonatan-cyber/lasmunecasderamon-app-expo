import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { styles } from "../PremiumProfileView.styles";

interface ProfileImagePickerModalProps {
  visible: boolean;
  accentColor: string;
  accentOnSurface: string;
  cardBg: string;
  textPrimary: string;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onClose: () => void;
}

export function ProfileImagePickerModal({
  visible,
  accentColor,
  accentOnSurface,
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
        <View style={[styles.modalContent, { backgroundColor: cardBg, width: '92%', maxWidth: 480 }]} accessibilityViewIsModal>
          <Text maxFontSizeMultiplier={1.4} style={[styles.modalTitle, { color: textPrimary }]}>
            Elegir Foto
          </Text>
          <Pressable
            style={[styles.modalOption, { backgroundColor: cardBg }]}
            onPress={onTakePhoto}
            accessibilityRole="button"
            accessibilityLabel="Tomar foto con la cámara"
          >
            <Ionicons name="camera-outline" size={24} color={accentColor} />
            <Text maxFontSizeMultiplier={1.4} style={[styles.modalOptionText, { color: textPrimary }]}>
              Cámara
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modalOption, { backgroundColor: cardBg }]}
            onPress={onPickImage}
            accessibilityRole="button"
            accessibilityLabel="Elegir foto de la galería"
          >
            <Ionicons name="image-outline" size={24} color={accentColor} />
            <Text maxFontSizeMultiplier={1.4} style={[styles.modalOptionText, { color: textPrimary }]}>
              Galería
            </Text>
          </Pressable>
          <Pressable
            style={styles.cancelModalBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
          >
            <Text style={[styles.cancelModalBtnText, { color: accentOnSurface }]}>
              Cancelar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
