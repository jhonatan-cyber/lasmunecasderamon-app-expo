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

interface Servicio {
    id_servicio: number;
    codigo: string;
    tiempo: number;
    fecha_crea: string;
    precio_servicio: number;
    comision_usuario: number; // Nueva comisión específica del usuario
    habitacion: string;
    anfitriona: string;
    cliente: string;
    estado: number; // 1=En proceso, 0=Finalizado/Pagado
}

export default function ServiciosScreen() {
    const isDark = (useColorScheme() ?? 'dark') === 'dark';
    const [servicios, setServicios] = useState<Servicio[]>([]);
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
            const data = await apiClient('/servicios/user');
            if (data.success) {
                setServicios(data.data || []);
            } else {
                setError(data.message || 'Error al cargar servicios');
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
            const day = date.getDate();
            const month = date.toLocaleDateString('es-ES', { month: 'short' });
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
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

    // Filter logic
    const filteredData = servicios.filter((s) => {
        if (filter === 'pendiente') return s.estado === 1 || s.estado === 2 || s.estado === 3; // Activo, En proceso o Pausado
        if (filter === 'pagado') return s.estado === 0; // Finalizado/Pagado
        return true;
    });

    const pendientes = servicios.filter(s => s.estado === 1 || s.estado === 2 || s.estado === 3);
    const pagados = servicios.filter(s => s.estado === 0);

    // El "Total a Cobrar" son las comisiones de servicios que aún están pendientes o finalizados pero no cobrados.
    // En este sistema, si el servicio está en la lista de 'servicios' y tiene una comisión asignada, 
    // sumamos las comisiones de los servicios finalizados para el total a cobrar.
    const totalACobrar = pagados.reduce((sum, s) => sum + (s.comision_usuario || 0), 0);
    const totalEstimado = servicios.reduce((sum, s) => sum + (s.comision_usuario || 0), 0);

    const renderItem = ({ item, index }: { item: Servicio; index: number }) => {
        const isFinalizado = item.estado === 0;
        const isPausado = item.estado === 3;
        const isProceso = item.estado === 2;
        const isActivo = item.estado === 1;

        const getStatusStyles = () => {
            if (isFinalizado) return { bg: isDark ? '#065F46' : '#D1FAE5', text: isDark ? '#6EE7B7' : '#065F46', label: 'Finalizado' };
            if (isPausado) return { bg: isDark ? '#475569' : '#E2E8F0', text: isDark ? '#CBD5E1' : '#475569', label: 'Pausado' };
            return { bg: isDark ? '#7C2D12' : '#FEF3C7', text: isDark ? '#FDBA74' : '#92400E', label: 'En proceso' };
        };

        const status = getStatusStyles();

        return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.habitacionText, { color: textPrimary }]}>{item.habitacion}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                            <Text style={[styles.infoText, { color: textSecondary }]}>{formatDate(item.fecha_crea)}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="time-outline" size={14} color={textSecondary} />
                            <Text style={[styles.infoText, { color: textSecondary }]}>{formatTime(item.fecha_crea)}</Text>
                        </View>
                    </View>

                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Código:</Text>
                            <Text style={[styles.detailValue, { color: textPrimary }]}>{item.codigo}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Tiempo:</Text>
                            <Text style={[styles.detailValue, { color: textPrimary }]}>{item.tiempo} min</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Mi Comisión:</Text>
                            <Text style={[styles.priceValue, { color: '#10B981' }]}>${(item.comision_usuario || 0).toLocaleString()}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
                <ActivityIndicator size="large" color={textPrimary} />
                <Text style={[styles.loadingText, { color: textSecondary }]}>Cargando servicios...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>TOTAL A COBRAR (Finalizados)</Text>
                <Text style={styles.summaryAmount}>${totalACobrar.toLocaleString()}</Text>
                <View style={styles.summaryDetails}>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>Proyectado: ${totalEstimado.toLocaleString()}</Text>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>Servicios: {pagados.length}</Text>
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
                            {f === 'all' ? `Todos (${servicios.length})` : f === 'pendiente' ? `En proceso (${pendientes.length})` : `Finalizados (${pagados.length})`}
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
                keyExtractor={(item) => item.id_servicio.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textPrimary} />}
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="diamond-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron servicios</Text>
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
    summaryAmount: { fontSize: 34, fontWeight: '800', color: '#8B5CF6', marginBottom: 8 },
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
    card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    indexBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    indexText: { fontSize: 12, fontWeight: '700' },
    habitacionText: { fontSize: 18, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardBody: {},
    infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(156, 163, 175, 0.1)', paddingBottom: 10 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { fontSize: 12 },
    detailsContainer: { gap: 6 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { fontSize: 13, fontWeight: '500' },
    detailValue: { fontSize: 13, fontWeight: '600' },
    priceValue: { fontSize: 16, fontWeight: '800' },
    errorCard: { marginHorizontal: 16, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500', marginBottom: 10 },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
    retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
});
