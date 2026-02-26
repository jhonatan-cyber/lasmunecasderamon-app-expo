import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { DonutChart } from './DonutChart';

interface GarzonStatsProps {
    stats: any;
}

export const GarzonStats = ({ stats }: GarzonStatsProps) => {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const cardBg = isDark ? '#1F2937' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

    return (
        <View style={styles.container}>
            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
                        <Ionicons name="restaurant" size={20} color="#8B5CF6" />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: textPrimary }]}>{stats?.svcCount || 0}</Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>Atenciones</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={[styles.iconContainer, { backgroundColor: '#10B98120' }]}>
                        <Ionicons name="cash" size={20} color="#10B981" />
                    </View>
                    <View>
                        <Text style={[styles.statValue, { color: textPrimary }]}>
                            ${((stats?.totalEarnings || 0) / 1000).toFixed(1)}k
                        </Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>Propina</Text>
                    </View>
                </View>
            </View>

            {/* Performance Chart Card */}
            <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.cardTitle, { color: textPrimary }]}>Meta de Ventas</Text>
                        <Text style={{ fontSize: 12, color: textSecondary }}>Basado en propinas semanales</Text>
                    </View>
                    <Ionicons name="trending-up" size={18} color="#8B5CF6" />
                </View>

                <View style={styles.goalContainer}>
                    <DonutChart
                        percent={Math.min(100, Math.round(((stats?.totalEarnings || 0) / 300000) * 100))}
                        color="#8B5CF6"
                        size={100}
                        strokeWidth={8}
                        label="Propina"
                        isDark={isDark}
                    />
                    <View style={styles.goalInfo}>
                        <Text style={[styles.goalTarget, { color: textPrimary }]}>
                            ${(stats?.totalEarnings || 0).toLocaleString('es-CL')}
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
        marginTop: 2,
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
