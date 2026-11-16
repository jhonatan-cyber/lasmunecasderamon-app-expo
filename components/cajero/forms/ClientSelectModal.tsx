import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
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
    const { accentColor: primaryColor, borderColor, textPrimary, textSecondary } = useAccentColor();

    return (
        <ModalBottomSheet
            visible={visible}
            onClose={onClose}
            title="Clientes"
            subtitle={max !== undefined ? `Máximo ${max} seleccionados` : undefined}
            actionLabel="Listo"
            onAction={onClose}
        >
            {clients.map((item) => {
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
});


