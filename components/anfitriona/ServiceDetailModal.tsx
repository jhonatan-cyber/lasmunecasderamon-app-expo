import { useAccentColor } from '@/hooks/useAccentColor';
import { Servicio } from '@/hooks/useServicios';
import { estadoServicio } from '@/utils/servicioEstado';
import { FontSize, MIN_TOUCH_TARGET, BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { DetailSheet } from '@/components/ui/DetailSheet';

interface ServiceDetailModalProps {
    visible: boolean;
    servicio: Servicio | null;
    onClose: () => void;
}

export const ServiceDetailModal = ({ visible, servicio, onClose }: ServiceDetailModalProps) => {
    const { accentColor, bg, textPrimary, textSecondary, borderColor, accentOnSurface } = useAccentColor();

    if (!servicio) return null;

    const habitacionComision = Number(servicio.habitacion_comision || 0);

    const estadoInfo = estadoServicio(servicio.estado);
    const estadoBadge = {
        label: estadoInfo.label.toUpperCase(),
        color: estadoInfo.color,
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(/,/g, '');
    };

    return (
        <DetailSheet
            visible={visible}
            onClose={onClose}
            title="Detalle del Servicio"
            code={`#${servicio.codigo}`}
            status={{ label: estadoBadge.label, color: estadoBadge.color }}
            height="90%"
            footerActions={[{ label: 'Cerrar', onPress: onClose }]}
            accessibilityLabel="Detalle del servicio"
        >
                        <View style={styles.detailsGrid}>
                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor }]}>
                                <Ionicons name="business" size={16} color={accentOnSurface} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>HABITACIÓN</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]} numberOfLines={1}>
                                    {servicio.habitacion}
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor }]}>
                                <Ionicons name="time" size={16} color={accentOnSurface} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>TIEMPO</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {servicio.tiempo} min
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor, width: '100%' }]}>
                                <Ionicons name="person" size={16} color={accentOnSurface} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {servicio.cliente || "Sin registrar"}
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor, width: '100%' }]}>
                                <Ionicons name="people" size={16} color={accentOnSurface} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>ANFITRIONAS</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {servicio.anfitriona || "No asignada"}
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor }]}>
                                <Ionicons name="card" size={16} color={accentOnSurface} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>MÉTODO PAGO</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {(servicio.metodo_pago || 'efectivo').toUpperCase()}
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor }]}>
                                <Ionicons name="calendar" size={16} color={accentOnSurface} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>FECHA</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]} numberOfLines={2}>
                                    {formatDate(servicio.fecha_crea)}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.summarySection, { backgroundColor: bg, borderColor }]}>
                            <Text style={[styles.sectionTitle, { color: textSecondary }]}>RESUMEN FINANCIERO</Text>

                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: textSecondary }]}>Precio Servicio</Text>
                                <Text style={[styles.summaryVal, { color: textPrimary }]}>
                                    ${Number(servicio.precio_servicio || 0).toLocaleString()}
                                </Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: textSecondary }]}>Precio Habitación</Text>
                                <Text style={[styles.summaryVal, { color: textPrimary }]}>
                                    ${Number(servicio.precio_habitacion || 0).toLocaleString()}
                                </Text>
                            </View>

                            <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: borderColor }]}>
                                <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL SERVICIO</Text>
                                <Text style={[styles.totalVal, { color: accentOnSurface }]}>
                                    ${Number(servicio.total || 0).toLocaleString()}
                                </Text>
                            </View>

                            {habitacionComision > 0 && (
                                <View style={[styles.comisionBox, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' }]}>
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { color: '#10B981', fontFamily: FontFamily.extrabold }]}>Comisión Habitación</Text>
                                        <Text style={[styles.summaryVal, { color: '#10B981', fontFamily: FontFamily.extrabold }]}>
                                            ${habitacionComision.toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <View style={[styles.miComisionBox, { backgroundColor: accentColor + '15', borderColor: accentColor }]}>
                                <Ionicons name="diamond" size={24} color={accentOnSurface} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.miComisionLabel, { color: accentOnSurface }]}>MI COMISIÓN</Text>
                                    <Text style={[styles.miComisionVal, { color: accentOnSurface }]}>
                                        ${Number(servicio.comision_usuario || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>
        </DetailSheet>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    detailModal: { width: '100%', maxWidth: 720, alignSelf: 'center', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', borderTopWidth: 1 },
    modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 12 },
    modalTitleText: { fontSize: FontSize.xl, fontFamily: FontFamily.black, letterSpacing: -0.5 },
    modalSubText: { fontSize: FontSize.xs, fontFamily: FontFamily.semibold, marginTop: 4 },
    closeBtn: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: MIN_TOUCH_TARGET / 2, justifyContent: 'center', alignItems: 'center' },
    estadoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, gap: 6, borderWidth: 1 },
    estadoDot: { width: 6, height: 6, borderRadius: BorderRadius.full },
    estadoText: { fontSize: FontSize.xxs, fontFamily: FontFamily.black },
    detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20 },
    gridItem: { width: "47%", padding: 14, borderRadius: BorderRadius.full, borderWidth: 1 },
    gridLabel: { fontSize: FontSize.xxs, fontFamily: FontFamily.extrabold, marginBottom: 6, letterSpacing: 0.5 },
    gridValue: { fontSize: FontSize.md, fontFamily: FontFamily.bold },
    summarySection: { marginTop: 20, marginHorizontal: 20, padding: 20, borderRadius: BorderRadius.full, borderWidth: 1 },
    sectionTitle: { fontSize: FontSize.xxs, fontFamily: FontFamily.black, letterSpacing: 1, marginBottom: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.semibold },
    summaryVal: { fontSize: FontSize.md, fontFamily: FontFamily.extrabold },
    totalLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.black },
    totalVal: { fontSize: FontSize.xl, fontFamily: FontFamily.black },
    comisionBox: { marginTop: 12, padding: 12, borderRadius: BorderRadius.full, borderWidth: 1 },
    miComisionBox: { marginTop: 16, padding: 16, borderRadius: BorderRadius.full, borderWidth: 2, flexDirection: 'row', alignItems: 'center' },
    miComisionLabel: { fontSize: FontSize.xs, fontFamily: FontFamily.extrabold, letterSpacing: 1 },
    miComisionVal: { fontSize: FontSize.xl, fontFamily: FontFamily.black, marginTop: 4 },
    buttonRow: { flexDirection: 'row', gap: 12, padding: 20 },
    modalEditBtn: { flex: 1, height: 54, borderRadius: BorderRadius.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    modalEditBtnText: { color: '#FFF', fontSize: FontSize.sm, fontFamily: FontFamily.black },
    modalCloseBtn: { height: 54, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center' },
    modalCloseBtnText: { color: '#FFF', fontSize: FontSize.sm, fontFamily: FontFamily.black },
});

