import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from 'react-native';

interface Hostess {
    id: number | string;
    id_usuario?: number | string;
    nick: string;
}

interface HostessSelectModalProps {
    visible: boolean;
    onClose: () => void;
    onToggle: (id: number) => void;
    hostesses: Hostess[];
    selectedIds: number[];
    max?: number;
    title?: string;
}

export const HostessSelectModal: React.FC<HostessSelectModalProps> = ({
    visible,
    onClose,
    onToggle,
    hostesses,
    selectedIds,
    max,
    title = 'Seleccionar Anfitrionas',
}) => {
    const isDark = useColorScheme() === 'dark';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>{title}</Text>
                            {max !== undefined && (
                                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                                    Máximo {max} seleccionadas
                                </Text>
                            )}
                        </View>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={24} color={textPrimary} />
                        </Pressable>
                    </View>
                    <FlatList
                        data={hostesses}
                        keyExtractor={(item) => (item.id_usuario || item.id).toString()}
                        renderItem={({ item }) => {
                            const id = Number(item.id_usuario || item.id);
                            const isSelected = selectedIds.includes(id);
                            return (
                                <TouchableOpacity
                                    style={[styles.listItem, { borderBottomColor: borderColor }]}
                                    onPress={() => onToggle(id)}
                                >
                                    <View style={[styles.avatar, { backgroundColor: '#8B5CF6' }]}>
                                        <Text style={styles.avatarText}>{(item.nick || 'A')[0].toUpperCase()}</Text>
                                    </View>
                                    <Text style={[styles.listItemTitle, { color: textPrimary, marginLeft: 16, flex: 1 }]}>
                                        {item.nick}
                                    </Text>
                                    <View
                                        style={[
                                            styles.checkbox,
                                            {
                                                borderColor: isSelected ? '#10B981' : borderColor,
                                                backgroundColor: isSelected ? '#10B981' : 'transparent',
                                            },
                                        ]}
                                    >
                                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                    <Pressable style={styles.modalActionBtn} onPress={onClose}>
                        <Text style={styles.modalActionBtnText}>Confirmar</Text>
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
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 18,
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: '800',
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
        backgroundColor: '#8B5CF6',
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
