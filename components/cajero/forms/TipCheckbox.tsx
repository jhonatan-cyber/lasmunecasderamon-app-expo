import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useConfigValue } from '@/hooks/useConfigValue';

interface TipCheckboxProps {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    tipAmount: number;
    label?: string;
}

export const TipCheckbox: React.FC<TipCheckboxProps> = ({
    enabled,
    onToggle,
    tipAmount,
    label
}) => {
    const { accentColor, isDark, textPrimary, textSecondary } = useAccentColor();
    const propinaPct = Number(useConfigValue('facturacion', 'propina_venta', '10'));
    const resolvedLabel = label || `Propina (${propinaPct}%)`;

    return (
        <Pressable
            style={[styles.container]}
            onPress={() => onToggle(!enabled)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: enabled }}
        >
            <View style={styles.leftContent}>
                <Ionicons
                    name={enabled ? "checkbox" : "square-outline"}
                    size={20}
                    color={enabled ? accentColor : textSecondary}
                    style={{ marginRight: 8 }}
                />
                <Text style={[styles.label, { color: textSecondary }]}>{resolvedLabel}</Text>
            </View>
            <Text style={[styles.val, { color: textPrimary }]}>${tipAmount.toLocaleString()}</Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    label: {
        fontSize: 14,
        fontWeight: '600'
    },
    val: {
        fontSize: 15,
        fontWeight: '800'
    }
});


