import { StyleSheet, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { PremiumProfileView } from "@/components/shared/PremiumProfileView";

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProfileEditModal({
  visible,
  onClose,
}: ProfileEditModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <PremiumProfileView
          onClose={onClose}
          roleLabel="Configuración de Perfil"
          avatarEmoji="⚙️"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
