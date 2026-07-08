import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertConfig } from '@/hooks/useLogin';

interface Props {
    config: AlertConfig;
    isDark: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function PremiumAlertModal({ config, isDark, onClose, onConfirm }: Props) {
    if (!config.visible) return null;

    const iconName = config.type === 'danger' ? 'alert-circle' :
        config.type === 'success' ? 'checkmark-circle' :
            config.type === 'warning' ? 'warning' : 'information-circle';

    const iconColor = config.type === 'danger' ? '#EF4444' :
        config.type === 'success' ? '#10B981' :
            config.type === 'warning' ? '#F59E0B' : '#E11D48';

    const iconBg = config.type === 'danger' ? '#EF444420' :
        config.type === 'success' ? '#10B98120' :
            config.type === 'warning' ? '#F59E0B20' : '#E11D4820';

    return (
        <Modal
            transparent
            visible={config.visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.alertCard, { backgroundColor: isDark ? '#111111' : '#FFFFFF' }]}>
                    <View style={[styles.alertIconHeader, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={40} color={iconColor} />
                    </View>

                    <Text style={[styles.alertTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        {config.title}
                    </Text>
                    <Text style={[styles.alertMessage, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        {config.message}
                    </Text>

                    <View style={styles.alertActions}>
                        {config.showCancel && (
                            <Pressable
                                onPress={onClose}
                                style={[styles.alertBtn, { backgroundColor: isDark ? '#333' : '#E5E7EB', flex: 1 }]}
                            >
                                <Text style={[styles.alertBtnText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                                    Cancelar
                                </Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={onConfirm}
                            style={[styles.alertBtn, {
                                backgroundColor: config.type === 'danger' ? '#EF4444' : '#E11D48',
                                flex: config.showCancel ? 1 : 0,
                                minWidth: config.showCancel ? 0 : 120
                            }]}
                        >
                            <Text style={[styles.alertBtnText, { color: '#FFF' }]}>
                                {config.type === 'danger' ? 'Confirmar' : 'Aceptar'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertCard: {
        width: '85%',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    alertIconHeader: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 10,
    },
    alertMessage: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    alertActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center',
    },
    alertBtn: {
        height: 54,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    alertBtnText: {
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
    },
});
