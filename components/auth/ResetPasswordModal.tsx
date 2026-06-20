import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { Colors } from '@/constants/theme';

interface Props {
    visible: boolean;
    loading: boolean;
    resetRun: string;
    onChangeResetRun: (value: string) => void;
    isDark: boolean;
    onClose: () => void;
    onReset: () => void;
}

export default function ResetPasswordModal({
    visible,
    loading,
    resetRun,
    onChangeResetRun,
    isDark,
    onClose,
    onReset,
}: Props) {
    const C = isDark ? Colors.dark : Colors.light;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.alertCard, { backgroundColor: isDark ? '#111111' : '#FFFFFF' }]}>
                    <Text style={[styles.alertTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                        Resetear Contraseña
                    </Text>
                    <Text style={[styles.alertMessage, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                        Ingresa tu RUN para validar el reseteo. La nueva contraseña será ese mismo RUN.
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            styles.resetInput,
                            {
                                backgroundColor: isDark ? C.card : '#F3F4F6',
                                color: isDark ? '#FFFFFF' : '#111827',
                                borderColor: C.border,
                            },
                        ]}
                        placeholder="Ingresa tu RUN"
                        placeholderTextColor={C.textMuted}
                        autoCapitalize="characters"
                        value={resetRun}
                        onChangeText={onChangeResetRun}
                    />
                    <View style={styles.alertActions}>
                        <Pressable
                            onPress={onClose}
                            style={[styles.alertBtn, { backgroundColor: isDark ? '#333' : '#E5E7EB', flex: 1 }]}
                        >
                            <Text style={[styles.alertBtnText, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                                Cancelar
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={onReset}
                            style={[styles.alertBtn, { backgroundColor: '#E11D48', flex: 1 }]}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={[styles.alertBtnText, { color: '#FFF' }]}>Aceptar</Text>
                            )}
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
    input: {
        height: 60,
        borderRadius: 20,
        paddingHorizontal: 24,
        fontSize: 16,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 2,
    },
    resetInput: {
        width: '100%',
        marginBottom: 20,
    },
});
