import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

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
    label = 'Propina (10%)'
}) => {
    const { accentColor, isDark } = useAccentColor();
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

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
                <Text style={[styles.label, { color: textSecondary }]}>{label}</Text>
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


