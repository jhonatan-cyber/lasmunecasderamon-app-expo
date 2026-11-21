import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Servicio } from '@/hooks/useServicios';
import {
    estadoServicio,
    type EstadoServicioKey,
} from '@/utils/servicioEstado';
import { BorderRadius, FontSize, HitSlop } from '@/constants/spacing';

interface ServiceCardProps {
    item: Servicio;
    index: number;
    onPress: (item: Servicio) => void;
    onAssistance: (servicioId: number, roomName: string, type: string) => void;
}

export const ServiceCard = ({ item, index, onPress, onAssistance }: ServiceCardProps) => {
    const { accentColor, isDark, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface} = useAccentColor();

    const estadoInfo = estadoServicio(item.estado);
    const isProceso = estadoInfo.key === "en_proceso";

    const statusColors: Record<EstadoServicioKey, { bg: string; text: string }> = {
        anulado: { bg: isDark ? '#450a0a' : '#fee2e2', text: isDark ? '#fca5a5' : '#991b1b' },
        finalizado: { bg: isDark ? '#064e3b' : '#d1fae5', text: isDark ? '#6ee7b7' : '#065f46' },
        en_proceso: { bg: isDark ? '#7C2D12' : '#FEF3C7', text: isDark ? '#FDBA74' : '#92400E' },
        pausado: { bg: isDark ? '#374151' : '#E5E7EB', text: isDark ? '#D1D5DB' : '#4B5563' },
        solicitud_anulada: { bg: isDark ? '#581c87' : '#f3e8ff', text: isDark ? '#c084fc' : '#6b21a8' },
        desconocido: { bg: '#999', text: '#FFF' },
    };

    const status = {
        ...statusColors[estadoInfo.key],
        label: estadoInfo.label,
    };

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

    const staggerDelay = Math.min(index, 5) * 30;

    return (
        <AnimatedView 
            from={{ opacity: 0, translateY: 20 }} 
            animate={{ opacity: 1, translateY: 0 }} 
            transition={{ type: 'spring', delay: staggerDelay }}
        >
            <Pressable 
                style={[styles.card, { backgroundColor: cardBg, borderColor }]} 
                onPress={() => onPress(item)}
                accessibilityRole="button"
                accessibilityLabel={`Servicio en ${item.habitacion}, estado: ${status.label}`}
                accessibilityHint="Toque para ver detalles"
            >
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.indexText, { color: textPrimary, fontSize: FontSize.xs }]}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.habitacionText, { color: textPrimary }]}>{item.habitacion}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.text, fontSize: FontSize.xs }]}>{status.label}</Text>
                    </View>
                </View>
                
                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Ionicons name="calendar-outline" size={FontSize.xs} color={textSecondary} />
                            <Text style={[styles.infoText, { color: textSecondary, fontSize: FontSize.xs }]}>{formatDate(item.fecha_crea)}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="time-outline" size={FontSize.xs} color={textSecondary} />
                            <Text style={[styles.infoText, { color: textSecondary, fontSize: FontSize.xs }]}>{formatTime(item.fecha_crea)}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary, fontSize: FontSize.xs }]}>Código:</Text>
                            <Text style={[styles.detailValue, { color: textPrimary, fontSize: FontSize.xs }]}>{item.codigo}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary, fontSize: FontSize.xs }]}>Mi Comisión:</Text>
                            <Text style={[styles.priceValue, { color: accentOnSurface }]}>${(item.comision_usuario || 0).toLocaleString()}</Text>
                        </View>
                    </View>

                    {isProceso && (
                        <View style={styles.assistanceContainer}>
                            <Text style={[styles.assistanceTitle, { fontSize: FontSize.xs }]}>SILENT ASSISTANCE:</Text>
                            <View style={styles.assistanceGrid}>
                                <Pressable 
                                    style={[styles.assistanceBtn, { backgroundColor: isDark ? '#1e3a8a30' : '#e0e7ff' }]} 
                                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAssistance(item.id_servicio, item.habitacion, 'Tragos'); }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Solicitar tragos en ${item.habitacion}`}
                                    hitSlop={HitSlop.md}
                                >
                                    <Ionicons name="beer-outline" size={FontSize.xs} color={accentOnSurface} />
                                    <Text style={[styles.assistanceBtnText, { color: accentOnSurface, fontSize: FontSize.xs }]}>Tragos</Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.assistanceBtn, { backgroundColor: isDark ? '#065F4630' : '#d1fae5' }]} 
                                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAssistance(item.id_servicio, item.habitacion, 'Limpieza/Hielo'); }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Solicitar servicio en ${item.habitacion}`}
                                    hitSlop={HitSlop.md}
                                >
                                    <Ionicons name="sparkles-outline" size={FontSize.xs} color="#10B981" />
                                    <Text style={[styles.assistanceBtnText, { color: '#10B981', fontSize: FontSize.xs }]}>Servicio</Text>
                                </Pressable>
                                <Pressable 
                                    style={[styles.assistanceBtn, { backgroundColor: isDark ? '#450a0a' : '#fee2e2' }]} 
                                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onAssistance(item.id_servicio, item.habitacion, 'Seguridad'); }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Enviar alerta de seguridad en ${item.habitacion}`}
                                    hitSlop={HitSlop.md}
                                >
                                    <Ionicons name="alert-circle-outline" size={FontSize.xs} color="#EF4444" />
                                    <Text style={[styles.assistanceBtnText, { color: '#EF4444', fontSize: FontSize.xs }]}>ALERTA</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </Pressable>
        </AnimatedView>
    );
};

const styles = StyleSheet.create({
    card: { borderRadius: BorderRadius.card, padding: 16, marginTop: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    indexBadge: { width: 24, height: 24, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
    indexText: { fontWeight: '800' },
    habitacionText: { fontSize: 18, fontWeight: '800' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm },
    statusText: { fontWeight: '700' },
    cardBody: {},
    infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: {},
    detailsContainer: { gap: 4 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
    detailLabel: {},
    detailValue: { fontWeight: '700' },
    priceValue: { fontSize: 18, fontWeight: '800' },
    assistanceContainer: { marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(155,155,155,0.1)' },
    assistanceTitle: { fontWeight: '800', marginBottom: 8, opacity: 0.5 },
    assistanceGrid: { flexDirection: 'row', gap: 6 },
    assistanceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderRadius: BorderRadius.sm },
    assistanceBtnText: { fontWeight: '700' },
});

