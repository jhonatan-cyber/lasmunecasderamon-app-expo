import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '@/hooks/useClientes';

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
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <View style={[styles.modalContent, {
                    backgroundColor: isDark ? "#111111" : "#FFFFFF",
                    paddingBottom: Math.max(insets.bottom, 20) + 10
                }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: isDark ? "#FFFFFF" : "#111827" }]}>
                            {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
                        </Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={26} color={isDark ? "#FFFFFF" : "#111827"} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>NOMBRE *</Text>
                            <TextInput
                                style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                value={formName}
                                onChangeText={setFormName}
                                placeholder="Ej: Juan"
                                placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>APELLIDO *</Text>
                            <TextInput
                                style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                value={formLastName}
                                onChangeText={setFormLastName}
                                placeholder="Ej: Pérez"
                                placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>RUN</Text>
                            <TextInput
                                style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                value={formRun}
                                onChangeText={setFormRun}
                                placeholder="Ej: 12.345.678-9"
                                placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={[styles.formLabel, { color: isDark ? "#9CA3AF" : "#6B7280" }]}>TELÉFONO</Text>
                            <TextInput
                                style={[styles.input, { color: isDark ? "#FFFFFF" : "#111827", borderColor: isDark ? "#374151" : "#E5E7EB" }]}
                                value={formPhone}
                                onChangeText={setFormPhone}
                                placeholder="Ej: +569 1234 5678"
                                placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: accentColor }, submitting && { opacity: 0.7 }]}
                        onPress={handleSaveClient}
                        disabled={submitting}
                    >
                        {submitting ? <ActivityIndicator color="#FFF" /> : (
                            <Text style={styles.saveBtnText}>{editingClient ? "ACTUALIZAR" : "CREAR CLIENTE"}</Text>
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
        fontWeight: '900' 
    },
    formGroup: { 
        marginBottom: 15 
    },
    formLabel: { 
        fontSize: 11, 
        fontWeight: '900', 
        letterSpacing: 1, 
        marginBottom: 8 
    },
    input: { 
        height: 50, 
        borderWidth: 1, 
        borderRadius: 14, 
        paddingHorizontal: 15, 
        fontSize: 14, 
        fontWeight: '700', 
        backgroundColor: 'rgba(155,155,155,0.03)' 
    },
    saveBtn: { 
        height: 56, 
        borderRadius: 18, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 10 
    },
    saveBtnText: { 
        color: '#FFF', 
        fontSize: 15, 
        fontWeight: '900', 
        letterSpacing: 1 
    },
});
