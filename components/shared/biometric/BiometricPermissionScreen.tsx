import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
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
        <Modal visible={visible} animationType="slide" transparent>
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
                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                            onPress={onRequestPermission}
                        >
                            <Text style={styles.primaryBtnText}>Conceder permiso</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.permissionHint}>
                            El permiso está bloqueado. Activalo desde Ajustes del teléfono.
                        </Text>
                    )}
                    <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
                        <Text style={styles.ghostBtnText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
