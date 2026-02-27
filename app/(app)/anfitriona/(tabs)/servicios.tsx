import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from 'react-native';
import { apiClient } from '../../../../api/client';
import { Skeleton } from '../../../../components/ui/Skeleton';

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
    estado: number; // 0=Anulado, 1=Finalizado, 2=En Proceso, 3=Pausado, 4=Solicitud Anulación
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

    const ServicesSkeleton = () => (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <View style={{ margin: 16 }}>
                <Skeleton height={120} borderRadius={16} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
                <Skeleton style={{ flex: 1 }} height={35} borderRadius={20} />
                <Skeleton style={{ flex: 1 }} height={35} borderRadius={20} />
                <Skeleton style={{ flex: 1 }} height={35} borderRadius={20} />
            </View>
            <View style={{ padding: 16, gap: 10 }}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor, backgroundColor: cardBg }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                            <Skeleton width={120} height={20} />
                            <Skeleton width={80} height={20} borderRadius={10} />
                        </View>
                        <Skeleton height={15} width="60%" style={{ marginBottom: 10 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Skeleton width={100} height={25} />
                            <Skeleton width={60} height={25} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

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

    const handleAssistance = async (servicioId: number, roomName: string, type: string) => {
        const performRequest = async () => {
            try {
                const res = await apiClient('/notifications/assistance', {
                    method: 'POST',
                    body: JSON.stringify({
                        servicioId,
                        roomName,
                        type
                    })
                });

                if (res.success) {
                    Alert.alert('Solicitud enviada', `Se ha solicitado ${type} para la habitación ${roomName}`);
                }
            } catch (err) {
                Alert.alert('Error', 'No se pudo enviar la solicitud');
            }
        };

        if (type === 'Seguridad') {
            Alert.alert(
                'Confirmar Seguridad',
                `¿Estás seguro de solicitar personal de SEGURIDAD para la habitación ${roomName}?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'SÍ, LLAMAR', style: 'destructive', onPress: performRequest }
                ]
            );
        } else {
            performRequest();
        }
    };

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
        if (filter === 'pendiente') return s.estado === 2 || s.estado === 3 || s.estado === 4; // En proceso, Pausado o Solicitud
        if (filter === 'pagado') return s.estado === 1; // Finalizado
        return true;
    });

    const pendientes = servicios.filter(s => s.estado === 2 || s.estado === 3 || s.estado === 4);
    const pagados = servicios.filter(s => s.estado === 1);

    // El "Total a Cobrar" son las comisiones de servicios que aún están pendientes o finalizados pero no cobrados.
    // En este sistema, si el servicio está en la lista de 'servicios' y tiene una comisión asignada, 
    // sumamos las comisiones de los servicios finalizados para el total a cobrar.
    const totalACobrar = pagados.reduce((sum, s) => sum + (s.comision_usuario || 0), 0);
    const totalEstimado = servicios.reduce((sum, s) => sum + (s.comision_usuario || 0), 0);

    const renderItem = ({ item, index }: { item: Servicio; index: number }) => {
        const isAnulado = item.estado === 0;
        const isFinalizado = item.estado === 1;
        const isProceso = item.estado === 2;
        const isPausado = item.estado === 3;
        const isSolicitud = item.estado === 4;

        const getStatusStyles = () => {
            if (isAnulado) return { bg: isDark ? '#450a0a' : '#fee2e2', text: isDark ? '#f87171' : '#991b1b', label: 'Anulado' };
            if (isFinalizado) return { bg: isDark ? '#065F46' : '#D1FAE5', text: isDark ? '#6EE7B7' : '#065F46', label: 'Finalizado' };
            if (isPausado) return { bg: isDark ? '#475569' : '#E2E8F0', text: isDark ? '#CBD5E1' : '#475569', label: 'Pausado' };
            if (isSolicitud) return { bg: isDark ? '#1e3a8a' : '#dbeafe', text: isDark ? '#60a5fa' : '#1e40af', label: 'Solicitud Anul.' };
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

                    {isProceso && (
                        <View style={styles.assistanceContainer}>
                            <Text style={[styles.assistanceTitle, { color: textSecondary }]}>SILENT ASSISTANCE:</Text>
                            <View style={styles.assistanceGrid}>
                                <Pressable
                                    style={[styles.assistanceBtn, { backgroundColor: isDark ? '#1e1b4b' : '#e0e7ff' }]}
                                    onPress={() => handleAssistance(item.id_servicio, item.habitacion, 'Tragos')}
                                >
                                    <Ionicons name="beer-outline" size={14} color={isDark ? '#818cf8' : '#3730a3'} />
                                    <Text style={[styles.assistanceBtnText, { color: isDark ? '#818cf8' : '#3730a3' }]}>Tragos</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.assistanceBtn, { backgroundColor: isDark ? '#064e3b' : '#d1fae5' }]}
                                    onPress={() => handleAssistance(item.id_servicio, item.habitacion, 'Limpieza/Hielo')}
                                >
                                    <Ionicons name="sparkles-outline" size={14} color={isDark ? '#34d399' : '#065f46'} />
                                    <Text style={[styles.assistanceBtnText, { color: isDark ? '#34d399' : '#065f46' }]}>Servicio</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.assistanceBtn, { backgroundColor: isDark ? '#450a0a' : '#fee2e2' }]}
                                    onPress={() => handleAssistance(item.id_servicio, item.habitacion, 'Seguridad')}
                                >
                                    <Ionicons name="alert-circle-outline" size={14} color={isDark ? '#f87171' : '#b91c1c'} />
                                    <Text style={[styles.assistanceBtnText, { color: isDark ? '#f87171' : '#b91c1c' }]}>ALERTA</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (loading) return <ServicesSkeleton />;

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
    assistanceContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(156, 163, 175, 0.1)' },
    assistanceTitle: { fontSize: 10, fontWeight: '800', marginBottom: 10, letterSpacing: 0.5 },
    assistanceGrid: { flexDirection: 'row', gap: 8 },
    assistanceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
    assistanceBtnText: { fontSize: 11, fontWeight: '700' },
});
