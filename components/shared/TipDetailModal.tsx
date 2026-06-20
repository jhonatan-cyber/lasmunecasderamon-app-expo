import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { parseDateSafe } from "@/utils/timeUtils";
import { useAccentColor } from '@/hooks/useAccentColor';

interface TipDetailModalProps {
    visible: boolean;
    onClose: () => void;
    loading: boolean;
    selectedPropina: any;
    parentPropina: any;
    saleDetail: any;
}

export const TipDetailModal: React.FC<TipDetailModalProps> = ({
    visible,
    onClose,
    loading,
    selectedPropina,
    parentPropina,
    saleDetail
}) => {
    const { accentColor, isDark } = useAccentColor();

    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>Detalle de Propina</Text>
                            <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                                Codigo : {selectedPropina?.codigo_venta || selectedPropina?.codigo || '---'}
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={textPrimary} />
                        </Pressable>
                    </View>

                    {loading ? (
                        <View style={styles.detailLoading}>
                            <ActivityIndicator size="large" color={accentColor} />
                            <Text style={{ color: textSecondary, marginTop: 15 }}>Cargando detalles...</Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {}
                            <View style={[styles.divisionCard, { borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                                <View style={styles.divisionItem}>
                                    <Text style={[styles.divisionLabel, { color: textSecondary }]}>Total Propina</Text>
                                    <Text style={[styles.divisionValue, { color: textPrimary }]}>
                                        ${(parentPropina?.monto_total || 0).toLocaleString()}
                                    </Text>
                                </View>
                                <View style={styles.divisionDivider} />
                                <View style={styles.divisionItem}>
                                    <Text style={[styles.divisionLabel, { color: textSecondary }]}>Participantes</Text>
                                    <Text style={[styles.divisionValue, { color: accentColor }]}>
                                        {parentPropina?.conteo_usuarios ?? '---'}
                                    </Text>
                                </View>
                                <View style={styles.divisionDivider} />
                                <View style={styles.divisionItem}>
                                    <Text style={[styles.divisionLabel, { color: textSecondary }]}>Mi Parte</Text>
                                    <Text style={[styles.divisionValue, { color: accentColor }]}>
                                        ${(selectedPropina?.monto || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>

                            {}
                            {parentPropina?.participantes?.length > 0 && (
                                <>
                                    <Text style={[styles.sectionTitle, { color: textSecondary, marginTop: 20 }]}>REPARTICIÓN</Text>
                                    <View style={[styles.productsList, { borderColor }]}>
                                        {parentPropina.participantes.map((p: any, idx: number) => (
                                            <View key={idx} style={[styles.productRow, { borderBottomColor: borderColor, borderBottomWidth: idx === parentPropina.participantes.length - 1 ? 0 : 1 }]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.productNameDetail, { color: textPrimary }]}>{p.nombre}</Text>
                                                    {p.nick ? <Text style={{ color: textSecondary, fontSize: 12 }}>@{p.nick}</Text> : null}
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={[styles.productSubtotal, { color: accentColor }]}>${(p.monto || 0).toLocaleString()}</Text>
                                                    <View style={[styles.statusBadge, { backgroundColor: p.estado === 1 ? (isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5') : (isDark ? 'rgba(59,130,246,0.2)' : '#DBEAFE'), marginTop: 4 }]}>
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: p.estado === 1 ? (isDark ? '#10B981' : '#065F46') : (isDark ? '#3B82F6' : '#1E40AF') }}>
                                                            {p.estado === 1 ? 'Por cobrar' : 'Cobrada'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}

                            {}
                            {saleDetail ? (
                                <>
                                    {}
                                    <Text style={[styles.sectionTitle, { color: textSecondary, marginTop: 20 }]}>PERSONAL Y SERVICIO</Text>
                                    <View style={[styles.productsList, { borderColor }]}>
                                        {}
                                        <View style={[styles.productRow, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Ionicons name="storefront-outline" size={16} color={textSecondary} />
                                                <Text style={{ color: textSecondary, fontSize: 13 }}>Origen</Text>
                                            </View>
                                            <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: 13 }]}>
                                                {saleDetail.garzon_nombre || saleDetail.mesero_nombre ? `Pedido por ${saleDetail.garzon_nombre || saleDetail.mesero_nombre}` : 'Venta realizada en barra'}
                                            </Text>
                                        </View>
                                        {}
                                        {saleDetail.cajero_nombre ? (
                                            <View style={[styles.productRow, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Ionicons name="cash-outline" size={16} color={textSecondary} />
                                                    <Text style={{ color: textSecondary, fontSize: 13 }}>Procesó la venta</Text>
                                                </View>
                                                <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: 13 }]}>{saleDetail.cajero_nombre}</Text>
                                            </View>
                                        ) : null}
                                        {}
                                        {saleDetail.habitacion_nombre ? (
                                            <View style={[styles.productRow, { borderBottomColor: borderColor, borderBottomWidth: 1 }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Ionicons name="bed-outline" size={16} color={textSecondary} />
                                                    <Text style={{ color: textSecondary, fontSize: 13 }}>Habitación</Text>
                                                </View>
                                                <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: 13 }]}>{saleDetail.habitacion_nombre}</Text>
                                            </View>
                                        ) : null}
                                        {}
                                        {saleDetail.tiempo ? (
                                            <View style={[styles.productRow, { borderBottomColor: borderColor, borderBottomWidth: ((saleDetail.usuarios?.length ?? 0) > 0) ? 1 : 0 }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Ionicons name="time-outline" size={16} color={textSecondary} />
                                                    <Text style={{ color: textSecondary, fontSize: 13 }}>Tiempo</Text>
                                                </View>
                                                <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: 13 }]}>{saleDetail.tiempo} min</Text>
                                            </View>
                                        ) : null}
                                        {}
                                        {saleDetail.usuarios?.map((u: any, idx: number, arr: any[]) => (
                                            <View key={idx} style={[styles.productRow, { borderBottomColor: borderColor, borderBottomWidth: idx === arr.length - 1 ? 0 : 1 }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Ionicons name="person-circle-outline" size={16} color={textSecondary} />
                                                    <Text style={{ color: textSecondary, fontSize: 13 }}>Anfitriona</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={[styles.productSubtotal, { color: textPrimary, fontSize: 13 }]}>{u.usuario_nombre || u.nombre}</Text>
                                                    {u.nick ? <Text style={{ color: textSecondary, fontSize: 11 }}>@{u.nick}</Text> : null}
                                                </View>
                                            </View>
                                        ))}
                                    </View>

                                    {}
                                    <Text style={[styles.sectionTitle, { color: textSecondary, marginTop: 20 }]}>PRODUCTOS</Text>
                                    <View style={[styles.productsList, { borderColor }]}>
                                        {saleDetail.detalles?.map((det: any, idx: number) => (
                                            <View key={idx} style={[styles.productRow, { borderBottomColor: borderColor, borderBottomWidth: idx === saleDetail.detalles.length - 1 ? 0 : 1 }]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.productNameDetail, { color: textPrimary }]}>{det.producto_nombre}</Text>
                                                    <Text style={{ color: textSecondary, fontSize: 12 }}>{det.cantidad} x ${Number(det.precio ?? det.producto_precio ?? 0).toLocaleString()}</Text>
                                                </View>
                                                <Text style={[styles.productSubtotal, { color: textPrimary }]}>${Number(det.sub_total ?? det.subtotal ?? 0).toLocaleString()}</Text>
                                            </View>
                                        ))}
                                        <View style={[styles.saleTotalRow, { borderTopColor: borderColor }]}>
                                            <Text style={[styles.saleTotalLabel, { color: textSecondary }]}>Total Venta</Text>
                                            <Text style={[styles.saleTotalValue, { color: textPrimary }]}>${Number(saleDetail.total).toLocaleString()}</Text>
                                        </View>
                                    </View>

                                    {}
                                    <View style={{ marginTop: 15, padding: 12, borderRadius: 12, backgroundColor: isDark ? '#37415140' : '#F3F4F6', marginBottom: 8 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <Text style={{ color: textSecondary, fontSize: 12 }}>Método de Pago</Text>
                                            <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>{String(saleDetail.metodo_pago ?? '').toUpperCase() || '---'}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: textSecondary, fontSize: 12 }}>Fecha</Text>
                                            <Text style={{ color: textPrimary, fontSize: 12 }}>{saleDetail.fecha_crea ? parseDateSafe(saleDetail.fecha_crea).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}</Text>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                !loading && (
                                    <View style={{ padding: 30, alignItems: 'center' }}>
                                        <Ionicons name="receipt-outline" size={40} color={textSecondary} />
                                        <Text style={{ color: textSecondary, marginTop: 10, textAlign: 'center', fontSize: 13 }}>
                                            Esta propina no tiene venta asociada
                                        </Text>
                                    </View>
                                )
                            )}
                        </ScrollView>
                    )}

                    <Pressable
                        onPress={onClose}
                        style={[styles.closeModalBtn, { backgroundColor: accentColor }]}
                    >
                        <Text style={styles.closeModalBtnText}>Cerrar</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
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
