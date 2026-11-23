import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontFamily } from '@/constants/fonts';
import { formatCurrency } from '@/utils/format';
import { useAccentColor } from '@/hooks/useAccentColor';

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

export function OvertimeStatsCards({
    stats,
    accentColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
}: OvertimeStatsCardsProps) {
    const { accentColor: themeAccent, accentOnSurface } = useAccentColor();
    return (
        <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.statIconBox, { backgroundColor: `${themeAccent}15` }]}>
                    <Ionicons name="time-outline" size={18} color={themeAccent} />
                </View>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Horas</Text>
                <Text style={[styles.statValue, { color: textPrimary }]}>{stats.totalHoras.toFixed(1)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.statIconBox, { backgroundColor: `${accentOnSurface}15` }]}>
                    <Ionicons name="cash-outline" size={18} color={accentOnSurface} />
                </View>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Total Monto</Text>
                <Text style={[styles.statValue, { color: textPrimary }]}>{formatCurrency(stats.totalMonto)}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={[styles.statIconBox, { backgroundColor: `${accentColor}15` }]}>
                    <Ionicons name="wallet-outline" size={18} color={accentOnSurface} />
                </View>
                <Text style={[styles.statLabel, { color: textSecondary }]}>Por Cobrar</Text>
                <Text style={[styles.statValue, { color: accentOnSurface }]}>{formatCurrency(stats.totalAPagar)}</Text>
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
        fontFamily: FontFamily.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    statValue: {
        fontSize: 14,
        fontFamily: FontFamily.black
    },
});
