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

interface Comision {
    id_comision: number;
    codigo: string | null;
    comision: number;
    fecha_crea: string;
    fecha_mod: string | null;
    estado: number; // 0=pagado, 1=pendiente
    tipo: 'venta' | 'servicio' | 'otro';
}

export default function ComisionesScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const [comisiones, setComisiones] = useState<Comision[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const fetchData = useCallback(async () => {
        try {
            setError('');
            const data = await apiClient('/commissions/user');
            if (data.success) {
                // Filtramos solo las que son de tipo 'venta' (productos) según lo solicitado
                const onlyVentas = (data.data || []).filter((c: Comision) => c.tipo === 'venta');
                setComisiones(onlyVentas);
            } else {
                setError(data.message || 'Error al cargar comisiones');
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            return `${date.getDate()} ${date.toLocaleDateString('es-ES', { month: 'short' })} ${date.getFullYear()}`;
        } catch { return 'Error'; }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const filteredData = comisiones.filter((a) => {
        if (filter === 'pendiente') return a.estado === 1;
        if (filter === 'pagado') return a.estado === 0;
        return true;
    });

    const pendientes = comisiones.filter((a) => a.estado === 1);
    const totalPendiente = pendientes.reduce((sum, a) => sum + (a.comision || 0), 0);
    const totalGeneral = comisiones.reduce((sum, a) => sum + (a.comision || 0), 0);

    const renderItem = ({ item, index }: { item: Comision; index: number }) => {
        const isPendiente = item.estado === 1;
        return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                        <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {item.codigo ? (
                            <View style={[styles.ventaBadge, { backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE' }]}>
                                <Ionicons name="receipt-outline" size={12} color={isDark ? '#93C5FD' : '#1E40AF'} />
                                <Text style={[styles.ventaText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>{item.codigo}</Text>
                            </View>
                        ) : null}
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: isPendiente ? (isDark ? '#065F46' : '#D1FAE5') : (isDark ? '#1E3A5F' : '#DBEAFE') }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: isPendiente ? (isDark ? '#6EE7B7' : '#065F46') : (isDark ? '#93C5FD' : '#1E40AF') }
                            ]}>
                                {isPendiente ? 'Por cobrar' : 'Pagada'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={16} color={textSecondary} />
                        <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                        <Text style={[styles.timeText, { color: textSecondary }]}>{formatTime(item.fecha_crea)}</Text>
                    </View>

                    <View style={styles.amountRow}>
                        <View>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Comisión por Venta</Text>
                            <Text style={[styles.typeBadge, { color: '#3B82F6' }]}>Venta de Productos</Text>
                        </View>
                        <Text style={[styles.amountValue, { color: '#10B981' }]}>
                            ${(item.comision || 0).toLocaleString()}
                        </Text>
                    </View>

                    {item.fecha_mod && item.estado === 0 ? (
                        <View style={styles.paymentRow}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={[styles.paymentText, { color: textSecondary }]}>Pagada el: {formatDate(item.fecha_mod)}</Text>
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
                <Text style={[styles.loadingText, { color: textSecondary }]}>Cargando comisiones...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>COMISIONES POR VENTAS (Pendiente)</Text>
                <Text style={styles.summaryAmount}>${totalPendiente.toLocaleString()}</Text>
                <View style={styles.summaryDetails}>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                        Historial total: ${totalGeneral.toLocaleString()}
                    </Text>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                        Pendientes: {pendientes.length}
                    </Text>
                </View>
            </View>

            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado'] as const).map((f) => (
                    <Pressable
                        key={f}
                        style={[styles.filterButton, { backgroundColor: filter === f ? textPrimary : cardBg, borderColor }]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, { color: filter === f ? bg : textSecondary }]}>
                            {f === 'all' ? `Todas (${comisiones.length})` : f === 'pendiente' ? `Pendientes (${pendientes.length})` : `Pagadas (${comisiones.length - pendientes.length})`}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {error ? (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' }]}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                    <Pressable onPress={fetchData} style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id_comision.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />}
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="cart-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No hay comisiones por ventas registradas</Text>
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
    summaryCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1 },
    summaryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    summaryAmount: { fontSize: 34, fontWeight: '800', color: '#10B981', marginBottom: 8 },
    summaryDetails: { flexDirection: 'row', gap: 16 },
    summaryDetail: { fontSize: 13 },
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 8 },
    filterButton: { flex: 1, paddingVertical: 8, borderRadius: 9999, alignItems: 'center', borderWidth: 1 },
    filterText: { fontSize: 11, fontWeight: '600' },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    indexBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    indexText: { fontSize: 14, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    statusText: { fontSize: 12, fontWeight: '600' },
    ventaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
    ventaText: { fontSize: 11, fontWeight: '600' },
    cardBody: {},
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    dateText: { fontSize: 14 },
    timeText: { fontSize: 13, marginLeft: 6 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amountLabel: { fontSize: 13, fontWeight: '600' },
    typeBadge: { fontSize: 11, fontWeight: '500', marginTop: 2 },
    amountValue: { fontSize: 22, fontWeight: '800' },
    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    paymentText: { fontSize: 12 },
    errorCard: { marginHorizontal: 16, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500', marginBottom: 10 },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
    retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
});
