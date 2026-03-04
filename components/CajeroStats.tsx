import { Ionicons } from '@expo/vector-icons';
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
    borderColor: string;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
    index: number;
    isTablet?: boolean;
}

const StatCard = ({ label, value, icon, color, isDark, borderColor, cardBg, textPrimary, textSecondary, index, isTablet }: StatCardProps) => (
    <MotiView
        from={{ opacity: 0, scale: 0.5, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 100 }}
        style={[
            styles.statCard,
            {
                backgroundColor: cardBg,
                borderColor,
                shadowColor: color,
                shadowOpacity: isDark ? 0.2 : 0.15,
                minWidth: isTablet ? '45%' : '45%',
                paddingVertical: isTablet ? 32 : 12,
                borderRadius: isTablet ? 24 : 16,
            }
        ]}
    >
        <View style={[styles.iconIndicator, { backgroundColor: color, height: isTablet ? '70%' : '50%' }]} />
        <View style={styles.cardContent}>
            <View style={[
                styles.iconWrapper,
                {
                    backgroundColor: `${color}18`,
                    width: isTablet ? 70 : 32,
                    height: isTablet ? 70 : 32,
                    borderRadius: isTablet ? 20 : 10
                }
            ]}>
                <Ionicons name={icon} size={isTablet ? 36 : 15} color={color} />
            </View>
            <View style={styles.textWrapper}>
                <Text style={[styles.statLabel, { color: textSecondary, fontSize: isTablet ? 16 : 10 }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.statValue, { color: textPrimary, fontSize: isTablet ? 38 : 15, marginTop: isTablet ? 6 : 1 }]} numberOfLines={1}>{value}</Text>
            </View>
        </View>
    </MotiView>
);

interface CajeroStatsProps {
    stats: any;
}

export const CajeroStats = ({ stats }: CajeroStatsProps) => {
    const { accentColor, isDark } = useAccentColor();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    // Glassmorphism effect
    const cardBg = isDark ? 'rgba(31, 41, 55, 0.9)' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

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
            color: rotateColor(accentColor, 120) // Greenish rotation
        },
        {
            label: 'Servicios',
            value: `$${(stats?.total_servicios || 0).toLocaleString()}`,
            icon: 'bed' as const,
            color: rotateColor(accentColor, 45) // Amber/Orange rotation
        },
        {
            label: 'Ingresos Totales',
            value: `$${(stats?.total_ingresos || 0).toLocaleString()}`,
            icon: 'cash' as const,
            color: rotateColor(accentColor, 210) // Blueish rotation
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
                        borderColor={borderColor}
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
        paddingHorizontal: 14,
        paddingTop: 16,
        zIndex: 10,
    },
    tabletContainer: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tabletGrid: {
        gap: 16,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        position: 'relative',
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 8,
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
