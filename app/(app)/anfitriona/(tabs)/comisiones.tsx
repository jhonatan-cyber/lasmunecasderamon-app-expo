import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { useCallback, useRef, useState } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '../../../../api/client';
import { PremiumHeader } from '../../../../components/PremiumHeader';
import { SkeletonLoader as Skeleton } from '../../../../components/SkeletonLoader';
import { useAccentColor } from '../../../../hooks/useAccentColor';

interface Comision {
    id_comision: number;
    codigo: string | null;
    comision: number;
    fecha_crea: string;
    fecha_mod: string | null;
    estado: number; // 0=pagado, 1=pendiente
    tipo: 'venta' | 'servicio' | 'otro';
    total_original?: number;
    cliente_nombre?: string;
    habitacion_nombre?: string;
    productos?: any;
}

export default function ComisionesScreen() {
    const { accentColor, isDark } = useAccentColor();
    const [comisiones, setComisiones] = useState<Comision[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const [selectedComision, setSelectedComision] = useState<Comision | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const dataRef = useRef<string>('');

    const bg = isDark ? '#0F0D2E' : '#FFFFFF';
    const cardBg = isDark ? '#1E1B4B' : '#F3F4F6';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#64748B';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB';

    const fetchData = useCallback(async (isManual = false) => {
        try {
            setError('');
            const data = await apiClient('/commissions/user');
            if (data.success) {
                const onlyVentas = (data.data || []).filter((c: Comision) => c.tipo === 'venta');
                const serialized = JSON.stringify(onlyVentas);
                const hasChanges = dataRef.current !== serialized;
                dataRef.current = serialized;
                setComisiones(onlyVentas);

                if (isManual) {
                    Toast.show({
                        type: hasChanges ? 'success' : 'info',
                        text1: hasChanges ? 'Éxito' : 'Información',
                        text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                        visibilityTime: 3000
                    });
                }
            } else {
                setError(data.message || 'Error al cargar comisiones');
                if (isManual) {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: data.message || 'Error al cargar comisiones',
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

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData(true);
    }, [fetchData]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            const day = date.getUTCDate();
            const month = date.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' });
            const year = date.getUTCFullYear();
            return `${day} ${month} ${year}`;
        } catch { return 'Error'; }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
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
            <MotiView
                from={{ opacity: 0, translateY: 40 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: index * 100 }}
            >
                <Pressable
                    onPress={() => {
                        setSelectedComision(item);
                        setModalVisible(true);
                    }}
                    style={({ pressed }) => [
                        styles.card,
                        { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.8 : 1 }
                    ]}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {item.codigo ? (
                                <View style={[styles.ventaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Ionicons name="receipt-outline" size={12} color={accentColor} />
                                    <Text style={[styles.ventaText, { color: accentColor }]}>{item.codigo}</Text>
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
                            <Text style={[styles.amountValue, { color: isPendiente ? accentColor : '#10B981' }]}>
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
                </Pressable>
            </MotiView>
        );
    };

    const ComisionesSkeleton = () => (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Comisiones" subtitle="Mis ganancias por ventas" />
            <View style={{ margin: 16 }}>
                <Skeleton width="100%" height={140} borderRadius={16} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
                <Skeleton width="30%" height={35} borderRadius={20} />
                <Skeleton width="30%" height={35} borderRadius={20} />
                <Skeleton width="30%" height={35} borderRadius={20} />
            </View>
            <View style={{ padding: 16, gap: 10 }}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor, backgroundColor: cardBg }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                            <Skeleton width={32} height={32} borderRadius={16} />
                            <Skeleton width={120} height={20} borderRadius={10} />
                        </View>
                        <Skeleton height={15} width="80%" style={{ marginBottom: 12 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <View style={{ gap: 5 }}>
                                <Skeleton width={100} height={15} />
                                <Skeleton width={120} height={15} />
                            </View>
                            <Skeleton width={80} height={30} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    if (loading) return <ComisionesSkeleton />;

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Comisiones" subtitle="Mis ganancias por ventas" />

            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>COMISIONES POR VENTAS (Pendiente)</Text>
                <Text style={[styles.summaryAmount, { color: accentColor }]}>${totalPendiente.toLocaleString()}</Text>
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
                        style={[styles.filterButton, { backgroundColor: filter === f ? accentColor : cardBg, borderColor: filter === f ? accentColor : borderColor }]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textSecondary }]}>
                            {f === 'all' ? `Todas (${comisiones.length})` : f === 'pendiente' ? `Pendientes (${pendientes.length})` : `Pagadas (${comisiones.length - pendientes.length})`}
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
                keyExtractor={(item) => item.id_comision.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="cart-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No hay comisiones por ventas registradas</Text>
                    </View>
                }
            />

            {/* Detail Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor }]}>
                        {selectedComision && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalles de Venta</Text>
                                        <Text style={[styles.modalSubText, { color: textSecondary }]}>Código: {selectedComision.codigo || 'N/A'}</Text>
                                    </View>
                                    <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                        <Ionicons name="close" size={24} color={textSecondary} />
                                    </Pressable>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                    <View style={styles.detailsGrid}>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>FECHA</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{formatDate(selectedComision.fecha_crea)}</Text>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>HORA</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{formatTime(selectedComision.fecha_crea)}</Text>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedComision.cliente_nombre || "Sin cliente"}</Text>
                                        </View>
                                        <View style={styles.gridItem}>
                                            <Text style={[styles.gridLabel, { color: textSecondary }]}>HABITACIÓN</Text>
                                            <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedComision.habitacion_nombre || "Barra"}</Text>
                                        </View>
                                    </View>

                                    {selectedComision.productos && (
                                        <View style={{ marginBottom: 20 }}>
                                            <Text style={[styles.sectionTitle, { color: textSecondary }]}>PRODUCTOS</Text>
                                            {typeof selectedComision.productos === 'string' ? JSON.parse(selectedComision.productos).map((p: any, idx: number) => (
                                                <View key={idx} style={styles.productRow}>
                                                    <Text style={[styles.productText, { color: textPrimary }]}>{p.cantidad}x {p.nombre}</Text>
                                                </View>
                                            )) : selectedComision.productos.map((p: any, idx: number) => (
                                                <View key={idx} style={styles.productRow}>
                                                    <Text style={[styles.productText, { color: textPrimary }]}>{p.cantidad}x {p.nombre}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <View style={[styles.summarySection, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor }]}>
                                        <View style={styles.summaryRow}>
                                            <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>ESTADO DE PAGO</Text>
                                            <Text style={[styles.totalValFinal, { color: selectedComision.estado === 0 ? '#10B981' : '#EF4444', fontSize: 18 }]}>
                                                {selectedComision.estado === 0 ? 'COBRADA ✓' : 'POR COBRAR ⚠'}
                                            </Text>
                                        </View>
                                        <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#E5E7EB', paddingTop: 12 }]}>
                                            <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>ESTA ES MI COMISIÓN</Text>
                                            <Text style={[styles.totalValFinal, { color: accentColor, fontSize: 26 }]}>${(selectedComision.comision || 0).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </ScrollView>

                                <Pressable
                                    style={[styles.modalCloseBtn, { backgroundColor: accentColor }]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalCloseBtnText}>Cerrar Detalles</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 15 },
    summaryCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1 },
    summaryLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
    summaryAmount: { fontSize: 38, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
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

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    detailModal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%', borderTopWidth: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitleText: { fontSize: 24, fontWeight: '900' },
    modalSubText: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(156, 163, 175, 0.1)', justifyContent: 'center', alignItems: 'center' },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    gridItem: { width: '47%', padding: 12, borderRadius: 16, backgroundColor: 'rgba(156, 163, 175, 0.05)', justifyContent: 'center' },
    gridLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
    gridValue: { fontSize: 13, fontWeight: '700' },
    summarySection: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabelFinal: { fontSize: 14, fontWeight: '900' },
    totalValFinal: { fontSize: 22, fontWeight: '900' },
    modalCloseBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalCloseBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
    productRow: { marginBottom: 8, paddingLeft: 12 },
    productText: { fontSize: 14, fontWeight: '600' },
});
