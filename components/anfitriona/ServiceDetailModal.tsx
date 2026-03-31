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

    // Mostrar botón editar si precio_servicio es 0 Y la habitación tiene comisión mayor a 0
    const precioServicioInput = Number(servicio.precio_servicio) || 0;
    const habitacionComision = Number(servicio.habitacion_comision) || 0;
    const mostrarBotonEditar = precioServicioInput === 0 && habitacionComision > 0;

    return (
        <Modal 
            visible={visible} 
            animationType="slide" 
            transparent 
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.detailModal, { backgroundColor: bg }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalles</Text>
                            <Text style={[styles.modalSubText, { color: textSecondary }]}>Código: {servicio.codigo}</Text>
                        </View>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={28} color={textPrimary} />
                        </Pressable>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                        <View style={styles.detailsGrid}>
                            <View style={[styles.gridItem, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {servicio.cliente || "Particular"}
                                </Text>
                            </View>
                            
                            <View style={[styles.gridItem, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>HABITACIÓN</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {servicio.habitacion}
                                </Text>
                            </View>
                            
                            <View style={[styles.gridItem, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>TIEMPO</Text>
                                <Text style={[styles.gridValue, { color: textPrimary }]}>
                                    {servicio.tiempo} min
                                </Text>
                            </View>
                            
                            <View style={[styles.gridItem, { backgroundColor: cardBg, borderColor, borderWidth: 1 }]}>
                                <Text style={[styles.gridLabel, { color: textSecondary }]}>MI COMISIÓN</Text>
                                <Text style={[styles.gridValue, { color: accentColor, fontSize: 18 }]}>
                                    ${servicio.comision_usuario?.toLocaleString()}
                                </Text>
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
                            style={[styles.modalCloseBtn, { backgroundColor: accentColor }]} 
                            onPress={onClose}
                        >
                            <Text style={styles.modalCloseBtnText}>Entendido</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    detailModal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    modalTitleText: { fontSize: 22, fontWeight: "900" },
    modalSubText: { fontSize: 12, opacity: 0.7 },
    detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    gridItem: { width: "47%", padding: 16, borderRadius: 16 },
    gridLabel: { fontSize: 10, fontWeight: "800", marginBottom: 4 },
    gridValue: { fontSize: 14, fontWeight: "700" },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    modalEditBtn: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    modalEditBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    modalCloseBtn: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    modalCloseBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});

