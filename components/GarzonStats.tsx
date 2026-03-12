import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { DonutChart } from './DonutChart';

interface GarzonStatsProps {
    stats: any;
    events: any[];
}

export const GarzonStats = ({ stats, events }: GarzonStatsProps) => {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    return (
        <View style={styles.container}>
            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
                <LinearGradient
                    colors={isDark ? ['#10B981', '#059669'] : ['#10B981', '#34D399']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.premiumStatCard}
                >
                    <View style={styles.premiumStatContent}>
                        <View style={styles.premiumIconWrapper}>
                            <MaterialCommunityIcons name="hand-coin" size={26} color="#FFFFFF" />
                        </View>
                        <View style={styles.premiumTextGroup}>
                            <Text style={styles.premiumStatLabel}>TOTAL PROPINAS</Text>
                            <Text style={styles.premiumStatValue}>
                                ${(Number(stats?.totalEarnings) || 0).toLocaleString('es-CL')}
                            </Text>
                        </View>
                        <View style={styles.premiumDivider} />
                        <View style={styles.premiumSubStats}>
                            <View style={styles.subStatItem}>
                                <Ionicons name="sparkles-sharp" size={14} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.subStatText}>
                                    {new Set(events?.filter(e => e.type === 'propina').map(e => e.codigo)).size || 0} Ventas con Propina
                                </Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* Performance Chart Card */}
            <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.cardTitle, { color: textPrimary }]}>Meta de Ventas</Text>
                        <Text style={{ fontSize: 12, color: textSecondary }}>Basado en propinas semanales</Text>
                    </View>
                    <Ionicons name="trending-up" size={18} color="#E11D48" />
                </View>

                <View style={styles.goalContainer}>
                    <DonutChart
                        percent={Math.min(100, Math.round(((stats?.totalEarnings || 0) / 300000) * 100))}
                        color="#E11D48"
                        size={100}
                        strokeWidth={8}
                        label="Propina"
                        isDark={isDark}
                    />
                    <View style={styles.goalInfo}>
                        <Text style={[styles.goalTarget, { color: textPrimary }]}>
                            ${(Number(stats?.totalEarnings) || 0).toLocaleString('es-CL')}
                            <Text style={{ color: textSecondary, fontWeight: '400', fontSize: 14 }}> / $300k</Text>
                        </Text>
                        <Text style={[styles.goalPrompt, { color: textSecondary }]}>
                            ¡Sigue así! Te falta poco para tu meta semanal.
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 15,
        paddingHorizontal: 10,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        gap: 12,
    },
    premiumStatCard: {
        flex: 1,
        borderRadius: 28,
        padding: 20,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    premiumStatContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    premiumIconWrapper: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    premiumTextGroup: {
        flex: 1,
        marginLeft: 16,
    },
    premiumStatLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    premiumStatValue: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '900',
    },
    premiumDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 15,
    },
    premiumSubStats: {
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    subStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    subStatText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: { fontSize: 18, fontWeight: '900' },
    statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    glassCard: {
        borderRadius: 28,
        padding: 20,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    cardTitle: { fontSize: 16, fontWeight: '800' },
    goalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    goalInfo: { flex: 1 },
    goalTarget: { fontSize: 22, fontWeight: '900' },
    goalPrompt: { fontSize: 11, marginTop: 4, fontWeight: '500', opacity: 0.8 },
});
