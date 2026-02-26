import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from 'react-native';
import { apiClient } from '../../../../api/client';

interface Asistencia {
    id_asistencia: number;
    usuario_id: number;
    fecha: string;
    hora: string;
    sueldo: number;
    aporte: number;
    estado: number;
    total?: number;
    fecha_pago?: string | null;
}

export default function AsistenciaScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const fetchAsistencias = useCallback(async () => {
        try {
            setError('');
            const data = await apiClient('/asistencias/user?tipo=detalle');
            if (data.success) {
                setAsistencias(data.data || []);
            } else {
                setError(data.message || 'Error al cargar asistencias');
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAsistencias();
    }, [fetchAsistencias]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAsistencias();
    }, [fetchAsistencias]);

    // Format date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            const day = date.getDate();
            const month = date.toLocaleDateString('es-ES', { month: 'short' });
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch {
            return 'Error';
        }
    };

    // Filter
    const filteredData = asistencias.filter((a) => {
        if (filter === 'pendiente') return a.estado === 1;
        if (filter === 'pagado') return a.estado === 0;
        return true;
    });

    // Totals (only pending estado=1)
    const pendientes = asistencias.filter((a) => a.estado === 1);
    const totalSueldo = pendientes.reduce((sum, a) => sum + (a.sueldo || 0), 0);
    const totalAporte = pendientes.reduce((sum, a) => sum + (a.aporte || 0), 0);
    const totalACobrar = totalSueldo - totalAporte;

    const renderItem = ({ item, index }: { item: Asistencia; index: number }) => {
        const isPendiente = item.estado === 1;
        return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                        <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                    </View>
                    <View style={styles.cardHeaderRight}>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: isPendiente ? (isDark ? '#065F46' : '#D1FAE5') : (isDark ? '#1E3A5F' : '#DBEAFE') }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: isPendiente ? (isDark ? '#6EE7B7' : '#065F46') : (isDark ? '#93C5FD' : '#1E40AF') }
                            ]}>
                                {isPendiente ? 'Por cobrar' : 'Cobrado'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={16} color={textSecondary} />
                        <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha)}</Text>
                        {item.hora ? (
                            <>
                                <Ionicons name="time-outline" size={16} color={textSecondary} style={{ marginLeft: 12 }} />
                                <Text style={[styles.dateText, { color: textSecondary }]}>{item.hora?.slice(0, 5)}</Text>
                            </>
                        ) : null}
                    </View>

                    <View style={styles.amountsRow}>
                        <View style={styles.amountItem}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Sueldo</Text>
                            <Text style={[styles.amountValue, { color: textPrimary }]}>${(item.sueldo || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.amountItem}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Aporte</Text>
                            <Text style={[styles.amountValue, { color: '#EF4444' }]}>-${(item.aporte || 0).toLocaleString()}</Text>
                        </View>
                        <View style={styles.amountItem}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Total</Text>
                            <Text style={[styles.amountValue, { color: '#10B981', fontWeight: '800' }]}>${(item.total || 0).toLocaleString()}</Text>
                        </View>
                    </View>

                    {item.fecha_pago && item.estado === 0 ? (
                        <View style={styles.paymentRow}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={[styles.paymentText, { color: textSecondary }]}>Pagado: {formatDate(item.fecha_pago)}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color={textPrimary} />
                <Text style={[styles.loadingText, { color: textSecondary }]}>Cargando asistencias...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>TOTAL A COBRAR (Pendientes)</Text>
                <Text style={styles.summaryAmount}>${totalACobrar.toLocaleString()}</Text>
                <View style={styles.summaryDetails}>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>Sueldo: ${totalSueldo.toLocaleString()}</Text>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>Aporte: -${totalAporte.toLocaleString()}</Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado'] as const).map((f) => (
                    <Pressable
                        key={f}
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: filter === f ? textPrimary : cardBg,
                                borderColor,
                            },
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: filter === f ? bg : textSecondary },
                        ]}>
                            {f === 'all' ? `Todas (${asistencias.length})` : f === 'pendiente' ? `Pendientes (${pendientes.length})` : `Cobradas (${asistencias.length - pendientes.length})`}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {error ? (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' }]}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                    <Pressable onPress={fetchAsistencias} style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id_asistencia.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />
                }
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="clipboard-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron asistencias</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 15 },
    summaryCard: {
        marginHorizontal: 16, marginTop: 16, borderRadius: 16,
        padding: 20, alignItems: 'center', borderWidth: 1,
    },
    summaryLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    summaryAmount: { fontSize: 34, fontWeight: '800', color: '#10B981', marginBottom: 8 },
    summaryDetails: { flexDirection: 'row', gap: 16 },
    summaryDetail: { fontSize: 13 },
    filterRow: {
        flexDirection: 'row', paddingHorizontal: 16,
        marginTop: 16, marginBottom: 8, gap: 8,
    },
    filterButton: {
        flex: 1, paddingVertical: 8, borderRadius: 9999,
        alignItems: 'center', borderWidth: 1,
    },
    filterText: { fontSize: 11, fontWeight: '600' },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    card: {
        borderRadius: 16, padding: 16,
        marginTop: 10, borderWidth: 1,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardHeaderRight: {},
    indexBadge: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
    },
    indexText: { fontSize: 14, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    statusText: { fontSize: 12, fontWeight: '600' },
    cardBody: {},
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    dateText: { fontSize: 14 },
    amountsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    amountItem: { alignItems: 'center' },
    amountLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
    amountValue: { fontSize: 16, fontWeight: '700' },
    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    paymentText: { fontSize: 12 },
    errorCard: { marginHorizontal: 16, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500', marginBottom: 10 },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
    retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 15, marginTop: 12 },
});
