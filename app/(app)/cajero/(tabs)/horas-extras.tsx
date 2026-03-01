import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../../api/client';
import { Skeleton } from '../../../../components/ui/Skeleton';

interface HoraExtra {
    id_hora_extra: number;
    fecha_crea: string;
    fecha_mod: string | null;
    hora: string;
    monto: number;
    total: number;
    estado: number; // 0=pagado, 1=pendiente
    fecha_formatted: string;
}

export default function HorasExtrasScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const [horasExtras, setHorasExtras] = useState<HoraExtra[]>([]);
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

    const fetchData = useCallback(async (isManual = false) => {
        try {
            setError('');
            const data = await apiClient('/overtime/user');
            if (data.success) {
                const serialized = JSON.stringify(data.data);
                const hasChanges = dataRef.current !== serialized;
                dataRef.current = serialized;
                setHorasExtras(data.data || []);

                if (isManual) {
                    Toast.show({
                        type: hasChanges ? 'success' : 'info',
                        text1: hasChanges ? 'Éxito' : 'Información',
                        text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                        visibilityTime: 3000
                    });
                }
            } else {
                setError(data.message || 'Error al cargar horas extras');
                if (isManual) {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: data.message || 'Error al cargar horas extras',
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

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            return `${date.getDate()} ${date.toLocaleDateString('es-ES', { month: 'short' })} ${date.getFullYear()}`;
        } catch { return 'Error'; }
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
            <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: index * 50 }}
            >
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                        </View>
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

                    <View style={styles.cardBody}>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={16} color={textSecondary} />
                            <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                            {item.hora ? (
                                <>
                                    <Ionicons name="time-outline" size={16} color={textSecondary} style={{ marginLeft: 12 }} />
                                    <Text style={[styles.dateText, { color: textSecondary }]}>{item.hora}</Text>
                                </>
                            ) : null}
                        </View>

                        <View style={styles.amountsRow}>
                            <View style={styles.amountItem}>
                                <Text style={[styles.amountLabel, { color: textSecondary }]}>Monto/hr</Text>
                                <Text style={[styles.amountValue, { color: textPrimary }]}>${(item.monto || 0).toLocaleString()}</Text>
                            </View>
                            <View style={styles.amountItem}>
                                <Text style={[styles.amountLabel, { color: textSecondary }]}>Total</Text>
                                <Text style={[styles.amountValue, { color: '#E11D48', fontWeight: '800' }]}>${(item.total || 0).toLocaleString()}</Text>
                            </View>
                        </View>

                        {item.fecha_mod && item.estado === 0 ? (
                            <View style={styles.paymentRow}>
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                <Text style={[styles.paymentText, { color: textSecondary }]}>Pagado: {formatDate(item.fecha_mod)}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </MotiView>
        );
    };

    const ListSkeleton = () => (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <View style={{ margin: 16 }}>
                <Skeleton height={140} borderRadius={16} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 15 }}>
                <Skeleton style={{ flex: 1 }} height={35} borderRadius={20} />
                <Skeleton style={{ flex: 1 }} height={35} borderRadius={20} />
                <Skeleton style={{ flex: 1 }} height={35} borderRadius={20} />
            </View>
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor, backgroundColor: cardBg }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                            <Skeleton width={32} height={32} borderRadius={16} />
                            <Skeleton width={80} height={20} borderRadius={10} />
                        </View>
                        <Skeleton height={15} width="60%" style={{ marginBottom: 15 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                            <Skeleton width={80} height={30} />
                            <Skeleton width={80} height={30} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    if (loading) return <ListSkeleton />;

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>HORAS EXTRAS PENDIENTES</Text>
                <Text style={[styles.summaryAmount, { color: '#E11D48' }]}>${totalPendiente.toLocaleString()}</Text>
                <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                    {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} de {horasExtras.length} total
                </Text>
            </View>

            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado'] as const).map((f) => (
                    <Pressable
                        key={f}
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: filter === f ? '#E11D48' : cardBg,
                                borderColor: filter === f ? '#E11D48' : borderColor
                            }
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textSecondary }]}>
                            {f === 'all' ? `Todas (${horasExtras.length})` : f === 'pendiente' ? `Pendientes (${pendientes.length})` : `Cobradas (${horasExtras.length - pendientes.length})`}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {error ? (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' }]}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                    <Pressable onPress={() => fetchData()} style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id_hora_extra.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />}
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="time-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron horas extras</Text>
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
    summaryLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
    summaryAmount: { fontSize: 34, fontWeight: '800', marginBottom: 8 },
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
    cardBody: {},
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    dateText: { fontSize: 14 },
    amountsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    amountItem: { alignItems: 'center' },
    amountLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
    amountValue: { fontSize: 18, fontWeight: '700' },
    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    paymentText: { fontSize: 12 },
    errorCard: { marginHorizontal: 16, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500', marginBottom: 10 },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
    retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 15, marginTop: 12 },
});
