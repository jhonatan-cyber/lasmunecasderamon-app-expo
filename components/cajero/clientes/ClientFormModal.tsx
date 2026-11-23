import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Client } from '@/hooks/useClientes';
import { useAccentColor } from '@/hooks/useAccentColor';

interface ClientFormModalProps {
    visible: boolean;
    editingClient: Client | null;
    isDark: boolean;
    insets: { bottom: number };
    formName: string;
    setFormName: (text: string) => void;
    formLastName: string;
    setFormLastName: (text: string) => void;
    formRun: string;
    setFormRun: (text: string) => void;
    formPhone: string;
    setFormPhone: (text: string) => void;
    accentColor: string;
    submitting: boolean;
    handleSaveClient: () => Promise<void>;
    onClose: () => void;
}

export function ClientFormModal({
    visible,
    editingClient,
    isDark,
    insets,
    formName,
    setFormName,
    formLastName,
    setFormLastName,
    formRun,
    setFormRun,
    formPhone,
    setFormPhone,
    accentColor,
    submitting,
    handleSaveClient,
    onClose
}: ClientFormModalProps) {
    const { cardBg, textPrimary, textSecondary, borderColor, surfaceMuted, accentText } = useAccentColor();
    return (
        <Modal visible={visible} avoidKeyboard={false} animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
                <View style={[styles.modalContent, {
                    backgroundColor: cardBg,
                    paddingBottom: Math.max(insets.bottom, 20) + 10
                }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>
                            {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                        </Text>
                        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar formulario de cliente">
                            <Ionicons name="close" size={26} color={textPrimary} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: textSecondary }]}>
                                NOMBRE <Text style={{ color: textSecondary }}>(Requerido)</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, { color: textPrimary, borderColor, backgroundColor: surfaceMuted }]}
                                value={formName}
                                onChangeText={setFormName}
                                placeholder="Ej: Juan"
                                placeholderTextColor={textSecondary}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: textSecondary }]}>
                                APELLIDO <Text style={{ color: textSecondary }}>(Requerido)</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, { color: textPrimary, borderColor, backgroundColor: surfaceMuted }]}
                                value={formLastName}
                                onChangeText={setFormLastName}
                                placeholder="Ej: Pérez"
                                placeholderTextColor={textSecondary}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: textSecondary }]}>
                                RUT <Text style={{ color: textSecondary }}>(Opcional)</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, { color: textPrimary, borderColor, backgroundColor: surfaceMuted }]}
                                value={formRun}
                                onChangeText={setFormRun}
                                placeholder="Ej: 12.345.678-9"
                                placeholderTextColor={textSecondary}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: textSecondary }]}>
                                TELÉFONO <Text style={{ color: textSecondary }}>(Opcional)</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, { color: textPrimary, borderColor, backgroundColor: surfaceMuted }]}
                                value={formPhone}
                                onChangeText={setFormPhone}
                                placeholder="Ej: +569 1234 5678"
                                placeholderTextColor={textSecondary}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: accentColor }, submitting && { opacity: 0.7 }]}
                        onPress={handleSaveClient}
                        disabled={submitting}
                    >
                        {submitting ? <ActivityIndicator color={accentText} /> : (
                            <Text style={[styles.saveBtnText, { color: accentText }]}>{editingClient ? "ACTUALIZAR" : "CREAR CLIENTE"}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end' 
    },
    modalContent: { 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        padding: 24, 
        maxHeight: '90%' 
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 25 
    },
    modalTitle: {
        fontSize: 22,
        fontFamily: FontFamily.black
    },
    formGroup: {
        marginBottom: 15
    },
    formLabel: {
        fontSize: 11,
        fontFamily: FontFamily.black,
        letterSpacing: 1,
        marginBottom: 8
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 15,
        fontSize: 14,
        fontFamily: FontFamily.bold,
        backgroundColor: 'rgba(155,155,155,0.03)'
    },
    saveBtn: {
        height: 56,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    saveBtnText: {
        fontSize: 15,
        fontFamily: FontFamily.black,
        letterSpacing: 1
    },
});
