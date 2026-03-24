import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useState, useCallback } from 'react';
import {
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    ActivityIndicator
} from 'react-native';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useFinancialEvents } from '@/hooks/useFinancialEvents';
import { apiClient } from '@/api/client';


interface FinancialEventsScreenProps {
    title: string;
    subtitle: string;
    type: 'comisiones' | 'propinas';
}

export function FinancialEventsScreen({ title, subtitle, type }: FinancialEventsScreenProps) {
    const { accentColor, isDark } = useAccentColor();
    const { data, loading, refreshing, error, onRefresh } = useFinancialEvents(type as any);
    const [filter, setFilter] = useState<'all' | 'pendiente' | 'pagado'>('all');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [saleDetail, setSaleDetail] = useState<any>(null);
    const [parentPropina, setParentPropina] = useState<any>(null);

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

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    };

    const handleItemPress = async (item: any) => {
        setSelectedItem(item);
        setModalVisible(true);
        setLoadingDetail(true);
        setSaleDetail(null);
        setParentPropina(null);

        try {
            if (type === 'propinas') {
                const tipRes = await apiClient(`/tips/${item.propina_id}`);
                if (tipRes.success) {
                    setParentPropina(tipRes.data);
                    if (tipRes.data.venta_id) {
                        const saleRes = await apiClient(`/ventas/${tipRes.data.venta_id}`);
                        if (saleRes && !saleRes.error) setSaleDetail(saleRes);
                    }
                }
            } else {
                // Para comisiones ya viene bastante data, pero podrías extenderlo si fuera necesario
            }
        } catch (e) { console.error(e); } finally { setLoadingDetail(false); }
    };

    const filteredData = data.filter((a) => {
        if (filter === 'pendiente') return a.estado === 1;
        if (filter === 'pagado') return a.estado === 0;
        return true;
    });

    const pendientes = data.filter((a) => a.estado === 1);
    const totalPendiente = pendientes.reduce((sum, a) => sum + (a.comision || a.monto || 0), 0);
    const totalGeneral = data.reduce((sum, a) => sum + (a.comision || a.monto || 0), 0);

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const isPendiente = item.estado === 1;
        const amount = item.comision || item.monto || 0;
        const code = item.codigo || item.codigo_venta;

        return (
            <MotiView from={{ opacity: 0, translateY: 30 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', delay: index * 100 }}>
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
            </MotiView>
        );
    };

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

            <FlatList data={filteredData} keyExtractor={(item) => (item.id_comision || item.id_detalle_propina || item.id).toString()} renderItem={renderItem} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />} ListEmptyComponent={<View style={[styles.emptyCard, { backgroundColor: cardBg }]}><Ionicons name="file-tray-outline" size={48} color={textSecondary} /><Text style={[styles.emptyText, { color: textSecondary }]}>No se encontraron registros</Text></View>} />

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: bg }]}>
                        <View style={styles.modalHeader}>
                            <View><Text style={[styles.modalTitle, { color: textPrimary }]}>Detalles</Text><Text style={[styles.modalSubtitle, { color: textSecondary }]}>Código: {selectedItem?.codigo || selectedItem?.codigo_venta || '---'}</Text></View>
                            <Pressable onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color={textPrimary} /></Pressable>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {loadingDetail ? <ActivityIndicator size="large" color={accentColor} /> : (
                                <>
                                    {type === 'propinas' && parentPropina && (
                                        <View style={[styles.infoCard, { borderColor, backgroundColor: cardBg }]}>
                                            <Text style={[styles.cardTitle, { color: textSecondary }]}>REPARTO DE PROPINA</Text>
                                            <View style={styles.infoRow}><Text style={{ color: textSecondary }}>Monto Total:</Text><Text style={{ color: textPrimary, fontWeight: '700' }}>${parentPropina.monto_total?.toLocaleString()}</Text></View>
                                            <View style={styles.infoRow}><Text style={{ color: textSecondary }}>Participantes:</Text><Text style={{ color: textPrimary, fontWeight: '700' }}>{parentPropina.conteo_usuarios}</Text></View>
                                            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 10, marginTop: 10 }]}><Text style={{ color: accentColor, fontWeight: '900' }}>MI PARTE:</Text><Text style={{ color: accentColor, fontWeight: '900', fontSize: 18 }}>${selectedItem?.monto?.toLocaleString()}</Text></View>
                                        </View>
                                    )}
 
                                    {type === 'comisiones' && (
                                         <View style={[styles.infoCard, { borderColor, backgroundColor: cardBg }]}>
                                            <Text style={[styles.cardTitle, { color: textSecondary }]}>DATOS DE LA COMISIÓN</Text>
                                            <View style={styles.infoRow}><Text style={{ color: textSecondary }}>Cliente:</Text><Text style={{ color: textPrimary, fontWeight: '700' }}>{selectedItem?.cliente_nombre || 'Particular'}</Text></View>
                                            <View style={styles.infoRow}><Text style={{ color: textSecondary }}>Lugar:</Text><Text style={{ color: textPrimary, fontWeight: '700' }}>{selectedItem?.habitacion_nombre || 'Barra'}</Text></View>
                                            {selectedItem?.productos && (
                                                <View style={{ marginTop: 15 }}>
                                                    <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '800', marginBottom: 5 }}>PRODUCTOS:</Text>
                                                    { (typeof selectedItem.productos === 'string' ? JSON.parse(selectedItem.productos) : selectedItem.productos).map((p: any, i: number) => (
                                                        <Text key={i} style={{ color: textPrimary, fontSize: 13 }}>• {p.cantidad}x {p.nombre}</Text>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {saleDetail && (
                                        <View style={[styles.infoCard, { borderColor, backgroundColor: cardBg, marginTop: 15 }]}>
                                            <Text style={[styles.cardTitle, { color: textSecondary }]}>DATOS DE VENTA</Text>
                                            {saleDetail.detalles?.map((d: any, i: number) => (
                                                <View key={i} style={styles.infoRow}><Text style={{ color: textPrimary, flex: 1 }}>{d.cantidad}x {d.producto_nombre}</Text><Text style={{ color: textPrimary, fontWeight: '700' }}>${d.sub_total?.toLocaleString()}</Text></View>
                                            ))}
                                            <View style={styles.infoRow}><Text style={{ color: textSecondary }}>Método:</Text><Text style={{ color: textPrimary }}>{saleDetail.metodo_pago}</Text></View>
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>
                        <Pressable onPress={() => setModalVisible(false)} style={[styles.closeBtn, { backgroundColor: accentColor }]}><Text style={{ color: '#FFF', fontWeight: '800' }}>Cerrar</Text></Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    summaryCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1 },
    summaryLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
    summaryAmount: { fontSize: 42, fontWeight: '900', letterSpacing: -1, marginBottom: 12 },
    summaryDetails: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    summaryDetail: { fontSize: 13, fontWeight: '600' },
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 8 },
    filterButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
    filterText: { fontSize: 11, fontWeight: '700' },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    indexBadge: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    indexText: { fontSize: 12, fontWeight: '800' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardBody: {},
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    dateText: { fontSize: 14 },
    timeText: { fontSize: 13 },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amountLabel: { fontSize: 13, fontWeight: '600' },
    amountValue: { fontSize: 24, fontWeight: '900' },
    emptyCard: { borderRadius: 20, padding: 40, alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 14, marginTop: 15, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { height: '85%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: '900' },
    modalSubtitle: { fontSize: 12, fontWeight: '600' },
    infoCard: { padding: 16, borderRadius: 20, borderWidth: 1 },
    cardTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    closeBtn: { margin: 20, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});



