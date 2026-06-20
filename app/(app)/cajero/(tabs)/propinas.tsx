import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { MotiView } from 'moti';
import { useCallback, useRef, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { apiClient } from '@/api/client';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader as Skeleton } from '@/components/ui/SkeletonLoader';
import { TipDetailModal } from '@/components/shared/TipDetailModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { rotateColor } from "@/utils/colors";
import { parseDateSafe } from "@/utils/timeUtils";

import logger from '@/utils/logger';
interface Propina {
    id_detalle_propina: string;
    propina_id: string;
    usuario_id: string;
    monto: number;
    fecha_crea: string;
    estado: number; 
    propina_fecha_crea: string | null;
    codigo_venta: string | null;
    venta_id?: string;
    total_tip_monto?: number;
    total_participants?: number;
}

interface SaleDetail {
    codigo: string;
    fecha_crea: string;
    cliente_nombre: string | null;
    metodo_pago: string;
    total: number;
    propina: number;
    detalles: any[];
    garzon_nombre?: string | null;
    cajero_nombre?: string | null;
    habitacion_nombre?: string | null;
    tiempo?: number;
    usuarios?: any[];
}

export default function PropinasScreen() {
    const { accentColor, isDark } = useAccentColor();
    const [propinas, setPropinas] = useState<Propina[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const dataRef = useRef<string>('');

    
    const [selectedPropina, setSelectedPropina] = useState<Propina | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [saleDetail, setSaleDetail] = useState<SaleDetail | null>(null);
    const [parentPropina, setParentPropina] = useState<any>(null);

    const bg = isDark ? '#000000' : '#F3F4F6';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

    const fetchData = useCallback(async (isManual = false) => {
        try {
            setError('');
            const data = await apiClient('/tips/user?tipo=detalle');
            if (data.success) {
                const serialized = JSON.stringify(data.data);
                const hasChanges = dataRef.current !== serialized;
                dataRef.current = serialized;
                setPropinas(data.data || []);

                if (isManual) {
                    Toast.show({
                        type: hasChanges ? 'success' : 'info',
                        text1: hasChanges ? 'Éxito' : 'Información',
                        text2: hasChanges ? 'Datos actualizados' : 'Sin cambios en los datos',
                        visibilityTime: 3000
                    });
                }
            } else {
                setError(data.message || 'Error al cargar propinas');
                if (isManual) {
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: data.message || 'Error al cargar propinas',
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

    const handlePropinaPress = async (item: Propina) => {
        setSelectedPropina(item);
        setModalVisible(true);
        setLoadingDetail(true);
        setSaleDetail(null);
        setParentPropina(null);

        try {
            
            const tipRes = await apiClient<{ success: boolean; data: any }>(`/tips/${item.propina_id}`);
            if (tipRes.success) {
                setParentPropina(tipRes.data);

                
                if (tipRes.data.venta_id) {
                    const saleRes = await apiClient<{ success: boolean; data: any }>(`/ventas/${tipRes.data.venta_id}`);
                    if (saleRes && saleRes.success) {
                        setSaleDetail(saleRes.data);
                    }
                }
            }
        } catch (error) {
            logger.captureException(error, { context: 'Propinas:fetchTips' });
            
            if (item.codigo_venta) {
                
            }
        } finally {
            setLoadingDetail(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = parseDateSafe(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            const day = date.getUTCDate();
            const month = date.toLocaleDateString('es-ES', { month: 'short' });
            const year = date.getUTCFullYear();
            return `${day} ${month} ${year}`;
        } catch { return 'Error'; }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = parseDateSafe(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const filteredData = propinas.filter((a) => {
        if (filter === 'pendiente') return a.estado === 1;
        if (filter === 'pagado') return a.estado === 0;
        return true;
    });

    const pendientes = propinas.filter((a) => a.estado === 1);
    const totalPendiente = pendientes.reduce((sum, a) => sum + (a.monto || 0), 0);
    const totalGeneral = propinas.reduce((sum, a) => sum + (a.monto || 0), 0);

    const renderItem = ({ item, index }: { item: Propina; index: number }) => {
        const isPendiente = item.estado === 1;
        
        const idNum = typeof item.id_detalle_propina === 'string' ? item.id_detalle_propina.split('-').pop()?.substring(0, 2) : item.id_detalle_propina;
        const itemAccent = rotateColor(accentColor, ((Number(idNum) || index) % 10) * 36);

        return (
            <MotiView
                from={{ opacity: 0, translateY: 30 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: index * 100 }}
            >
                <Pressable onPress={() => handlePropinaPress(item)}>
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                                <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {item.codigo_venta ? (
                                    <View style={[styles.ventaBadge, { backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE' }]}>
                                        <Ionicons name="receipt-outline" size={12} color={isDark ? '#93C5FD' : '#1E40AF'} />
                                        <Text style={[styles.ventaText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>Codigo : {item.codigo_venta}</Text>
                                    </View>
                                ) : null}
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: isPendiente ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : (isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE') }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        { color: isPendiente ? (isDark ? '#10B981' : '#065F46') : (isDark ? '#3B82F6' : '#1E40AF') }
                                    ]}>
                                        {isPendiente ? 'Por cobrar' : 'Cobrada'}
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
                                <Text style={[styles.amountLabel, { color: textSecondary }]}>Mi parte</Text>
                                <Text style={[styles.amountValue, { color: isPendiente ? itemAccent : accentColor }]}>
                                    ${(item.monto || 0).toLocaleString()}
                                </Text>
                            </View>

                            {item.propina_fecha_crea && item.estado === 0 ? (
                                <View style={styles.paymentRow}>
                                    <Ionicons name="checkmark-circle" size={14} color={accentColor} />
                                    <Text style={[styles.paymentText, { color: textSecondary }]}>Pagada: {formatDate(item.propina_fecha_crea)}</Text>
                                </View>
                            ) : null}

                            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: accentColor, fontSize: 11, fontWeight: '700' }}>Ver detalles de venta</Text>
                                <Ionicons name="chevron-forward" size={12} color={accentColor} />
                            </View>
                        </View>
                    </View>
                </Pressable>
            </MotiView>
        );
    };

    const renderPropinasSkeleton = () => (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Propinas" subtitle="Mis ganancias por servicio" />
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
                            <Skeleton width={80} height={20} borderRadius={10} />
                        </View>
                        <Skeleton height={15} width="60%" style={{ marginBottom: 15 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Skeleton width={60} height={20} />
                            <Skeleton width={100} height={30} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    if (loading) return renderPropinasSkeleton();

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title="Propinas" subtitle="Mis ganancias por servicio" />

            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor, shadowColor: accentColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>PROPINAS PENDIENTES</Text>
                <Text style={[styles.summaryAmount, { color: accentColor }]}>${totalPendiente.toLocaleString()}</Text>
                <View style={styles.summaryDetails}>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                        Recibido: ${totalGeneral.toLocaleString()}
                    </Text>
                    <View style={{ width: 1, height: 12, backgroundColor: borderColor, alignSelf: 'center' }} />
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>
                        Items: {pendientes.length}
                    </Text>
                </View>
            </View>

            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado'] as const).map((f) => (
                    <Pressable
                        key={f}
                        style={[
                            styles.filterButton,
                            {
                                backgroundColor: filter === f ? accentColor : cardBg,
                                borderColor: filter === f ? accentColor : borderColor
                            }
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textSecondary }]}>
                            {f === 'all' ? `Todas (${propinas.length})` : f === 'pendiente' ? `Pendientes (${pendientes.length})` : `Cobradas (${propinas.length - pendientes.length})`}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {error ? (
                <View style={[styles.errorCard, { backgroundColor: isDark ? '#1C1917' : '#FEF2F2' }]}>
                    <Text style={styles.errorText}>âš ï¸ {error}</Text>
                    <Pressable onPress={() => fetchData()} style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}>
                        <Text style={styles.retryText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : null}

            <FlatList
                data={filteredData}
                keyExtractor={(item, index) => item.id_detalle_propina?.toString() ?? index.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
                        <Ionicons name="cash-outline" size={48} color={textSecondary} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron propinas</Text>
                    </View>
                }
            />

            <TipDetailModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                loading={loadingDetail}
                selectedPropina={selectedPropina}
                parentPropina={parentPropina}
                saleDetail={saleDetail}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 15 },
    summaryCard: {
        marginHorizontal: 16, marginTop: 16, borderRadius: 24,
        padding: 24, alignItems: 'center', borderWidth: 1,
        elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
    },
    summaryLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
    summaryAmount: { fontSize: 38, fontWeight: '900', marginBottom: 12 },
    summaryDetails: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    summaryDetail: { fontSize: 13, fontWeight: '600' },
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
    amountLabel: { fontSize: 14, fontWeight: '600' },
    amountValue: { fontSize: 20, fontWeight: '800' },
    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    paymentText: { fontSize: 12 },
    errorCard: { marginHorizontal: 16, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500', marginBottom: 10 },
    retryButton: { backgroundColor: '#EF4444', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999 },
    retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    emptyCard: { borderRadius: 16, padding: 40, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 14, marginTop: 12, textAlign: 'center' },

    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
        height: '85%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    modalSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    closeBtn: { padding: 4 },
    detailLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    divisionCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    divisionItem: { flex: 1, alignItems: 'center' },
    divisionLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    divisionValue: { fontSize: 16, fontWeight: '800' },
    divisionDivider: { width: 1, height: '60%', backgroundColor: 'rgba(155,155,155,0.2)' },

    sectionTitle: { fontSize: 11, fontWeight: '900', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
    productsList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
    productNameDetail: { fontSize: 14, fontWeight: '700' },
    productSubtotal: { fontSize: 14, fontWeight: '800' },
    saleTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderTopWidth: 1 },
    saleTotalLabel: { fontSize: 13, fontWeight: '800' },
    saleTotalValue: { fontSize: 16, fontWeight: '900' },

    closeModalBtn: {
        height: 54,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5
    },
    closeModalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});


