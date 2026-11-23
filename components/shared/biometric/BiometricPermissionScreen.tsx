import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { styles } from '../BiometricEnrollmentModal.styles';

interface BiometricPermissionScreenProps {
    visible: boolean;
    accentColor: string;
    canAskAgain: boolean;
    onRequestPermission: () => void;
    onClose: () => void;
}

export function BiometricPermissionScreen({
    visible,
    accentColor,
    canAskAgain,
    onRequestPermission,
    onClose,
}: BiometricPermissionScreenProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.permissionScreen}>
                <View style={styles.permissionCard}>
                    <View style={styles.permissionIcon}>
                        <Ionicons name="camera-reverse-outline" size={34} color="#FFF" />
                    </View>
                    <Text style={styles.permissionTitle}>Permiso de cámara</Text>
                    <Text style={styles.permissionText}>
                        Necesitamos la cámara frontal para tomar las tres fotos del
                        enrolamiento facial.
                    </Text>
                    {canAskAgain ? (
                        <Pressable
                            style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                            onPress={onRequestPermission}
                            accessibilityRole="button"
                            accessibilityLabel="Solicitar permiso de cámara"
                        >
                            {({ pressed }) => (
                                <View style={{ opacity: pressed ? 0.6 : 1 }}>
                                    <Text style={styles.primaryBtnText}>Conceder permiso</Text>
                                </View>
                            )}
                        </Pressable>
                    ) : (
                        <Text style={styles.permissionHint}>
                            El permiso está bloqueado. Activalo desde Ajustes del teléfono.
                        </Text>
                    )}
                    <Pressable style={styles.ghostBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar pantalla de permiso">
                        {({ pressed }) => (
                            <View style={{ opacity: pressed ? 0.6 : 1 }}>
                                <Text style={styles.ghostBtnText}>Cerrar</Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}
