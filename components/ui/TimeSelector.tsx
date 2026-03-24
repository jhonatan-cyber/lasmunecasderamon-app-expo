import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

interface TimeSelectorProps {
    value: number;
    onChange: (value: number) => void;
    step?: number;
    min?: number;
    max?: number;
    label?: string;
}

export const TimeSelector: React.FC<TimeSelectorProps> = ({
    value,
    onChange,
    step = 5,
    min = 0,
    max = 999,
    label = "Tiempo (minutos)"
}) => {
    const { accentColor, textPrimary, textSecondary, borderColor, isDark } = useAccentColor();
    const cardBg = isDark ? '#1F2937' : '#F9FAFB';

    const handleIncrement = () => {
        if (value + step <= max) {
            onChange(value + step);
        }
    };

    const handleDecrement = () => {
        if (value - step >= min) {
            onChange(value - step);
        }
    };

    return (
        <View style={styles.container}>
            {label ? <Text style={[styles.label, { color: textSecondary }]}>{label.toUpperCase()}</Text> : null}
            <View style={[styles.selectorWrapper, { borderColor, backgroundColor: cardBg }]}>
                <Pressable
                    onPress={handleDecrement}
                    style={({ pressed }) => [
                        styles.btn,
                        { borderColor },
                        pressed && { backgroundColor: 'rgba(0,0,0,0.05)' }
                    ]}
                >
                    <Ionicons name="remove" size={20} color={accentColor} />
                </Pressable>

                <View style={styles.valueContainer}>
                    <Ionicons name="time-outline" size={20} color={textSecondary} style={styles.timeIcon} />
                    <Text style={[styles.valueText, { color: textPrimary }]}>
                        {value} <Text style={{ fontSize: 14, fontWeight: '600', color: textSecondary }}>min</Text>
                    </Text>
                </View>

                <Pressable
                    onPress={handleIncrement}
                    style={({ pressed }) => [
                        styles.btn,
                        { borderColor },
                        pressed && { backgroundColor: 'rgba(0,0,0,0.05)' }
                    ]}
                >
                    <Ionicons name="add" size={20} color={accentColor} />
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 1,
    },
    selectorWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        height: 58,
        overflow: 'hidden',
    },
    btn: {
        width: 58,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 0,
        borderLeftWidth: 0,
    },
    valueContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(156, 163, 175, 0.1)',
    },
    timeIcon: {
        marginRight: 8,
    },
    valueText: {
        fontSize: 18,
        fontWeight: '900',
    },
});


