import Ionicons from '@expo/vector-icons/Ionicons';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useAnalyticsScreen } from '@/hooks/useAnalyticsScreen';
import { formatCurrency } from '@/utils/format';

const CHART_HEIGHT = 150;

interface AnalyticsScreenProps {
    /**
     * Muestra el botón «Atrás» del PremiumHeader. Solo en las rutas
     * empujadas desde el home (cajero/garzón/anfitriona — paridad con
     * `/…/analytics` de Flutter).
     */
    onBack?: () => void;
}

/**
 * Analíticas del usuario: KPIs de `GET /stats/dashboard-summary` + ventas de
 * `GET /stats/sales-by-week` (barras por día y distribución semanal).
 * Porte de `analytics_screen.dart` de Flutter — sin librería de gráficos: las
 * barras se dibujan con alturas proporcionales, como el resto de la app.
 */
export function AnalyticsScreen({ onBack }: AnalyticsScreenProps) {
    const { accentColor, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
    const { stats, bars, distribution, totals, loading, refreshing, error, onRefresh } =
        useAnalyticsScreen();

    const maxBar = bars.reduce((max, b) => Math.max(max, b.value), 0);

    const renderStats = () => {
        const rows = [];
        for (let i = 0; i < stats.length; i += 2) rows.push(stats.slice(i, i + 2));
        return rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.statsRow}>
                {row.map((stat) => (
                    <View
                        key={stat.title}
                        style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}
                    >
                        <View style={[styles.statIcon, { backgroundColor: `${accentColor}1F` }]}>
                            <Ionicons
                                name={stat.icon as keyof typeof Ionicons.glyphMap}
                                size={18}
                                color={accentColor}
                            />
                        </View>
                        <Text style={[styles.statValue, { color: textPrimary }]} numberOfLines={1}>
                            {stat.value}
                        </Text>
                        <Text style={[styles.statTitle, { color: textSecondary }]} numberOfLines={1}>
                            {stat.title}
                        </Text>
                        {!!stat.subtitle && (
                            <Text style={[styles.statSubtitle, { color: textSecondary }]} numberOfLines={1}>
                                {stat.subtitle}
                            </Text>
                        )}
                    </View>
                ))}
                {row.length < 2 && <View style={{ flex: 1 }} />}
            </View>
        ));
    };

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Analíticas" subtitle="Métricas y ventas" onBack={onBack} />

            {loading ? (
                <View style={styles.loadingBox}>
                    <SkeletonLoader width="100%" height={120} borderRadius={20} />
                    <SkeletonLoader width="100%" height={230} borderRadius={20} />
                    <SkeletonLoader width="100%" height={200} borderRadius={20} />
                </View>
            ) : (
                <ScrollView
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={accentColor}
                        />
                    }
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {!!error && (
                        <View
                            style={[
                                styles.errorBanner,
                                { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.35)' },
                            ]}
                        >
                            <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                            <Text style={styles.errorText}>Datos parciales — {error}</Text>
                        </View>
                    )}

                    {renderStats()}

                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                                Ventas Semanales
                            </Text>
                            <View style={styles.totalsRow}>
                                <View style={[styles.totalChip, { backgroundColor: `${accentColor}1F` }]}>
                                    <Text style={[styles.totalChipText, { color: accentColor }]}>
                                        {formatCurrency(totals.totalVentas)}
                                    </Text>
                                </View>
                                <View style={[styles.totalChip, { backgroundColor: `${accentColor}1F` }]}>
                                    <Text style={[styles.totalChipText, { color: accentColor }]}>
                                        Prom. {formatCurrency(totals.promedioDiario)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {bars.length === 0 ? (
                            <Text style={[styles.emptyText, { color: textSecondary }]}>
                                Sin ventas registradas esta semana.
                            </Text>
                        ) : (
                            <>
                                <View style={styles.chartArea}>
                                    {bars.map((bar, index) => {
                                        const height =
                                            maxBar > 0 ? Math.max(6, (bar.value / maxBar) * CHART_HEIGHT) : 6;
                                        return (
                                            <View key={`${bar.label}-${index}`} style={styles.barColumn}>
                                                <Text style={[styles.barValue, { color: textSecondary }]}>
                                                    {bar.value > 0 ? formatCurrency(bar.value) : ''}
                                                </Text>
                                                <View
                                                    style={[
                                                        styles.bar,
                                                        {
                                                            height,
                                                            backgroundColor:
                                                                bar.value > 0 ? accentColor : borderColor,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                                <View style={styles.labelsRow}>
                                    {bars.map((bar, index) => (
                                        <Text
                                            key={`${bar.label}-label-${index}`}
                                            style={[styles.barLabel, { color: textSecondary }]}
                                            numberOfLines={1}
                                        >
                                            {bar.shortLabel}
                                        </Text>
                                    ))}
                                </View>
                            </>
                        )}
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Distribución</Text>
                        {distribution.length === 0 ? (
                            <Text style={[styles.emptyText, { color: textSecondary }]}>
                                Todavía no hay ventas para repartir.
                            </Text>
                        ) : (
                            distribution.map((point) => (
                                <View key={point.label} style={styles.distRow}>
                                    <View style={styles.distHeader}>
                                        <View style={styles.distLabelRow}>
                                            <View style={[styles.dot, { backgroundColor: point.color }]} />
                                            <Text style={[styles.distLabel, { color: textPrimary }]}>
                                                {point.label}
                                            </Text>
                                        </View>
                                        <Text style={[styles.distValue, { color: textPrimary }]}>
                                            {formatCurrency(point.value)} · {point.percent}%
                                        </Text>
                                    </View>
                                    <View style={[styles.track, { backgroundColor: borderColor }]}>
                                        <View
                                            style={[
                                                styles.fill,
                                                { width: `${point.percent}%`, backgroundColor: point.color },
                                            ]}
                                        />
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingBox: { flex: 1, padding: 16, gap: 14 },
    content: { padding: 16, paddingBottom: 100 },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 14,
    },
    errorText: { color: '#F59E0B', fontSize: 12, fontWeight: '600', flex: 1 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statCard: { flex: 1, borderRadius: 20, padding: 14, borderWidth: 1 },
    statIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statValue: { fontSize: 20, fontWeight: '900' },
    statTitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
    statSubtitle: { fontSize: 10, marginTop: 1 },
    card: { borderRadius: 20, padding: 16, borderWidth: 1, marginTop: 4 },
    cardHeader: { marginBottom: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '900' },
    totalsRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    totalChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999 },
    totalChipText: { fontSize: 11, fontWeight: '800' },
    chartArea: {
        height: CHART_HEIGHT + 22,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 6,
    },
    barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    bar: { width: '65%', borderRadius: 6, minHeight: 6 },
    barValue: { fontSize: 8, fontWeight: '700', marginBottom: 4, height: 12 },
    labelsRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
    barLabel: { flex: 1, fontSize: 10, fontWeight: '700', textAlign: 'center' },
    emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 24 },
    distRow: { marginTop: 14 },
    distHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    distLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    distLabel: { fontSize: 13, fontWeight: '700' },
    distValue: { fontSize: 12, fontWeight: '700' },
    track: { height: 8, borderRadius: 4, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4 },
});
