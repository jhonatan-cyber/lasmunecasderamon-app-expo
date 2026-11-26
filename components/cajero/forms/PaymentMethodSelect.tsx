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

import type { PaymentMethod } from '@/types/payment';
import {
    PAYMENT_METHOD_LABELS,
    paymentIconFor,
} from '@/components/ui/StatusBadge';

export type { PaymentMethod };

/** Mapas canónicos en `ui/StatusBadge`; se re-exportan para no romper imports. */
export {
    PAYMENT_METHOD_LABELS,
    paymentIconFor,
} from '@/components/ui/StatusBadge';

interface PaymentMethodSelectProps {
    selectedMethod: PaymentMethod | '';
    onSelect: (method: PaymentMethod) => void;
    showPrepago?: boolean;
    showMixto?: boolean;
    /** Lista explícita de métodos. Tiene prioridad sobre `showPrepago`/`showMixto`. */
    methods?: PaymentMethod[];
    showLabel?: boolean;
    /** Texto de la etiqueta. Por defecto "MÉTODO DE PAGO". */
    label?: string;
    /**
     * `grid`: dos columnas para formularios (por defecto).
     * `compact`: una fila de chips para barras, modales y carritos.
     * En ambos casos se usan los mismos colores, bordes y radio: cambia el tamaño, no el diseño.
     */
    variant?: 'grid' | 'compact';
    disabled?: boolean;
    disabledMethods?: PaymentMethod[];
    /** Permite adaptar el texto visible (p. ej. a MAYÚSCULAS) sin cambiar el valor. */
    formatLabel?: (method: PaymentMethod, label: string) => string;
    /** Permite adaptar la etiqueta accesible (p. ej. "Pago efectivo"). */
    getAccessibilityLabel?: (method: PaymentMethod, label: string) => string;
}

export const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
    selectedMethod,
    onSelect,
    showPrepago = false,
    showMixto = false,
    methods,
    showLabel = true,
    label = 'MÉTODO DE PAGO',
    variant = 'grid',
    disabled = false,
    disabledMethods = [],
    formatLabel,
    getAccessibilityLabel,
}) => {
    const {
        accentColor,
        accentText,
        accentOnSurface,
        borderColor,
        surfaceMuted,
        textSecondary,
    } = useAccentColor();

    const availableMethods: PaymentMethod[] = methods ?? [
        'efectivo',
        'tarjeta',
        'transferencia',
        ...(showPrepago ? (['prepago'] as PaymentMethod[]) : []),
        ...(showMixto ? (['mixto'] as PaymentMethod[]) : []),
    ];

    const isCompact = variant === 'compact';
    const textOf = (method: PaymentMethod) =>
        formatLabel
            ? formatLabel(method, PAYMENT_METHOD_LABELS[method])
            : PAYMENT_METHOD_LABELS[method];

    return (
        <View style={[
            styles.container,
            !showLabel && { marginTop: 0 },
            disabled && { opacity: 0.5, pointerEvents: 'none' as const },
            !disabled && { pointerEvents: 'auto' as const },
        ]}>
            {showLabel && (
                <Text style={[styles.label, { color: textSecondary }]}>
                    {label}
                </Text>
            )}
            <View style={[styles.row, isCompact && styles.rowCompact]}>
                {availableMethods.map((method) => {
                    const isSelected = selectedMethod === method;
                    const isMethodDisabled = disabled || disabledMethods.includes(method);
                    const visibleLabel = textOf(method);
                    const accessibilityLabel = getAccessibilityLabel
                        ? getAccessibilityLabel(method, visibleLabel)
                        : `Pagar con ${visibleLabel}`;

                    return (
                        <Pressable
                            key={method}
                            style={[
                                isCompact ? styles.methodChip : styles.methodBtn,
                                {
                                    backgroundColor: isSelected ? accentColor : surfaceMuted,
                                    borderColor: isSelected ? accentColor : borderColor,
                                    borderWidth: isSelected ? 1.5 : 1,
                                },
                                isMethodDisabled && { opacity: 0.4 },
                            ]}
                            onPress={() => {
                                if (!isMethodDisabled) {
                                    haptic.select();
                                    onSelect(method);
                                }
                            }}
                            disabled={isMethodDisabled}
                            accessibilityRole="button"
                            accessibilityLabel={accessibilityLabel}
                            accessibilityState={{ selected: isSelected, disabled: isMethodDisabled }}
                        >
                            <Ionicons
                                name={paymentIconFor(method)}
                                size={isCompact ? 16 : 20}
                                color={isSelected ? accentText : accentOnSurface}
                            />
                            <Text
                                style={[
                                    isCompact ? styles.methodChipText : styles.methodText,
                                    { color: isSelected ? accentText : accentOnSurface },
                                    isSelected && styles.methodTextSelected,
                                ]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                            >
                                {visibleLabel}
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
    rowCompact: {
        flexWrap: 'nowrap',
        gap: 6,
    },
    methodBtn: {
        width: '47%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 52,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: BorderRadius.card,
        borderWidth: 1.5,
    },
    methodChip: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        minHeight: 44,
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: BorderRadius.card,
        borderWidth: 1,
    },
    methodText: {
        fontSize: 13,
        fontFamily: FontFamily.bold,
        textAlign: 'center',
    },
    methodChipText: {
        flexShrink: 1,
        minWidth: 0,
        fontSize: 12,
        fontFamily: FontFamily.bold,
        textAlign: 'center',
    },
    methodTextSelected: {
        fontFamily: FontFamily.black,
    },
});
