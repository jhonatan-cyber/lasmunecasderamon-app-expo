import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import React, { useState, useMemo } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { ModalBottomSheet } from '@/components/ui/ModalBottomSheet';
import { SearchBar } from '@/components/ui/SearchBar';

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
    const { accentColor: primaryColor, borderColor, textPrimary, textSecondary, accentOnSurface } = useAccentColor();
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
            <SearchBar
                compact
                debounceMs={0}
                placeholder="Buscar cliente..."
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="words"
                accessibilityLabel="Buscar cliente"
            />
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
                                <Text style={{ fontSize: 12, color: saldo > 0 ? accentOnSurface : textSecondary, fontFamily: FontFamily.extrabold }}>
                                    Saldo: <Text style={{ color: saldo > 0 ? accentOnSurface : textPrimary }}>${Number(saldo).toLocaleString()}</Text>
                                </Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            {onLoadBalance && (
                                <Pressable
                                    onPress={() => onLoadBalance(item)}
                                    style={{ backgroundColor: `${primaryColor}20`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full }}
                                >
                                    {({ pressed }) => (
                                        <View style={{ opacity: pressed ? 0.6 : 1 }}>
                                            <Text style={{ color: primaryColor, fontSize: 12, fontFamily: FontFamily.black }}>CARGAR</Text>
                                        </View>
                                    )}
                                </Pressable>
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
        borderRadius: BorderRadius.card,
        borderWidth: 2,
        marginBottom: 10,
    },
    modalItemText: {
        fontSize: 16,
        fontFamily: FontFamily.bold,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: FontFamily.semibold,
    },
});


