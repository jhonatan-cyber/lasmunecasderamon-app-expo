import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { BorderRadius } from '@/constants/spacing';

interface MetricCardProps {
    label: string;
    value: number | string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    isDark: boolean;
    cardBg: string;
    borderColor: string;
    subtitle?: string;
    index?: number;
}

export function MetricCard({
    label,
    value,
    icon,
    color,
    bgColor,
    isDark,
    cardBg,
    borderColor,
    subtitle,
    index = 0
}: MetricCardProps) {
    const displayValue = typeof value === 'number' ? `$${value.toLocaleString()}` : value;

    // Glow neón en modo oscuro con el color de la métrica
    const neonGlow = isDark ? {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        borderColor: color,
        borderWidth: 1.5,
    } : {};

    const staggerDelay = Math.min(index, 5) * 80;

    return (
        <AnimatedView
            from={{ opacity: 0, translateY: 15 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: staggerDelay }}
        >
            <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor }, neonGlow]}>
                <View style={[styles.metricIconBox, { backgroundColor: bgColor }]}>
                    <Ionicons name={icon} size={18} color={color} />
                </View>
                <Text style={[styles.metricLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>{label}</Text>
                <Text style={[styles.metricValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>
                    {displayValue}
                </Text>
                {subtitle && (
                    <Text style={[styles.metricSubtitle, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>{subtitle}</Text>
                )}
            </View>
        </AnimatedView>
    );
}

const styles = StyleSheet.create({
    metricCard: {
        flex: 1,
        minWidth: '44%',
        borderRadius: BorderRadius.card,
        borderWidth: 1,
        padding: 14,
        gap: 4,
        overflow: 'hidden',
    },
    metricIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    metricSubtitle: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2
    },
});
