import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAccentColor } from '../../../hooks/useAccentColor';

interface Client {
    id: number | string;
    id_cliente?: number | string;
    nombre?: string;
    apellido?: string;
    name?: string;
    last_name?: string;
}

interface ClientSelectModalProps {
    visible: boolean;
    onClose: () => void;
    onToggle: (id: string) => void;
    clients: Client[];
    selectedIds: string[];
    max?: number;
}

export const ClientSelectModal: React.FC<ClientSelectModalProps> = ({
    visible,
    onClose,
    onToggle,
    clients,
    selectedIds,
    max,
}) => {
    const { accentColor, isDark, cardBg, borderColor } = useAccentColor();
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const primaryColor = accentColor;

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
                    <FlatList
                        data={clients}
                        keyExtractor={(item) => (item.id_cliente || item.id).toString()}
                        renderItem={({ item }) => {
                            const id = String(item.id_cliente || item.id);
                            const isSelected = selectedIds.includes(id);

                            // Support both naming conventions from API
                            const firstName = item.nombre || item.name || '';
                            const lastName = item.apellido || item.last_name || '';
                            const fullName = `${firstName} ${lastName}`.trim() || 'Cliente sin nombre';

                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.listItem,
                                        {
                                            borderColor: isSelected ? primaryColor : borderColor,
                                            backgroundColor: isSelected ? `${primaryColor}15` : 'transparent',
                                        },
                                    ]}
                                    onPress={() => onToggle(id)}
                                >
                                    <Ionicons
                                        name="person-outline"
                                        size={20}
                                        color={isSelected ? primaryColor : textSecondary}
                                        style={{ marginRight: 12 }}
                                    />
                                    <Text style={[styles.listItemTitle, { color: textPrimary, flex: 1 }]}>
                                        {fullName}
                                    </Text>
                                    <View style={[
                                        styles.checkbox,
                                        {
                                            borderColor: isSelected ? primaryColor : borderColor,
                                            backgroundColor: isSelected ? primaryColor : 'transparent',
                                        },
                                    ]}>
                                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                    <Pressable 
                        style={[styles.modalActionBtn, { backgroundColor: primaryColor }]} 
                        onPress={onClose}
                    >
                        <Text style={styles.modalActionBtnText}>Confirmar Selección</Text>
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
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        height: '80%',
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
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderRadius: 16,
        marginBottom: 10,
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalActionBtn: {
        height: 50,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    modalActionBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
