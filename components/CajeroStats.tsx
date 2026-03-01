import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    isDark: boolean;
    borderColor: string;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
    index: number;
}

const StatCard = ({ label, value, icon, color, isDark, borderColor, cardBg, textPrimary, textSecondary, index }: StatCardProps) => (
    <MotiView
        from={{ opacity: 0, scale: 0.5, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 100 }}
        style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}
    >
        <View style={[styles.iconIndicator, { backgroundColor: color }]} />
        <View style={styles.cardContent}>
            <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={14} color={color} />
            </View>
            <View style={styles.textWrapper}>
                <Text style={[styles.statLabel, { color: textSecondary }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.statValue, { color: textPrimary }]} numberOfLines={1}>{value}</Text>
            </View>
        </View>
    </MotiView>
);

interface CajeroStatsProps {
    stats: any;
}

export const CajeroStats = ({ stats }: CajeroStatsProps) => {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';

    // Glassmorphism effect
    const cardBg = isDark ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.95)';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    const statItems = [
        {
            label: 'Balance Total',
            value: `$${(stats?.balance_total || 0).toLocaleString()}`,
            icon: 'wallet' as const,
            color: '#E11D48'
        },
        {
            label: 'Ventas Hoy',
            value: `$${(stats?.total_ventas || 0).toLocaleString()}`,
            icon: 'cart' as const,
            color: '#10B981'
        },
        {
            label: 'Servicios',
            value: `$${(stats?.total_servicios || 0).toLocaleString()}`,
            icon: 'bed' as const,
            color: '#F59E0B'
        },
        {
            label: 'Ingresos Totales',
            value: `$${(stats?.total_ingresos || 0).toLocaleString()}`,
            icon: 'cash' as const,
            color: '#3B82F6'
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {statItems.map((item, index) => (
                    <StatCard
                        key={index}
                        {...item}
                        index={index}
                        isDark={isDark}
                        borderColor={borderColor}
                        cardBg={cardBg}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 14,
        marginTop: -20,
        zIndex: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statCard: {
        flex: 1,
        minWidth: '47%',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
    },
    iconIndicator: {
        position: 'absolute',
        left: 0,
        top: 10,
        bottom: 10,
        width: 4,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
        opacity: 0.8,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginLeft: 4, // Space for the indicator
    },
    textWrapper: {
        flex: 1,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    statValue: {
        fontSize: 15,
        fontWeight: '900',
        marginTop: 1,
    },
});
