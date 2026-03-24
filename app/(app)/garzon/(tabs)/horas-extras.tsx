import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useHorasExtras, HoraExtra } from '@/hooks/useHorasExtras';

export default function HorasExtrasScreen() {
    const { accentColor, isDark } = useAccentColor();
    const { data: horasExtras, loading, refreshing, error, onRefresh, fetchData } = useHorasExtras();
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');

    const bg = isDark ? '#000000' : '#F9FAFB';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : '#E5E7EB';

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? 'Error' : `${date.getUTCDate()} ${date.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' })} ${date.getUTCFullYear()}`;
    };

    const filteredData = horasExtras.filter((a) => {
        if (filter === 'pendiente') return a.estado === 1;
        if (filter === 'pagado') return a.estado === 0;
        return true;
    });

    const pendientes = horasExtras.filter((a) => a.estado === 1);
    const totalPendiente = pendientes.reduce((sum, a) => sum + (a.total || a.monto || 0), 0);

    const renderItem = ({ item, index }: { item: HoraExtra; index: number }) => {
        const isPendiente = item.estado === 1;
        return (
            <MotiView from={{ opacity: 0, translateY: 30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 100 }}>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}><Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text></View>
                        <View style={[styles.statusBadge, { backgroundColor: isPendiente ? (isDark ? '#065F46' : '#D1FAE5') : (isDark ? '#1e3b8a' : '#DBEAFE') }]}><Text style={[styles.statusText, { color: isPendiente ? (isDark ? '#6EE7B7' : '#065F46') : (isDark ? '#93C5FD' : '#1E40AF') }]}>{isPendiente ? 'Por cobrar' : 'Cobrado'}</Text></View>
                    </View>
                    <View style={styles.cardBody}>
                        <View style={styles.dateRow}><Ionicons name="calendar-outline" size={14} color={textSecondary} /><Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>{item.hora ? <Text style={[styles.timeText, { color: textSecondary }]}>  |  {item.hora}</Text> : null}</View>
                        <View style={styles.amountsRow}>
                            <View><Text style={[styles.amountLabel, { color: textSecondary }]}>Monto/hr</Text><Text style={[styles.amountValue, { color: textPrimary }]}>${(item.monto || 0).toLocaleString()}</Text></View>
                            <View style={{ alignItems: 'flex-end' }}><Text style={[styles.amountLabel, { color: textSecondary }]}>Total Bruto</Text><Text style={[styles.totalValue, { color: accentColor }]}>${(item.total || 0).toLocaleString()}</Text></View>
                        </View>
                    </View>
                </View>
            </MotiView>
        );
    };

    if (loading) return (
        <View style={[styles.container, { backgroundColor: bg }]}><PremiumHeader title="Horas Extras" /><View style={{ padding: 16 }}><Skeleton width="100%" height={120} borderRadius={16} /></View><View style={{ padding: 16, gap: 10 }}>{[1, 2].map(i => <Skeleton key={i} width="100%" height={100} borderRadius={16} />)}</View></View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Horas Extras" subtitle="Mi tiempo adicional" />
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>TOTAL PENDIENTE</Text>
                <Text style={[styles.summaryAmount, { color: accentColor }]}>${totalPendiente.toLocaleString()}</Text>
                <Text style={[styles.summaryDetail, { color: textSecondary }]}>{pendientes.length} pendientes de {horasExtras.length} registros</Text>
            </View>

            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado'] as const).map(f => (
                    <Pressable key={f} style={[styles.filterButton, { backgroundColor: filter === f ? accentColor : cardBg, borderColor: filter === f ? accentColor : borderColor }]} onPress={() => setFilter(f)}>
                        <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textSecondary }]}>
                            {f === 'all' ? `Todas (${horasExtras.length})` : f === 'pendiente' ? `Pendientes (${pendientes.length})` : `Cobradas (${horasExtras.length - pendientes.length})`}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {error ? (
                <View style={styles.errorCard}><Text style={styles.errorText}>⚠️ {error}</Text><Pressable onPress={() => fetchData(true)} style={styles.retryButton}><Text style={{ color: '#FFF' }}>Reintentar</Text></Pressable></View>
            ) : null}

            <FlatList data={filteredData} keyExtractor={item => item.id_hora_extra.toString()} renderItem={renderItem} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />} ListEmptyComponent={<View style={[styles.emptyCard, { backgroundColor: cardBg }]}><Ionicons name="time-outline" size={48} color={textSecondary} /><Text style={[styles.emptyText, { color: textSecondary }]}>No hay horas extras registradas</Text></View>} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    summaryCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1 },
    summaryLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
    summaryAmount: { fontSize: 36, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
    summaryDetail: { fontSize: 12, fontWeight: '600' },
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 8 },
    filterButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    filterText: { fontSize: 11, fontWeight: '700' },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    indexBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    indexText: { fontSize: 10, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    cardBody: {},
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    dateText: { fontSize: 14, fontWeight: '600' },
    timeText: { fontSize: 13 },
    amountsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    amountLabel: { fontSize: 10, fontWeight: '800', marginBottom: 2, opacity: 0.6 },
    amountValue: { fontSize: 16, fontWeight: '700' },
    totalValue: { fontSize: 22, fontWeight: '900' },
    errorCard: { padding: 20, alignItems: 'center' },
    errorText: { color: '#EF4444', marginBottom: 10 },
    retryButton: { backgroundColor: '#EF4444', padding: 10, borderRadius: 10 },
    emptyCard: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, marginTop: 10 },
});


