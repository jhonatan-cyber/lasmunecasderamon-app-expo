import { formatCurrency } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    textPrimary: string;
    textSecondary: string;
    index: number;
    isTablet?: boolean;
    isFullWidth?: boolean;
    subLabel?: string;
}

const StatCard = ({ label, value, icon, color, isDark, textPrimary, textSecondary, index, isTablet, isFullWidth, subLabel }: StatCardProps) => (
    <MotiView
        from={{ opacity: 0, scale: 0.9, translateY: 10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: index * 80 }}
        style={[
            styles.statCardContainer,
            {
                minWidth: isFullWidth ? (isTablet ? '100%' : '92%') : (isTablet ? '48.5%' : '47%'),
                maxWidth: isFullWidth ? 800 : 400,
            }
        ]}
    >
        <LinearGradient
            colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC']}
            style={[
                styles.statCard,
                {
                    borderColor: isDark ? `${color}40` : '#E2E8F0',
                    borderWidth: 1,
                    padding: isFullWidth ? (isTablet ? 30 : 20) : (isTablet ? 24 : 16),
                    borderRadius: isFullWidth ? (isTablet ? 32 : 24) : (isTablet ? 24 : 18),
                }
            ]}
        >
            <View style={styles.statCardHeader}>
                <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon} size={isFullWidth ? 24 : 20} color={color} />
                </View>
                {subLabel && (
                    <View style={styles.trendBadge}>
                        <Text style={[styles.subLabelText, { color: textSecondary }]}>{subLabel}</Text>
                    </View>
                )}
            </View>
            
            <View style={styles.statContent}>
                <Text style={[styles.statLabel, { color: textSecondary, fontSize: isFullWidth ? 14 : 11 }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.statValue, { color: textPrimary, fontSize: isFullWidth ? (isTablet ? 42 : 32) : 24 }]} numberOfLines={1}>{value}</Text>
            </View>
        </LinearGradient>
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

    const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
    const textSecondary = isDark ? '#94A3B8' : '#64748B';

    const statItems = [
        {
            label: 'Balance Total',
            value: formatCurrency(stats?.balance_total || 0),
            icon: 'wallet' as const,
            color: '#10B981', 
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
        <View style={[styles.container, isTablet && styles.tabletContainer, fullWidth && styles.fullWidthContainer]}>
            <View style={[styles.grid, isTablet && styles.tabletGrid]}>
                {statItems.map((item, index) => (
                    <StatCard
                        key={index}
                        {...item}
                        isDark={isDark}
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
        paddingVertical: 20,
    },
    tabletContainer: {
        paddingHorizontal: 24,
    },
    fullWidthContainer: {
        paddingHorizontal: 16,
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
    statCardContainer: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    statCard: {
        justifyContent: 'space-between',
        height: '100%',
    },
    statCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trendBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    subLabelText: {
        fontSize: 10,
        fontWeight: '700',
    },
    statContent: {
        gap: 2,
    },
    statLabel: {
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.8,
    },
    statValue: {
        fontWeight: '900',
        letterSpacing: -1,
    }
});
