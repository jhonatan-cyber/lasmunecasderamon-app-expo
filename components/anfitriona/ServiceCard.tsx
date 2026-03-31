import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Servicio } from '@/hooks/useServicios';

interface ServiceCardProps {
    item: Servicio;
    index: number;
    onPress: (item: Servicio) => void;
    onAssistance: (servicioId: number, roomName: string, type: string) => void;
    onEdit?: (item: Servicio) => void;
}

export const ServiceCard = ({ item, index, onPress, onAssistance }: ServiceCardProps) => {
    const { accentColor, isDark } = useAccentColor();
    
    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : '#E5E7EB';

    const estadoNum = Number(item.estado);
    const isProceso = estadoNum === 2;

    const statusMap: Record<number, { bg: string, text: string, label: string }> = {
        0: { bg: isDark ? '#450a0a' : '#fee2e2', text: isDark ? '#f87171' : '#991b1b', label: 'Anulado' },
        1: { bg: isDark ? '#065F46' : '#D1FAE5', text: isDark ? '#6EE7B7' : '#065F46', label: 'Finalizado' },
        2: { bg: isDark ? '#7C2D12' : '#FEF3C7', text: isDark ? '#FDBA74' : '#92400E', label: 'En proceso' },
        3: { bg: isDark ? '#475569' : '#E2E8F0', text: isDark ? '#CBD5E1' : '#475569', label: 'Pausado' },
        4: { bg: isDark ? '#1e3a8a' : '#dbeafe', text: isDark ? '#60a5fa' : '#1e40af', label: 'Solicitud Anul.' }
    };

    const status = statusMap[estadoNum] || { bg: '#999', text: '#FFF', label: 'Desconocido' };

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

    return (
        <MotiView 
            from={{ opacity: 0, translateY: 20 }} 
            animate={{ opacity: 1, translateY: 0 }} 
            transition={{ type: 'spring', delay: index * 100 }}
        >
            <Pressable 
                style={[styles.card, { backgroundColor: cardBg, borderColor }]} 
                onPress={() => onPress(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.habitacionText, { color: textPrimary }]}>{item.habitacion}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                </View>
                
                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="calendar-outline" size={12} color={textSecondary} />
                            <Text style={[styles.infoText, { color: textSecondary }]}>{formatDate(item.fecha_crea)}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="time-outline" size={12} color={textSecondary} />
                            <Text style={[styles.infoText, { color: textSecondary }]}>{formatTime(item.fecha_crea)}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Código:</Text>
                            <Text style={[styles.detailValue, { color: textPrimary }]}>{item.codigo}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Mi Comisión:</Text>
                            <Text style={[styles.priceValue, { color: accentColor }]}>${(item.comision_usuario || 0).toLocaleString()}</Text>
                        </View>
                    </View>

                    {isProceso && (
                        <View style={styles.assistanceContainer}>
                            <Text style={styles.assistanceTitle}>SILENT ASSISTANCE:</Text>
                            <View style={styles.assistanceGrid}>
                                <Pressable 
                                    style={[styles.assistanceBtn, { backgroundColor: isDark ? '#1e3a8a30' : '#e0e7ff' }]} 
                                    onPress={() => onAssistance(item.id_servicio, item.habitacion, 'Tragos')}
                                >
                                    <Ionicons name="beer-outline" size={12} color={accentColor} />
                                    <Text style={[styles.assistanceBtnText, { color: accentColor }]}>Tragos</Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.assistanceBtn, { backgroundColor: isDark ? '#065F4630' : '#d1fae5' }]} 
                                    onPress={() => onAssistance(item.id_servicio, item.habitacion, 'Limpieza/Hielo')}
                                >
                                    <Ionicons name="sparkles-outline" size={12} color="#10B981" />
                                    <Text style={[styles.assistanceBtnText, { color: '#10B981' }]}>Servicio</Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.assistanceBtn, { backgroundColor: isDark ? '#450a0a' : '#fee2e2' }]} 
                                    onPress={() => onAssistance(item.id_servicio, item.habitacion, 'Seguridad')}
                                >
                                    <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
                                    <Text style={[styles.assistanceBtnText, { color: '#EF4444' }]}>ALERTA</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </Pressable>
        </MotiView>
    );
};

const styles = StyleSheet.create({
    card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    indexBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    indexText: { fontSize: 10, fontWeight: '800' },
    habitacionText: { fontSize: 18, fontWeight: '900' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700' },
    cardBody: {},
    infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { fontSize: 11 },
    detailsContainer: { gap: 4 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
    detailLabel: { fontSize: 12 },
    detailValue: { fontSize: 12, fontWeight: '700' },
    priceValue: { fontSize: 18, fontWeight: '900' },
    assistanceContainer: { marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(155,155,155,0.1)' },
    assistanceTitle: { fontSize: 9, fontWeight: '900', marginBottom: 8, opacity: 0.5 },
    assistanceGrid: { flexDirection: 'row', gap: 6 },
    assistanceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
    assistanceBtnText: { fontSize: 10, fontWeight: '800' },
});

