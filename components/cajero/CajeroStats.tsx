import { formatCurrency } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';

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
    isFullWidth?: boolean;
    subLabel?: string;
}

const StatCard = ({ label, value, icon, color, isDark, cardBg, textPrimary, textSecondary, index, isTablet, isFullWidth, subLabel }: StatCardProps) => (
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
                minWidth: isFullWidth ? (isTablet ? '100%' : '92%') : (isTablet ? '48.5%' : '47%'),
                maxWidth: isFullWidth ? 800 : 400,
                alignSelf: 'center',
                padding: isFullWidth ? (isTablet ? 30 : 20) : (isTablet ? 24 : 16),
                borderRadius: isFullWidth ? (isTablet ? 32 : 24) : (isTablet ? 24 : 18),
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? `${color}40` : 'transparent',
            }
        ]}
    >
        <View style={[styles.cardContent, { flexDirection: 'column', alignItems: 'center', gap: isTablet ? 8 : 4 }]}>
            <View style={[styles.textWrapper, { alignItems: 'center' }]}>
                <Text style={[styles.statLabel, { color: textSecondary, fontSize: isFullWidth ? (isTablet ? 14 : 11) : (isTablet ? 12 : 9) }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.statValue, { color: textPrimary, fontSize: isFullWidth ? (isTablet ? 42 : 32) : (isTablet ? 28 : 22) }]} numberOfLines={1}>{value}</Text>
                {subLabel && (
                    <Text style={{ color: textSecondary, fontSize: isFullWidth ? (isTablet ? 14 : 12) : 10, marginTop: 4, fontWeight: '600' }}>
                        {subLabel}
                    </Text>
                )}
            </View>
        </View>

        {!isFullWidth && <View style={[styles.glowDot, { backgroundColor: color, top: isTablet ? 15 : 10, right: isTablet ? 15 : 10 }]} />}
    </MotiView>
);

interface CajeroStatsProps {
    stats: any;
    fullWidth?: boolean;
}

export const CajeroStats = ({ stats, fullWidth = false }: CajeroStatsProps) => {
    const { accentColor, isDark } = useAccentColor();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';

    const statItems = [
        {
            label: 'Balance Total',
            value: formatCurrency(stats?.balance_total || 0),
            icon: 'wallet' as const,
            color: '#10B981', // Success color
            isFullWidth: true,
            subLabel: '+ ' + formatCurrency(stats?.monto_apertura || 0) + ' Apertura'
        },
        {
            label: 'Servicios',
            value: formatCurrency(stats?.total_servicios || 0),
            icon: 'bed' as const,
            color: accentColor
        },
        {
            label: 'Ventas',
            value: formatCurrency(stats?.total_ventas || 0),
            icon: 'cart' as const,
            color: accentColor
        }
    ];

    return (
        <View style={[styles.container, isTablet && styles.tabletContainer, fullWidth && styles.fullWidthContainer, fullWidth && isTablet && styles.fullWidthTabletContainer]}>
            <View style={[styles.grid, isTablet && styles.tabletGrid]}>
                {statItems.map((item, index) => (
                    <StatCard
                        key={index}
                        {...item}
                        isDark={isDark}
                        cardBg={cardBg}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                        index={index}
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
        paddingTop: 24,
        paddingBottom: 24,
    },
    tabletContainer: {
        paddingHorizontal: 24,
    },
    fullWidthContainer: {
        paddingHorizontal: 0,
    },
    fullWidthTabletContainer: {
        paddingHorizontal: 0,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    tabletGrid: {
        gap: 20,
    },
    statCard: {
        elevation: 4,
        shadowOffset: { width: 0, height: 4 },
        position: 'relative',
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    textWrapper: {
        flex: 1,
    },
    statLabel: {
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    statValue: {
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    glowDot: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        opacity: 0.5,
    }
});
