import { Ionicons } from '@expo/vector-icons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useState, useCallback } from 'react';
import { useStableCallback } from '@/hooks/useStableCallback';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import FlashList from "@/components/shared/FlashList";
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { TipDetailModal } from '@/components/shared/TipDetailModal';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useFinancialEvents } from '@/hooks/useFinancialEvents';
import { apiClientSafe } from '@/api/client';
import { parseDateSafe } from "@/utils/timeUtils";


import logger from '@/utils/logger';
interface FinancialEventsScreenProps {
    title: string;
    subtitle: string;
    type: 'comisiones' | 'propinas';
}

export function FinancialEventsScreen({ title, subtitle, type }: FinancialEventsScreenProps) {
    const { accentColor, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
    const { data, loading, refreshing, onRefresh } = useFinancialEvents(type as any);
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [saleDetail, setSaleDetail] = useState<any>(null);
    const [parentPropina, setParentPropina] = useState<any>(null);



    const formatDate = useCallback((dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = parseDateSafe(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            const day = date.getUTCDate();
            const month = date.toLocaleDateString('es-ES', { month: 'short' });
            const year = date.getUTCFullYear();
            return `${day} ${month} ${year}`;
        } catch { return 'Error'; }
    }, []);

    const formatTime = useCallback((dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = parseDateSafe(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    }, []);

    const handleItemPress = useCallback(async (item: any) => {
        setSelectedItem(item);
        setModalVisible(true);
        setLoadingDetail(true);
        setSaleDetail(null);
        setParentPropina(null);

        try {
            if (type === 'propinas') {
                const tipRes = await apiClientSafe(`/tips/${item.propina_id}`);
                if ((tipRes as any).success) {
                    setParentPropina((tipRes as any).data);
                    if ((tipRes as any).data?.venta_id) {
                        const saleRes = await apiClientSafe(`/ventas/${(tipRes as any).data.venta_id}`);
                        if (saleRes && !(saleRes as any).error) setSaleDetail((saleRes as any).data || saleRes);
                    }
                }
            } else {
                
            }
        } catch (e) { logger.captureException(e, { context: 'FinancialEventsScreen:fetchDetail' }); } finally { setLoadingDetail(false); }
    }, [type]);

    const filteredData = data.filter((a: any) => {
        if (filter === 'pendiente') return a.estado === 1;
        if (filter === 'pagado') return a.estado === 0;
        return true;
    });

    const pendientes = data.filter((a: any) => a.estado === 1);
    const totalPendiente = pendientes.reduce((sum, a) => sum + (a.comision || a.monto || 0), 0);
    const totalGeneral = data.reduce((sum, a) => sum + (a.comision || a.monto || 0), 0);

    const renderItem = useStableCallback(({ item, index }: { item: any; index: number }) => {
        const isPendiente = item.estado === 1;
        const amount = item.comision || item.monto || 0;
        const code = item.codigo || item.codigo_venta;

        return (
            <AnimatedView from={{ opacity: 0, translateY: 30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 100 }}>
                <Pressable onPress={() => handleItemPress(item)} style={({ pressed }) => [styles.card, { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.8 : 1 }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {code && (
                                <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                                    <Ionicons name="receipt-outline" size={12} color={accentColor} />
                                    <Text style={[styles.badgeText, { color: accentColor }]}>{code}</Text>
                                </View>
                            )}
                            <View style={[styles.statusBadge, { backgroundColor: isPendiente ? (isDark ? '#065F46' : '#D1FAE5') : (isDark ? '#1e3b8a' : '#DBEAFE') }]}>
                                <Text style={[styles.statusText, { color: isPendiente ? (isDark ? '#6EE7B7' : '#065F46') : (isDark ? '#93C5FD' : '#1E40AF') }]}>
                                    {isPendiente ? 'Pendiente' : 'Cobrado'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.cardBody}>
                        <View style={styles.dateRow}>
                            <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                            <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                            <Text style={[styles.timeText, { color: textSecondary }]}>{formatTime(item.fecha_crea)}</Text>
                        </View>
                        <View style={styles.amountRow}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>{type === 'comisiones' ? 'Comisión de Venta' : 'Propina'}</Text>
                            <Text style={[styles.amountValue, { color: isPendiente ? accentColor : '#10B981' }]}>${amount.toLocaleString()}</Text>
                        </View>
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: accentColor, fontSize: 11, fontWeight: '700' }}>Ver detalles</Text>
                            <Ionicons name="chevron-forward" size={12} color={accentColor} />
                        </View>
                    </View>
                </Pressable>
            </AnimatedView>
        );
    });

    if (loading) return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title={title} />
            <View style={{ padding: 16 }}><SkeletonLoader width="100%" height={140} borderRadius={16} /></View>
            <View style={{ padding: 16, gap: 10 }}>{[1, 2].map(i => <SkeletonLoader key={i} width="100%" height={100} borderRadius={16} />)}</View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader title={title} subtitle={subtitle} />

            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.summaryLabel, { color: textSecondary }]}>TOTAL PENDIENTE</Text>
                <Text style={[styles.summaryAmount, { color: accentColor }]}>${totalPendiente.toLocaleString()}</Text>
                <View style={styles.summaryDetails}>
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>Historial: ${totalGeneral.toLocaleString()}</Text>
                    <View style={{ width: 1, height: 12, backgroundColor: borderColor }} />
                    <Text style={[styles.summaryDetail, { color: textSecondary }]}>{pendientes.length} items</Text>
                </View>
            </View>

            <View style={styles.filterRow}>
                {(['all', 'pendiente', 'pagado'] as const).map((f) => (
                    <Pressable key={f} style={[styles.filterButton, { backgroundColor: filter === f ? accentColor : cardBg, borderColor: filter === f ? accentColor : borderColor }]} onPress={() => setFilter(f)}>
                        <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : textSecondary }]}>
                            {f === 'all' ? `Todas (${data.length})` : f === 'pendiente' ? `Pendientes (${pendientes.length})` : `Cobradas (${data.length - pendientes.length})`}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <FlashList data={filteredData} keyExtractor={(item: any) => (item.id_comision || item.id_detalle_propina || item.id || 'unknown').toString()} renderItem={renderItem} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />} ListEmptyComponent={<View style={[styles.emptyCard, { backgroundColor: cardBg }]}><Ionicons name="file-tray-outline" size={48} color={textSecondary} /><Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron registros</Text></View>} getItemLayout={(_, index) => ({ length: 180, offset: 180 * index, index })} windowSize={10} maxToRenderPerBatch={7} initialNumToRender={5} removeClippedSubviews={true} />

            {type === 'propinas' ? (
                <TipDetailModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    loading={loadingDetail}
                    selectedPropina={selectedItem}
                    parentPropina={parentPropina}
                    saleDetail={saleDetail}
                />
            ) : (
                <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={[styles.modalTitle, { color: textPrimary }]}>
                                        Detalles
                                    </Text>
                                    <Text style={[styles.modalSubtitle, { color: textSecondary }]}>Código: {selectedItem?.codigo || selectedItem?.codigo_venta || '---'}</Text>
                                </View>
                                <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color={textPrimary} />
                                </Pressable>
                            </View>
                            <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                                {loadingDetail ? (
                                    <View style={styles.detailLoadingBox}>
                                        <ActivityIndicator size="large" color={accentColor} />
                                        <Text style={{ color: textSecondary, marginTop: 15 }}>Cargando detalles...</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.infoCard, { borderColor, backgroundColor: cardBg }]}>
                                        <Text style={[styles.cardTitle, { color: textSecondary }]}>DATOS DE LA COMISIÓN</Text>
                                        <View style={styles.infoRow}><Text style={{ color: textSecondary }}>Cliente:</Text><Text style={{ color: textPrimary, fontWeight: '700' }}>{selectedItem?.cliente_nombre || 'Particular'}</Text></View>
                                        <View style={styles.infoRow}><Text style={{ color: textSecondary }}>Lugar:</Text><Text style={{ color: textPrimary, fontWeight: '700' }}>{selectedItem?.habitacion_nombre || 'Barra'}</Text></View>
                                        {selectedItem?.productos && (
                                            <View style={{ marginTop: 15 }}>
                                                <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '800', marginBottom: 5 }}>PRODUCTOS:</Text>
                                                { (typeof selectedItem.productos === 'string' ? JSON.parse(selectedItem.productos) : selectedItem.productos).map((p: any, i: number) => (
                                                    <Text key={i} style={{ color: textPrimary, fontSize: 13 }}>â€¢ {p.cantidad}x {p.nombre}</Text>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </ScrollView>
                            <Pressable onPress={() => setModalVisible(false)} style={[styles.closeModalBtn, { backgroundColor: accentColor }]}>
                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>Cerrar</Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    statusText: { fontSize: 12, fontWeight: '600' },
    cardBody: {},
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    dateText: { fontSize: 14 },
    timeText: { fontSize: 13, marginLeft: 6 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amountLabel: { fontSize: 14, fontWeight: '600' },
    amountValue: { fontSize: 24, fontWeight: '900' },
    emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 14, marginTop: 15, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '85%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    modalHeader: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: '900' },
    modalSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    infoCard: { padding: 16, borderRadius: 20, borderWidth: 1 },
    cardTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    closeBtn: { padding: 4 },
    closeModalBtn: {
        height: 54,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5
    },
    
    
    divisionCard: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    divisionItem: { flex: 1, alignItems: 'center' },
    divisionLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    divisionValue: { fontSize: 16, fontWeight: '800' },
    divisionDivider: { width: 1, height: '60%', backgroundColor: 'rgba(155,155,155,0.2)' },
    sectionTitle: { fontSize: 11, fontWeight: '900', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
    productsList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 8 },
    productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
    productNameDetail: { fontSize: 14, fontWeight: '700' },
    productSubtotal: { fontSize: 14, fontWeight: '800' },
    saleTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderTopWidth: 1 },
    saleTotalLabel: { fontSize: 13, fontWeight: '800' },
    saleTotalValue: { fontSize: 16, fontWeight: '900' },
    statusBadgeSmall: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
    paymentInfoBox: { marginTop: 15, padding: 12, borderRadius: 12, marginBottom: 8 },
    detailLoadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
});



