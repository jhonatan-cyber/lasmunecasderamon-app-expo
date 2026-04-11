import React from 'react';
import { StyleSheet, Text, View, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Servicio } from '@/hooks/useServicios';

interface ServiceDetailModalProps {
    visible: boolean;
    servicio: Servicio | null;
    onClose: () => void;
    onEdit?: () => void;
}

export const ServiceDetailModal = ({ visible, servicio, onClose, onEdit }: ServiceDetailModalProps) => {
    const { accentColor, isDark } = useAccentColor();
    
    const bg = isDark ? '#000000' : '#F9FAFB';
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : '#E5E7EB';

    if (!servicio) return null;

    const habitacionComision = Number(servicio.habitacion_comision || 0);
    const mostrarBotonEditar = habitacionComision > 0 && servicio.estado === 2;

    const getEstadoBadge = () => {
        switch (servicio.estado) {
            case 0: return { label: 'ANULADO', color: '#EF4444' };
            case 1: return { label: 'FINALIZADO', color: '#10B981' };
            case 2: return { label: 'EN PROCESO', color: '#3B82F6' };
            case 3: return { label: 'PAUSADO', color: '#F59E0B' };
            case 4: return { label: 'SOL. ANULACIÓN', color: '#F97316' };
            default: return { label: 'DESCONOCIDO', color: '#6B7280' };
        }
    };

    const estadoBadge = getEstadoBadge();

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
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={textPrimary} />
                        </Pressable>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.detailsGrid}>
                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor }]}>
                                <Ionicons name="business" size={16} color={accentColor} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>HABITACIÓN</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]} numberOfLines={1}>
                                    {servicio.habitacion}
                                </Text>
                            </View>
                            
                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor }]}>
                                <Ionicons name="time" size={16} color={accentColor} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>TIEMPO</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {servicio.tiempo} min
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor, width: '100%' }]}>
                                <Ionicons name="person" size={16} color={accentColor} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {servicio.cliente || "Sin registrar"}
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor, width: '100%' }]}>
                                <Ionicons name="people" size={16} color={accentColor} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>ANFITRIONAS</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {servicio.anfitriona || "No asignada"}
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor }]}>
                                <Ionicons name="card" size={16} color={accentColor} style={{ marginBottom: 4 }} />
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>MÉTODO PAGO</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {(servicio.metodo_pago || 'efectivo').toUpperCase()}
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { backgroundColor: bg, borderColor }]}>
                                <Ionicons name="calendar" size={16} color={accentColor} style={{ marginBottom: 4 }} />
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
                                <Text style={[styles.totalVal, { color: accentColor }]}>
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
                                <Ionicons name="diamond" size={24} color={accentColor} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.miComisionLabel, { color: accentColor }]}>MI COMISIÓN</Text>
                                    <Text style={[styles.miComisionVal, { color: accentColor }]}>
                                        ${Number(servicio.comision_usuario || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                    
                    <View style={styles.buttonRow}>
                        {mostrarBotonEditar && onEdit && (
                            <Pressable 
                                style={[styles.modalEditBtn, { backgroundColor: '#3B82F6' }]} 
                                onPress={onEdit}
                            >
                                <Ionicons name="pencil" size={20} color="#FFFFFF" />
                                <Text style={styles.modalEditBtnText}>Editar</Text>
                            </Pressable>
                        )}
                        <Pressable 
                            style={[styles.modalCloseBtn, { backgroundColor: accentColor, flex: mostrarBotonEditar ? 1 : undefined, width: mostrarBotonEditar ? undefined : '100%' }]} 
                            onPress={onClose}
                        >
                            <Text style={styles.modalCloseBtnText}>Cerrar</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    detailModal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', borderTopWidth: 1 },
    modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 12 },
    modalTitleText: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
    modalSubText: { fontSize: 13, fontWeight: "600", marginTop: 4 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    estadoBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6, borderWidth: 1 },
    estadoDot: { width: 6, height: 6, borderRadius: 3 },
    estadoText: { fontSize: 10, fontWeight: '900' },
    detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20 },
    gridItem: { width: "47%", padding: 14, borderRadius: 16, borderWidth: 1 },
    gridLabel: { fontSize: 10, fontWeight: "800", marginBottom: 6, letterSpacing: 0.5 },
    gridValue: { fontSize: 15, fontWeight: "700" },
    summarySection: { marginTop: 20, marginHorizontal: 20, padding: 20, borderRadius: 20, borderWidth: 1 },
    sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    summaryLabel: { fontSize: 14, fontWeight: '600' },
    summaryVal: { fontSize: 15, fontWeight: '800' },
    totalLabel: { fontSize: 16, fontWeight: '900' },
    totalVal: { fontSize: 22, fontWeight: '900' },
    comisionBox: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
    miComisionBox: { marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 2, flexDirection: 'row', alignItems: 'center' },
    miComisionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
    miComisionVal: { fontSize: 28, fontWeight: '900', marginTop: 4 },
    buttonRow: { flexDirection: 'row', gap: 12, padding: 20 },
    modalEditBtn: { flex: 1, height: 54, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    modalEditBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    modalCloseBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    modalCloseBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});

