import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DetailSheet } from '@/components/ui/DetailSheet';
import { parseDateSafe } from "@/utils/timeUtils";
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontSize, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';

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
    const { isDark, textPrimary, textSecondary, borderColor, accentOnSurface, surfaceMuted } = useAccentColor();

    return (
        <DetailSheet
            visible={visible}
            onClose={onClose}
            title="Detalle de Propina"
            code={`Codigo : ${selectedPropina?.codigo_venta || selectedPropina?.codigo || '---'}`}
            loading={loading}
            loadingLabel="Cargando detalles..."
            height="85%"
            footerActions={[{ label: 'Cerrar', onPress: onClose }]}
            accessibilityLabel="Detalle de propina"
        >
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
                                    <Text style={[styles.divisionValue, { color: accentOnSurface }]}>
                                        {parentPropina?.conteo_usuarios ?? '---'}
                                    </Text>
                                </View>
                                <View style={styles.divisionDivider} />
                                <View style={styles.divisionItem}>
                                    <Text style={[styles.divisionLabel, { color: textSecondary }]}>Mi Parte</Text>
                                    <Text style={[styles.divisionValue, { color: accentOnSurface }]}>
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
                                                    <Text style={[styles.productSubtotal, { color: accentOnSurface }]}>${(p.monto || 0).toLocaleString()}</Text>
                                                    <View style={[styles.statusBadge, { backgroundColor: surfaceMuted, marginTop: 4 }]}>
                                                        <Text style={{ fontSize: FontSize.xxs, fontFamily: FontFamily.bold, color: accentOnSurface }}>
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
                                    <View style={{ marginTop: 15, padding: 12, borderRadius: 12, backgroundColor: surfaceMuted, marginBottom: 8 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <Text style={{ color: textSecondary, fontSize: 12 }}>Método de Pago</Text>
                                            <Text style={{ color: textPrimary, fontSize: 12, fontFamily: FontFamily.bold }}>{String(saleDetail.metodo_pago ?? '').toUpperCase() || '---'}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: textSecondary, fontSize: 12 }}>Fecha</Text>
                                            <Text style={{ color: textPrimary, fontSize: 12 }}>{saleDetail.fecha_crea ? parseDateSafe(saleDetail.fecha_crea).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---'}</Text>
                                        </View>
                                    </View>
                                </>
                            ) : (
                                !loading && (
                                    <View style={{ padding: 28, alignItems: 'center' }}>
                                        <Ionicons name="receipt-outline" size={40} color={textSecondary} />
                                        <Text style={{ color: textSecondary, marginTop: 10, textAlign: 'center', fontSize: 13 }}>
                                            Esta propina no tiene venta asociada
                                        </Text>
                                    </View>
                                )
                            )}
        </DetailSheet>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
        height: '85%',
        borderTopLeftRadius: BorderRadius.card,
        borderTopRightRadius: BorderRadius.card,
        padding: 24,
        paddingBottom: 40
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    modalTitle: { fontSize: 20, fontFamily: FontFamily.black },
    modalSubtitle: { fontSize: 13, fontFamily: FontFamily.medium, marginTop: 2 },
    closeBtn: { padding: 4 },
    detailLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    divisionCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: BorderRadius.card,
        borderWidth: 1,
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    divisionItem: { flex: 1, alignItems: 'center' },
    divisionLabel: { fontSize: 11, fontFamily: FontFamily.semibold, marginBottom: 4 },
    divisionValue: { fontSize: 16, fontFamily: FontFamily.extrabold },
    divisionDivider: { width: 1, height: '60%', backgroundColor: 'rgba(155,155,155,0.2)' },
    sectionTitle: { fontSize: 11, fontFamily: FontFamily.black, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
    productsList: { borderRadius: BorderRadius.card, borderWidth: 1, overflow: 'hidden' },
    productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
    productNameDetail: { fontSize: 14, fontFamily: FontFamily.bold },
    productSubtotal: { fontSize: 14, fontFamily: FontFamily.extrabold },
    saleTotalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderTopWidth: 1 },
    saleTotalLabel: { fontSize: 13, fontFamily: FontFamily.extrabold },
    saleTotalValue: { fontSize: 16, fontFamily: FontFamily.black },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    closeModalBtn: {
        height: 54,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5
    },
    closeModalBtnText: { color: '#FFF', fontSize: 16, fontFamily: FontFamily.extrabold }
});
