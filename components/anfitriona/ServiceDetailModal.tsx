import { useAccentColor } from '@/hooks/useAccentColor';
import { Servicio } from '@/hooks/useServicios';
import { estadoServicio } from '@/utils/servicioEstado';
import { FontSize, HitSlop, MIN_TOUCH_TARGET, BorderRadius } from '@/constants/spacing';
import { haptic } from '@/utils/haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';

interface ServiceDetailModalProps {
    visible: boolean;
    servicio: Servicio | null;
    onClose: () => void;
}

export const ServiceDetailModal = ({ visible, servicio, onClose }: ServiceDetailModalProps) => {
    const {accentColor, accentText, bg, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface} = useAccentColor();

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
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle del Servicio</Text>
                            <Text style={[styles.modalSubText, { color: textSecondary }]}>#{servicio.codigo}</Text>
                        </View>
                        <View style={[styles.estadoBadge, { backgroundColor: estadoBadge.color + '15', borderColor: estadoBadge.color }]}>
                            <View style={[styles.estadoDot, { backgroundColor: estadoBadge.color }]} />
                            <Text style={[styles.estadoText, { color: estadoBadge.color }]}>{estadoBadge.label}</Text>
                        </View>
                        <Pressable onPress={() => {
                            haptic.tap();
                            onClose();
                        }} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar detalle del servicio" accessibilityHint="Cierra el modal de detalle" hitSlop={HitSlop.sm}>
                            <Ionicons name="close" size={24} color={textPrimary} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
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
                                        <Text style={[styles.summaryLabel, { color: '#10B981', fontWeight: '800' }]}>Comisión Habitación</Text>
                                        <Text style={[styles.summaryVal, { color: '#10B981', fontWeight: '800' }]}>
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
                    </ScrollView>

                    <View style={styles.buttonRow}>
                        <Pressable
                            style={[styles.modalCloseBtn, { backgroundColor: accentColor, width: '100%' }]}
                            onPress={() => {
                              haptic.tap();
                              onClose();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Cerrar detalle"
                            accessibilityHint="Cierra el modal de detalle"
                            hitSlop={HitSlop.sm}
                        >
                            <Text style={[styles.modalCloseBtnText, { color: accentText }]}>Cerrar</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    detailModal: { width: '100%', maxWidth: 720, alignSelf: 'center', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', borderTopWidth: 1 },
    modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 12 },
    modalTitleText: { fontSize: FontSize.xl, fontWeight: "900", letterSpacing: -0.5 },
    modalSubText: { fontSize: FontSize.xs, fontWeight: "600", marginTop: 4 },
    closeBtn: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: MIN_TOUCH_TARGET / 2, justifyContent: 'center', alignItems: 'center' },
    estadoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, gap: 6, borderWidth: 1 },
    estadoDot: { width: 6, height: 6, borderRadius: BorderRadius.full },
    estadoText: { fontSize: FontSize.xxs, fontWeight: '900' },
    detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20 },
    gridItem: { width: "47%", padding: 14, borderRadius: BorderRadius.full, borderWidth: 1 },
    gridLabel: { fontSize: FontSize.xxs, fontWeight: "800", marginBottom: 6, letterSpacing: 0.5 },
    gridValue: { fontSize: FontSize.md, fontWeight: "700" },
    summarySection: { marginTop: 20, marginHorizontal: 20, padding: 20, borderRadius: BorderRadius.full, borderWidth: 1 },
    sectionTitle: { fontSize: FontSize.xxs, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: FontSize.sm, fontWeight: '600' },
    summaryVal: { fontSize: FontSize.md, fontWeight: '800' },
    totalLabel: { fontSize: FontSize.sm, fontWeight: '900' },
    totalVal: { fontSize: FontSize.xl, fontWeight: '900' },
    comisionBox: { marginTop: 12, padding: 12, borderRadius: BorderRadius.full, borderWidth: 1 },
    miComisionBox: { marginTop: 16, padding: 16, borderRadius: BorderRadius.full, borderWidth: 2, flexDirection: 'row', alignItems: 'center' },
    miComisionLabel: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1 },
    miComisionVal: { fontSize: FontSize.xl, fontWeight: '900', marginTop: 4 },
    buttonRow: { flexDirection: 'row', gap: 12, padding: 20 },
    modalEditBtn: { flex: 1, height: 54, borderRadius: BorderRadius.full, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    modalEditBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '900' },
    modalCloseBtn: { height: 54, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center' },
    modalCloseBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: '900' },
});

