import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

interface Client {
    id: number | string;
    id_cliente?: number | string;
    nombre?: string;
    apellido?: string;
    name?: string;
    lastName?: string;
    last_name?: string;
    saldo?: number;
    deuda?: number;
}

interface ClientSelectModalProps {
    visible: boolean;
    onClose: () => void;
    onToggle: (id: string | number) => void;
    onLoadBalance?: (client: Client) => void;
    clients: Client[];
    selectedIds: (string | number)[];
    max?: number;
}

export const ClientSelectModal: React.FC<ClientSelectModalProps> = ({
    visible,
    onClose,
    onToggle,
    onLoadBalance,
    clients,
    selectedIds,
    max,
}) => {
    const { accentColor: primaryColor, isDark, cardBg, borderColor, textPrimary, textSecondary } = useAccentColor();

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Clientes</Text>
                            {max !== undefined && (
                                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                                    Máximo {max} seleccionados
                                </Text>
                            )}
                        </View>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={24} color={textPrimary} />
                        </Pressable>
                    </View>
                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                        {clients.map((item) => {
                            const rawId = item.id_cliente || item.id;
                            const isSelected = selectedIds.some(sid => 
                                String(sid) === String(item.id_cliente) || 
                                (item.id !== undefined && String(sid) === String(item.id))
                            );

                            // Soporte para múltiples convenciones de nombres de la API (snake_case y CamelCase)
                            const firstName = item.nombre || item.name || '';
                            const lastName = item.apellido || item.lastName || item.last_name || '';
                            const fullName = `${firstName} ${lastName}`.trim() || 'Cliente sin nombre';
                            const saldo = item.saldo || 0;

                            return (
                                <Pressable
                                    key={(item.id_cliente || item.id).toString()}
                                    onPress={() => onToggle(rawId as any)}
                                    style={[
                                        styles.modalItem,
                                        {
                                            borderColor: isSelected ? primaryColor : borderColor,
                                            backgroundColor: isSelected ? `${primaryColor}15` : 'transparent',
                                            borderWidth: isSelected ? 2 : 1.5,
                                        },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.modalItemText, { color: textPrimary }]}>
                                            {fullName}
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 15, marginTop: 4 }}>
                                            <Text style={{ fontSize: 12, color: saldo > 0 ? '#10B981' : textSecondary, fontWeight: '800' }}>
                                                Saldo: <Text style={{ color: saldo > 0 ? '#10B981' : textPrimary }}>${Number(saldo).toLocaleString()}</Text>
                                            </Text>
                                            <Text style={{ fontSize: 12, color: (item.deuda || 0) > 0 ? '#EF4444' : textSecondary, fontWeight: '800' }}>
                                                Deuda: <Text style={{ color: (item.deuda || 0) > 0 ? '#EF4444' : textPrimary }}>${Number(item.deuda || 0).toLocaleString()}</Text>
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        {onLoadBalance && (
                                            <TouchableOpacity 
                                                onPress={() => onLoadBalance(item)}
                                                style={{ backgroundColor: `${primaryColor}20`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}
                                            >
                                                <Text style={{ color: primaryColor, fontSize: 12, fontWeight: '900' }}>CARGAR</Text>
                                            </TouchableOpacity>
                                        )}
                                        {isSelected && <Ionicons name="checkmark" size={20} color={primaryColor} />}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                    <Pressable
                        style={[styles.modalActionBtn, { backgroundColor: primaryColor }]}
                        onPress={onClose}
                    >
                        <Text style={styles.modalActionBtnText}>Listo</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        height: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
    },
    modalSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        marginBottom: 10,
    },
    modalItemText: {
        fontSize: 16,
        fontWeight: '700',
    },
    modalActionBtn: {
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    modalActionBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
});


