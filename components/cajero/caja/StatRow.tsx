import { StyleSheet, Text, View } from 'react-native';

interface StatRowProps {
    label: string;
    value: number;
    accent?: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
}

export function StatRow({
    label,
    value,
    accent,
    textPrimary,
    textSecondary,
    borderColor
}: StatRowProps) {
    return (
        <View style={[styles.statRow, { borderBottomColor: borderColor }]}>
            <Text style={[styles.statRowLabel, { color: textSecondary }]}>{label}</Text>
            <Text style={[styles.statRowValue, { color: accent ?? textPrimary }]}>
                ${value.toLocaleString()}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 11,
        borderBottomWidth: 1
    },
    statRowLabel: {
        fontSize: 14,
        fontWeight: '500'
    },
    statRowValue: {
        fontSize: 15,
        fontWeight: '800'
    },
});
