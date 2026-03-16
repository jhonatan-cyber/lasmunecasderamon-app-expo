import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAccentColor } from '../hooks/useAccentColor';
import { rotateColor } from '../utils/colors';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    isDark: boolean;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
    index: number;
    isTablet?: boolean;
}

const StatCard = ({ label, value, icon, color, isDark, cardBg, textPrimary, textSecondary, index, isTablet }: StatCardProps) => (
    <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: 10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 80 }}
        style={[
            styles.statCard,
            {
                backgroundColor: cardBg,
                shadowColor: color,
                shadowOpacity: isDark ? 0.25 : 0.12,
                minWidth: isTablet ? '48%' : '47%',
                padding: isTablet ? 24 : 12,
                borderRadius: isTablet ? 24 : 18,
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? `${color}40` : 'transparent',
            }
        ]}
    >
        <View style={styles.cardContent}>
            <LinearGradient
                colors={[`${color}30`, `${color}05`]}
                style={[styles.iconWrapper, { width: isTablet ? 56 : 38, height: isTablet ? 56 : 38, borderRadius: isTablet ? 16 : 12 }]}
            >
                <Ionicons name={icon} size={isTablet ? 28 : 20} color={color} />
            </LinearGradient>

            <View style={styles.textWrapper}>
                <Text style={[styles.statLabel, { color: textSecondary, fontSize: isTablet ? 12 : 9 }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.statValue, { color: textPrimary, fontSize: isTablet ? 24 : 15 }]} numberOfLines={1}>{value}</Text>
            </View>
        </View>

        <View style={[styles.glowDot, { backgroundColor: color, top: isTablet ? 15 : 10, right: isTablet ? 15 : 10 }]} />
    </MotiView>
);

interface CajeroStatsProps {
    stats: any;
}

export const CajeroStats = ({ stats }: CajeroStatsProps) => {
    const { accentColor, isDark } = useAccentColor();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';

    const statItems = [
        {
            label: 'Balance Total',
            value: `$${(stats?.balance_total || 0).toLocaleString()}`,
            icon: 'wallet' as const,
            color: accentColor
        },
        {
            label: 'Ventas Hoy',
            value: `$${(stats?.total_ventas || 0).toLocaleString()}`,
            icon: 'cart' as const,
            color: accentColor
        },
        {
            label: 'Servicios',
            value: `$${(stats?.total_servicios || 0).toLocaleString()}`,
            icon: 'bed' as const,
            color: accentColor
        },
        {
            label: 'Ingresos Totales',
            value: `$${(stats?.total_ingresos || 0).toLocaleString()}`,
            icon: 'cash' as const,
            color: accentColor
        }
    ];

    return (
        <View style={[styles.container, isTablet && styles.tabletContainer]}>
            <View style={[styles.grid, isTablet && styles.tabletGrid]}>
                {statItems.map((item, index) => (
                    <StatCard
                        key={index}
                        {...item}
                        index={index}
                        isDark={isDark}
                        cardBg={cardBg}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        isTablet={isTablet}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
        zIndex: 10,
    },
    tabletContainer: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tabletGrid: {
        gap: 12,
    },
    statCard: {
        flex: 1,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 5,
        position: 'relative',
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    textWrapper: {
        flex: 1,
    },
    statLabel: {
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statValue: {
        fontWeight: '900',
        marginTop: 0,
        letterSpacing: -0.5,
    },
    glowDot: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        opacity: 0.6,
    }
});
