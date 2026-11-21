import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { haptic } from '@/utils/haptics';
import { FontFamily } from '@/constants/fonts';

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'prepago' | 'mixto';

interface PaymentMethodSelectProps {
    selectedMethod: PaymentMethod | '';
    onSelect: (method: PaymentMethod) => void;
    showPrepago?: boolean;
    showMixto?: boolean;
    disabled?: boolean;
    disabledMethods?: PaymentMethod[];
    showLabel?: boolean;
}

export const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
    selectedMethod,
    onSelect,
    showPrepago = false,
    showMixto = false,
    disabled = false,
    disabledMethods = [],
    showLabel = true,
}) => {
    const { accentColor, textSecondary, borderColor, cardBg } = useAccentColor();

    const methods: { id: PaymentMethod; icon: any; label: string }[] = [
        { id: 'efectivo', icon: 'cash', label: 'Efectivo' },
        { id: 'tarjeta', icon: 'card', label: 'Tarjeta' },
        { id: 'transferencia', icon: 'swap-horizontal', label: 'Transferencia' },
    ];

    if (showPrepago) {
        methods.push({ id: 'prepago', icon: 'wallet', label: 'Prepago' });
    }

    if (showMixto) {
        methods.push({ id: 'mixto', icon: 'shuffle', label: 'Mixto' });
    }

    return (
        <View style={[styles.container, disabled && { opacity: 0.5, pointerEvents: 'none' as const }, !disabled && { pointerEvents: 'auto' as const }]}>
            {showLabel && <Text style={[styles.label, { color: textSecondary }]}>MÉTODO DE PAGO (Requerido)</Text>}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.row}>
                    {methods.map((method) => {
                        const isSelected = selectedMethod === method.id;
                        const isMethodDisabled = disabled || disabledMethods.includes(method.id);
                        return (
                            <Pressable
                                key={method.id}
                                style={[
                                    styles.methodBtn,
                                    {
                                        backgroundColor: isSelected ? accentColor : 'transparent',
                                        borderColor: isSelected ? accentColor : 'transparent',
                                    },
                                    isMethodDisabled && { opacity: 0.3 },
                                ]}
                                onPress={() => {
                                    if (!isMethodDisabled) {
                                        haptic.select();
                                        onSelect(method.id);
                                    }
                                }}
                                disabled={isMethodDisabled}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected, disabled: isMethodDisabled }}
                            >
                                <Ionicons
                                    name={method.icon}
                                    size={18}
                                    color={isSelected ? '#FFF' : textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.methodText,
                                        { color: isSelected ? '#FFF' : textSecondary },
                                        isSelected && styles.methodTextSelected,
                                    ]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.65}
                                >
                                    {method.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
    },
    label: {
        fontSize: 12,
        fontFamily: FontFamily.bold,
        marginBottom: 10,
        letterSpacing: 1,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 6,
        gap: 0,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    methodBtn: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 12,
        borderWidth: 1.5,
    },
    methodText: {
        fontSize: 11,
        fontFamily: FontFamily.bold,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    methodTextSelected: {
        fontWeight: '900',
    },
});


