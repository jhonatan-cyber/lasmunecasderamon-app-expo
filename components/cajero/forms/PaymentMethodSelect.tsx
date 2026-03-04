import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useAccentColor } from '../../../hooks/useAccentColor';

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

interface PaymentMethodSelectProps {
    selectedMethod: PaymentMethod;
    onSelect: (method: PaymentMethod) => void;
}

export const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
    selectedMethod,
    onSelect,
}) => {
    const { accentColor, isDark } = useAccentColor();
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const methods: { id: PaymentMethod; icon: any; label: string }[] = [
        { id: 'efectivo', icon: 'cash', label: 'Efectivo' },
        { id: 'tarjeta', icon: 'card', label: 'Tarjeta' },
        { id: 'transferencia', icon: 'swap-horizontal', label: 'Transferencia' },
    ];

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: textSecondary }]}>MÉTODO DE PAGO</Text>
            <View style={styles.row}>
                {methods.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                        <Pressable
                            key={method.id}
                            style={[
                                styles.card,
                                {
                                    borderColor,
                                    backgroundColor: isSelected ? `${accentColor}20` : 'transparent',
                                },
                                isSelected && { borderColor: accentColor },
                            ]}
                            onPress={() => onSelect(method.id)}
                        >
                            <Ionicons
                                name={method.icon}
                                size={18}
                                color={isSelected ? accentColor : textSecondary}
                            />
                            <Text
                                style={[
                                    styles.methodText,
                                    { color: isSelected ? accentColor : textSecondary },
                                ]}
                            >
                                {method.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 10,
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    card: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 2,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    methodText: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
});
