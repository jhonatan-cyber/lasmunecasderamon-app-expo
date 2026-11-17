import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState, useMemo } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { ModalBottomSheet } from '@/components/ui/ModalBottomSheet';

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
    const { accentColor: primaryColor, borderColor, textPrimary, textSecondary, cardBg } = useAccentColor();
    const [searchText, setSearchText] = useState('');

    const filteredClients = useMemo(() => {
        if (!searchText.trim()) return clients;
        const search = searchText.toLowerCase().trim();
        return clients.filter((item) => {
            const firstName = (item.nombre || item.name || '').toLowerCase();
            const lastName = (item.apellido || item.lastName || item.last_name || '').toLowerCase();
            return firstName.includes(search) || lastName.includes(search);
        });
    }, [clients, searchText]);

    return (
        <ModalBottomSheet
            visible={visible}
            onClose={onClose}
            title="Clientes"
            actionLabel="Listo"
            onAction={onClose}
        >
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: textPrimary, backgroundColor: cardBg }]}
                    placeholder="Buscar cliente..."
                    placeholderTextColor={textSecondary}
                    value={searchText}
                    onChangeText={setSearchText}
                    autoCapitalize="words"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                    accessibilityLabel="Buscar cliente"
                />
                {searchText.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSearchText('')}
                        style={styles.clearButton}
                        accessibilityLabel="Limpiar búsqueda"
                        accessibilityRole="button"
                    >
                        <Ionicons name="close-circle" size={18} color={textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
            {filteredClients.length === 0 && searchText.trim() !== '' ? (
                <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={48} color={textSecondary} />
                    <Text style={[styles.emptyText, { color: textSecondary }]}>
                        No se encontraron clientes
                    </Text>
                </View>
            ) : (
                filteredClients.map((item) => {
                const rawId = item.id_cliente || item.id;
                const isSelected = selectedIds.some(sid =>
                    String(sid) === String(item.id_cliente) ||
                    (item.id !== undefined && String(sid) === String(item.id))
                );

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
            })
            )
            }
        </ModalBottomSheet>
    );
};

const styles = StyleSheet.create({
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        marginBottom: 10,
    },
    modalItemText: {
        fontSize: 16,
        fontWeight: '700',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
        gap: 8,
    },
    searchIcon: {
        marginRight: 2,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        fontSize: 15,
        borderRadius: 8,
    },
    clearButton: {
        padding: 4,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
    },
});


