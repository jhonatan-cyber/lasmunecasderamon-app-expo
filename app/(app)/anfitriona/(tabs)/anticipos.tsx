import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../../api/client';

interface Anticipo {
    id_anticipo: number;
    usuario_id: number;
    fecha_crea: string;
    fecha_mod: string | null;
    monto: number;
    estado: number; // 0=pagado, 1=por pagar
    estado_texto: string;
    usuario: string;
}

export default function AnticiposScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const dataRef = useRef<string>('');

    const bg = isDark ? '#000000' : '#FFFFFF';
    const cardBg = isDark ? '#1F2937' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#000000';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? '#374151' : '#E5E7EB';

    const fetchAnticipos = useCallback(async (isManual = false) => {
        try {
            setError('');
            const data = await apiClient('/anticipos/user');
            if (data.success) {
                const serialized = JSON.stringify(data.data);
                const hasChanges = dataRef.current !== serialized;
                dataRef.current = serialized;
                setAnticipos(data.data || []);
                
                if (isManual) {
                    Toast.show({
                        type: hasChanges ? 'success' : 'info',
                        text1: hasChanges ? 'Éxito' : 'Información',
                        text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                        visibilityTime: 3000
                    });
                }
            } else {
                setError(data.message || 'Error al cargar anticipos');
                if (isManual) {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: data.message || 'Error al cargar anticipos',
                        visibilityTime: 3000
                    });
                }
            }
        } catch (err: any) {
            setError(err.message || 'Error de conexión');
            if (isManual) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No se pudo actualizar',
                    visibilityTime: 3000
                });
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAnticipos();
    }, [fetchAnticipos]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAnticipos(true);
    }, [fetchAnticipos]);

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

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    // Filter
    const filteredData = anticipos.filter((a) => {
        if (filter === 'pendiente') return a.estado === 1;
        if (filter === 'pagado') return a.estado === 0;
        return true;
    });

    // Totals
    const pendientes = anticipos.filter((a) => a.estado === 1);
    const totalPendiente = pendientes.reduce((sum, a) => sum + (a.monto || 0), 0);
    const totalGeneral = anticipos.reduce((sum, a) => sum + (a.monto || 0), 0);

    const renderItem = ({ item, index }: { item: Anticipo; index: number }) => {
        const isPendiente = item.estado === 1;
        return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                        <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: isPendiente ? (isDark ? '#7C2D12' : '#FEF3C7') : (isDark ? '#065F46' : '#D1FAE5') }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: isPendiente ? (isDark ? '#FDBA74' : '#92400E') : (isDark ? '#6EE7B7' : '#065F46') }
                        ]}>
                            {isPendiente ? 'Por pagar' : 'Pagado'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={16} color={textSecondary} />
                        <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                        <Text style={[styles.timeText, { color: textSecondary }]}>{formatTime(item.fecha_crea)}</Text>
                    </View>

                    <View style={styles.amountRow}>
                        <Text style={[styles.amountLabel, { color: textSecondary }]}>Monto</Text>
                        <Text style={[styles.amountValue, { color: isPendiente ? '#F59E0B' : '#10B981' }]}>
                            ${(item.monto || 0).toLocaleString()}
                        </Text>
                    </View>

                    {item.fecha_mod && item.estado === 0 ? (
                        <View style={styles.paymentRow}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={[styles.paymentText, { color: textSecondary }]}>
                                Pagado: {formatDate(item.fecha_mod)}
                            </Text>
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
                <Text style={[styles.loadingText, { color: textSecondary }]}>Cargando anticipos...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>ANTICIPOS PENDIENTES</Text>
                <Text style={[styles.summaryAmount, { color: '#F59E0B' }]}>${totalPendiente.toLocaleString()}</Text>
                <View style={styles.summaryDetails}>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                        Total solicitado: ${totalGeneral.toLocaleString()}
                    </Text>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                        Pendientes: {pendientes.length}
                    </Text>
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado'] as const).map((f) => (
                    <Pressable
                        key={f}
                        style={[
                            styles.filterButton,
                            { backgroundColor: filter === f ? textPrimary : cardBg, borderColor },
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, { color: filter === f ? bg : textSecondary }]}>
                            {f === 'all' ? `Todos (${anticipos.length})` : f === 'pendiente' ? `Por pagar (${pendientes.length})` : `Pagados (${anticipos.length - pendientes.length})`}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {error ? (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' }]}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                    <Pressable onPress={() => fetchAnticipos()} style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id_anticipo.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />
                }
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="card-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron anticipos</Text>
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
    summaryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    summaryAmount: { fontSize: 34, fontWeight: '800', marginBottom: 8 },
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
    timeText: { fontSize: 13, marginLeft: 6 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amountLabel: { fontSize: 14, fontWeight: '600' },
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
