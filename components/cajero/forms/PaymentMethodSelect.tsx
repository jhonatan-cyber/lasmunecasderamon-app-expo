import Ionicons from '@expo/vector-icons/Ionicons';
import { BorderRadius } from '@/constants/spacing';
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
    const { accentColor, accentText, textSecondary } = useAccentColor();

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
            {showLabel && <Text style={[styles.label, { color: textSecondary }]}>MÉTODO DE PAGO</Text>}
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
                                    size={20}
                                    color={isSelected ? accentText : textSecondary}
                                />
                                <Text
                                    style={[
                                        styles.methodText,
                                        { color: isSelected ? accentText : textSecondary },
                                        isSelected && styles.methodTextSelected,
                                    ]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.7}
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
        marginTop: 16,
    },
    label: {
        fontSize: 13,
        fontFamily: FontFamily.bold,
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    methodBtn: {
        width: '47%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
    },
    methodText: {
        fontSize: 13,
        fontFamily: FontFamily.bold,
        textAlign: 'center',
    },
    methodTextSelected: {
        fontFamily: FontFamily.black,
    },
});


