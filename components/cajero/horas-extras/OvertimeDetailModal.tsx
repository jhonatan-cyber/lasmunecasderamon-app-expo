import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OvertimeRecord } from '@/hooks/useHorasExtrasScreen';

const statusConfig: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: 'Pagado', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
    1: { label: 'Por cobrar', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
};

function getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const formatCurrency = (value: number) => `$${(Number(value) || 0).toLocaleString('de-DE')}`;

interface OvertimeDetailModalProps {
    visible: boolean;
    record: OvertimeRecord | null;
    onClose: () => void;
    accentColor: string;
    cardBg: string;
    borderColor: string;
    textPrimary: string;
    textSecondary: string;
    isDark: boolean;
}

export function OvertimeDetailModal({
    visible,
    record,
    onClose,
    accentColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
    isDark,
}: OvertimeDetailModalProps) {
    if (!record) return null;

    const status = statusConfig[record.estado] || statusConfig[1];
    const fecCrea = new Date(record.fecha_crea);
    const fecMod = record.fecha_mod ? new Date(record.fecha_mod) : null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={[styles.modalContainer, { backgroundColor: cardBg }]}>
                    {}
                    <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                        <View style={styles.headerContent}>
                            <View style={[styles.modalAvatar, { backgroundColor: accentColor + '20' }]}>
                                <Text style={[styles.modalAvatarText, { color: accentColor }]}>
                                    {getInitials(record.usuario)}
                                </Text>
                            </View>
                            <View style={styles.titleContainer}>
                                <Text style={[styles.modalTitle, { color: textPrimary }]} numberOfLines={1}>
                                    {record.usuario}
                                </Text>
                                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                                    {fecCrea.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </Text>
                            </View>
                            <Pressable 
                                onPress={onClose} 
                                style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
                            >
                                <Ionicons name="close" size={20} color={textPrimary} />
                            </Pressable>
                        </View>
                    </View>

                    <ScrollView style={styles.modalBody} contentContainerStyle={styles.scrollBody}>
                        {}
                        <View style={[styles.modalStatusBanner, { backgroundColor: status.bg }]}>
                            <View style={[styles.modalStatusDot, { backgroundColor: status.color }]} />
                            <Text style={[styles.modalStatusBannerText, { color: status.color }]}>{status.label}</Text>
                        </View>

                        {}
                        <View style={[styles.modalDetailCard, { backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB', borderColor }]}>
                            <Text style={[styles.modalDetailSectionTitle, { color: textSecondary }]}>Información del Registro</Text>
                            <View style={styles.detailsList}>
                                <View style={styles.modalDetailRow}>
                                    <View style={[styles.modalDetailIconBox, { backgroundColor: `${accentColor}15` }]}>
                                        <Ionicons name="person-outline" size={16} color={accentColor} />
                                    </View>
                                    <View style={styles.rowText}>
                                        <Text style={[styles.modalDetailLabel, { color: textSecondary }]}>Empleado</Text>
                                        <Text style={[styles.modalDetailValue, { color: textPrimary }]}>{record.usuario}</Text>
                                    </View>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <View style={[styles.modalDetailIconBox, { backgroundColor: '#3B82F615' }]}>
                                        <Ionicons name="time-outline" size={16} color="#3B82F6" />
                                    </View>
                                    <View style={styles.rowText}>
                                        <Text style={[styles.modalDetailLabel, { color: textSecondary }]}>Horas extras</Text>
                                        <Text style={[styles.modalDetailValue, { color: textPrimary }]}>{record.hora.toFixed(1)} horas</Text>
                                    </View>
                                </View>
                                <View style={styles.modalDetailRow}>
                                    <View style={[styles.modalDetailIconBox, { backgroundColor: '#8B5CF615' }]}>
                                        <Ionicons name="cash-outline" size={16} color="#8B5CF6" />
                                    </View>
                                    <View style={styles.rowText}>
                                        <Text style={[styles.modalDetailLabel, { color: textSecondary }]}>Valor por hora</Text>
                                        <Text style={[styles.modalDetailValue, { color: textPrimary }]}>{formatCurrency(record.monto)}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {}
                        <View style={[styles.modalTotalCard, { backgroundColor: accentColor + '10', borderColor: accentColor + '30' }]}>
                            <View style={styles.totalTextContainer}>
                                <Text style={[styles.modalTotalLabel, { color: textSecondary }]}>Total a pagar</Text>
                                <Text style={[styles.modalTotalValue, { color: accentColor }]}>
                                    {formatCurrency(record.total || record.monto)}
                                </Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={32} color={accentColor} />
                        </View>

                        {}
                        <View style={[styles.modalDetailCard, { backgroundColor: isDark ? '#1A1A1A' : '#F9FAFB', borderColor }]}>
                            <Text style={[styles.modalDetailSectionTitle, { color: textSecondary }]}>Metadatos</Text>
                            <View style={styles.metadataList}>
                                <View style={styles.modalMetaRow}>
                                    <Text style={[styles.modalMetaLabel, { color: textSecondary }]}>ID Registro</Text>
                                    <Text style={[styles.modalMetaValue, { color: textPrimary }]}>#{record.id_hora_extra}</Text>
                                </View>
                                <View style={styles.modalMetaRow}>
                                    <Text style={[styles.modalMetaLabel, { color: textSecondary }]}>Fecha creación</Text>
                                    <Text style={[styles.modalMetaValue, { color: textPrimary }]}>
                                        {fecCrea.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                {fecMod && (
                                    <View style={styles.modalMetaRow}>
                                        <Text style={[styles.modalMetaLabel, { color: textSecondary }]}>Última modificación</Text>
                                        <Text style={[styles.modalMetaValue, { color: textPrimary }]}>
                                            {fecMod.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end' 
    },
    modalContainer: {
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24,
        maxHeight: '85%', 
        minHeight: '40%', 
        overflow: 'hidden',
    },
    modalHeader: {
        paddingHorizontal: 20, 
        paddingVertical: 16, 
        borderBottomWidth: 1,
    },
    headerContent: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12, 
        flex: 1 
    },
    modalAvatar: { 
        width: 42, 
        height: 42, 
        borderRadius: 14, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    modalAvatarText: { 
        fontSize: 14, 
        fontWeight: '900' 
    },
    titleContainer: { 
        flex: 1 
    },
    modalTitle: { 
        fontSize: 16, 
        fontWeight: '900' 
    },
    modalSubtitle: { 
        fontSize: 12, 
        fontWeight: '500', 
        marginTop: 1 
    },
    modalCloseBtn: { 
        width: 34, 
        height: 34, 
        borderRadius: 17, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    modalBody: { 
        flex: 1, 
        paddingHorizontal: 20, 
        paddingTop: 16 
    },
    scrollBody: { 
        paddingBottom: 30 
    },
    modalStatusBanner: {
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 8,
        paddingVertical: 12, 
        borderRadius: 14, 
        marginBottom: 16,
    },
    modalStatusDot: { 
        width: 8, 
        height: 8, 
        borderRadius: 4 
    },
    modalStatusBannerText: { 
        fontSize: 14, 
        fontWeight: '800' 
    },
    modalDetailCard: { 
        borderRadius: 16, 
        padding: 16, 
        borderWidth: 1, 
        marginBottom: 14 
    },
    modalDetailSectionTitle: { 
        fontSize: 11, 
        fontWeight: '700', 
        textTransform: 'uppercase', 
        letterSpacing: 0.5 
    },
    detailsList: { 
        gap: 12, 
        marginTop: 10 
    },
    modalDetailRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12 
    },
    modalDetailIconBox: { 
        width: 32, 
        height: 32, 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    rowText: { 
        flex: 1 
    },
    modalDetailLabel: { 
        fontSize: 11, 
        fontWeight: '500' 
    },
    modalDetailValue: { 
        fontSize: 15, 
        fontWeight: '800' 
    },
    modalTotalCard: {
        flexDirection: 'row', 
        alignItems: 'center',
        borderRadius: 16, 
        padding: 18, 
        borderWidth: 1, 
        marginBottom: 14,
    },
    totalTextContainer: { 
        flex: 1 
    },
    modalTotalLabel: { 
        fontSize: 12, 
        fontWeight: '600' 
    },
    modalTotalValue: { 
        fontSize: 22, 
        fontWeight: '900', 
        marginTop: 2 
    },
    metadataList: { 
        gap: 8, 
        marginTop: 10 
    },
    modalMetaRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    modalMetaLabel: { 
        fontSize: 12, 
        fontWeight: '500' 
    },
    modalMetaValue: { 
        fontSize: 13, 
        fontWeight: '700' 
    },
});
