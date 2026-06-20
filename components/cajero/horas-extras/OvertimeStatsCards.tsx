import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Stats {
    totalRegistros: number;
    totalMonto: number;
    totalHoras: number;
    totalAPagar: number;
}

interface OvertimeStatsCardsProps {
    stats: Stats;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
}

const formatCurrency = (value: number) => `$${(Number(value) || 0).toLocaleString('de-DE')}`;

export function OvertimeStatsCards({
    stats,
    accentColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
}: OvertimeStatsCardsProps) {
    return (
        <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#3B82F615' }]}>
                    <Ionicons name="time-outline" size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Horas</Text>
                <Text style={[styles.statValue, { color: textPrimary }]}>{stats.totalHoras.toFixed(1)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#10B98115' }]}>
                    <Ionicons name="cash-outline" size={18} color="#10B981" />
                </View>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Total Monto</Text>
                <Text style={[styles.statValue, { color: textPrimary }]}>{formatCurrency(stats.totalMonto)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.statIconBox, { backgroundColor: `${accentColor}15` }]}>
                    <Ionicons name="wallet-outline" size={18} color={accentColor} />
                </View>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Por Cobrar</Text>
                <Text style={[styles.statValue, { color: accentColor }]}>{formatCurrency(stats.totalAPagar)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    statsRow: { 
        flexDirection: 'row', 
        gap: 8, 
        paddingHorizontal: 16, 
        marginTop: 16 
    },
    statCard: { 
        flex: 1, 
        borderRadius: 16, 
        padding: 12, 
        borderWidth: 1, 
        alignItems: 'center', 
        gap: 3 
    },
    statIconBox: { 
        width: 32, 
        height: 32, 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 2 
    },
    statLabel: { 
        fontSize: 8, 
        fontWeight: '700', 
        textTransform: 'uppercase', 
        letterSpacing: 0.5 
    },
    statValue: { 
        fontSize: 14, 
        fontWeight: '900' 
    },
});
