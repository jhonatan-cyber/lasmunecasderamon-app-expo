import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';

interface Props {
    visible: boolean;
    loading: boolean;
    resetRun: string;
    onChangeResetRun: (value: string) => void;
    isDark: boolean;
    accentColor: string;
    onClose: () => void;
    onReset: () => void;
}

export default function ResetPasswordModal({
    visible,
    loading,
    resetRun,
    onChangeResetRun,
    isDark,
    accentColor,
    onClose,
    onReset,
}: Props) {
    const {
        cardBg,
        textPrimary,
        textSecondary,
        borderColor,
        surfaceMuted,
        accentText,
    } = useAccentColor();

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.alertCard, { backgroundColor: cardBg }]}>
                    <Text style={[styles.alertTitle, { color: textPrimary }]}>
                        Restablecer contraseña
                    </Text>
                    <Text style={[styles.alertMessage, { color: textSecondary }]}>
                        Ingresa tu RUT registrado. Si tienes correo de recuperación configurado, recibirás una clave temporal por correo. Deberás cambiarla al iniciar sesión.
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            styles.resetInput,
                            {
                                backgroundColor: surfaceMuted,
                                color: textPrimary,
                                borderColor,
                            },
                        ]}
                        placeholder="Ingresa tu RUT"
                        placeholderTextColor={textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                        accessibilityLabel="RUT registrado"
                        value={resetRun}
                        onChangeText={onChangeResetRun}
                    />
                    <View style={styles.alertActions}>
                        <Pressable
                            onPress={onClose}
                            style={[styles.alertBtn, { backgroundColor: surfaceMuted, flex: 1 }]}
                        >
                            <Text style={[styles.alertBtnText, { color: textPrimary }]}>
                                Cancelar
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={onReset}
                            style={[styles.alertBtn, { backgroundColor: accentColor, flex: 1 }]}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={accentText} />
                            ) : (
                                <Text style={[styles.alertBtnText, { color: accentText }]}>Restablecer</Text>
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
        maxWidth: 480,
        borderRadius: BorderRadius.full,
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
        fontFamily: FontFamily.black,
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
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    alertBtnText: {
        fontSize: 14,
        fontFamily: FontFamily.extrabold,
        textAlign: 'center',
    },
    input: {
        height: 60,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 24,
        fontSize: 16,
        borderWidth: 2,
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
