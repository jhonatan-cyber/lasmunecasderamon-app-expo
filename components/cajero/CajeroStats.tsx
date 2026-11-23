import { formatCurrency } from '@/utils/format';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';

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
    <AnimatedView
        from={{ opacity: 0, scale: 0.9, translateY: 10 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: Math.min(index, 4) * 30 }}
        style={[
            styles.statCard,
            {
                backgroundColor: cardBg,
                shadowColor: color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.25 : 0.12,
                shadowRadius: 10,
                minWidth: isFullWidth ? (isTablet ? '100%' : '92%') : (isTablet ? '48.5%' : '47%'),
                maxWidth: isFullWidth ? 800 : 400,
                alignSelf: 'center',
                padding: isFullWidth ? (isTablet ? 30 : 20) : (isTablet ? 24 : 16),
                borderRadius: isFullWidth ? (isTablet ? 32 : 24) : (isTablet ? 24 : 18),
                // En claro la tarjeta es blanca sobre pantalla blanca: el borde
                // es lo que la delimita (en oscuro se tiñe con el color).
                borderWidth: 1,
                borderColor: isDark ? `${color}40` : 'rgba(0,0,0,0.10)',
            }
        ]}
    >
        <View style={[styles.cardContent, { flexDirection: 'column', alignItems: 'center', gap: isTablet ? 8 : 4 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={isFullWidth ? 24 : 20} color={color} />
            </View>
            <View style={[styles.textWrapper, { alignItems: 'center' }]}>
                <Text style={[styles.statLabel, { color: textSecondary, fontSize: isFullWidth ? (isTablet ? 14 : 11) : (isTablet ? 12 : 9) }]} numberOfLines={1}>{label}</Text>
                <Text style={[styles.statValue, { color: textPrimary, fontSize: isFullWidth ? (isTablet ? 42 : 32) : (isTablet ? 28 : 22) }]} numberOfLines={1}>{value}</Text>
                {subLabel && (
                    <Text style={{ color: textSecondary, fontSize: isFullWidth ? (isTablet ? 14 : 12) : 10, marginTop: 4, fontFamily: FontFamily.semibold }}>
                        {subLabel}
                    </Text>
                )}
            </View>
        </View>

        {!isFullWidth && <View style={[styles.glowDot, { backgroundColor: color, top: isTablet ? 15 : 10, right: isTablet ? 15 : 10 }]} />}
    </AnimatedView>
);

interface CajeroStatsProps {
    stats: any;
    fullWidth?: boolean;
    hideFullWidth?: boolean;
}

interface StatItem {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    isFullWidth?: boolean;
    subLabel?: string;
}

export const CajeroStats = ({ stats, fullWidth = false, hideFullWidth = false }: CajeroStatsProps) => {
    const { isDark, cardBg, textPrimary, textSecondary, accentOnSurface} = useAccentColor();
    const { isTablet } = useResponsiveMetrics();

    const statItems: StatItem[] = [
        {
            label: 'Balance Total',
            value: formatCurrency(stats?.balance_total || 0),
            icon: 'wallet' as const,
            color: accentOnSurface,
            isFullWidth: true,
            subLabel: '+ ' + formatCurrency(stats?.monto_apertura || 0) + ' Apertura'
        },
        {
            label: 'Servicios',
            value: formatCurrency(stats?.total_servicios || 0),
            icon: 'bed' as const,
            color: accentOnSurface
        },
        {
            label: 'Ventas',
            value: formatCurrency(stats?.total_ventas || 0),
            icon: 'cart' as const,
            color: accentOnSurface
        }
    ];

    const tarjetasVisibles = hideFullWidth
        ? statItems.filter((item) => !item.isFullWidth)
        : statItems;

    return (
        <View style={[styles.container, isTablet && styles.tabletContainer, fullWidth && styles.fullWidthContainer, fullWidth && isTablet && styles.fullWidthTabletContainer]}>
            <View style={[styles.grid, isTablet && styles.tabletGrid]}>
                {tarjetasVisibles.map((item, index) => (
                    <StatCard
                        key={item.label}
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
        position: 'relative',
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    textWrapper: {
        flex: 1,
    },
    statLabel: {
        fontFamily: FontFamily.extrabold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    statValue: {
        fontFamily: FontFamily.black,
        letterSpacing: -0.5,
    },
    glowDot: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: BorderRadius.full,
        opacity: 0.5,
    }
});
