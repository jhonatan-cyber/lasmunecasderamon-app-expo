import { useAccentColor } from '@/hooks/useAccentColor';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { EventDetailSection } from '@/components/shared/EventDetailSection';

interface EventDetailModalProps {
    visible: boolean;
    event: any;
    eventDetail: any;
    loadingDetail: boolean;
    onClose: () => void;
    getEventLabel: (event: any) => string;
    getStatusLabel: (event: any) => string;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
    visible,
    event,
    eventDetail,
    loadingDetail,
    onClose,
    getEventLabel,
    getStatusLabel
}) => {
    const {accentColor, accentText, cardBg, textPrimary, textSecondary, borderColor, surfaceMuted, accentOnSurface, accentBg} = useAccentColor();
    const formatAmount = (value: any) =>
        Number(value || 0).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const getIconName = (type: string) => {
        switch (type) {
            case 'venta': return 'cart';
            case 'propina': return 'heart';
            case 'comision': return 'star';
            case 'asistencia': return 'calendar';
            case 'servicio': return 'time';
            default: return 'cash';
        }
    };

    const isAnticipo = event?.type === 'anticipo';
    const iconColor = isAnticipo ? accentColor : accentOnSurface;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlayCenter}>
                <View style={[styles.detailCard, { backgroundColor: cardBg }]}>
                    <View style={styles.detailHeader}>
                        <View style={[styles.detailIconBox, { backgroundColor: `${iconColor}20` }]}>
                            <Ionicons
                                name={getIconName(event?.type) as keyof typeof Ionicons.glyphMap}
                                size={32}
                                color={iconColor}
                            />
                        </View>
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Cerrar detalle"
                            style={({ pressed }) => [
                                styles.detailCloseBtn,
                                { backgroundColor: surfaceMuted, opacity: pressed ? 0.7 : 1 },
                            ]}
                        >
                            <Ionicons name="close" size={22} color={textPrimary} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailBody}>
                        <Text style={[styles.detailType, { color: textSecondary }]}>
                            {getEventLabel(event).toUpperCase()}
                        </Text>
                        <Text style={[styles.detailAmount, { color: iconColor }]}>
                            {isAnticipo ? '-' : '+'}${formatAmount(event?.amount)}
                        </Text>

                        <View style={[styles.divider, { backgroundColor: borderColor }]} />

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Fecha y Hora</Text>
                            <Text style={[styles.detailValue, { color: textPrimary }]}>
                                {event ? new Date(event.date).toLocaleString('es-ES', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }) : ''}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Tipo</Text>
                            <Text style={[styles.detailValue, { color: textPrimary }]}>{getEventLabel(event)}</Text>
                        </View>

                        {event?.subType && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: textSecondary }]}>Origen</Text>
                                <Text style={[styles.detailValue, { color: textPrimary }]}>
                                    {event.subType === 'venta' ? 'Venta' : event.subType === 'servicio' ? 'Servicio' : 'General'}
                                </Text>
                            </View>
                        )}

                        {(event?.type === 'venta' || event?.type === 'servicio') && event?.codigo && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: textSecondary }]}>Código</Text>
                                <Text style={[styles.detailValue, { color: textPrimary }]}>{String(event.codigo)}</Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Estado</Text>
                            <View style={[styles.statusBadgeDetail, { backgroundColor: event?.estado === 3 ? accentBg : `${accentOnSurface}20` }]}>
                                <Text style={[styles.statusTextDetail, { color: event?.estado === 3 ? accentColor : accentOnSurface }]}>
                                    {event ? getStatusLabel(event) : ''}
                                </Text>
                            </View>
                        </View>

                        {loadingDetail && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: textSecondary }]}>Cargando detalle...</Text>
                            </View>
                        )}

                        <EventDetailSection
                            eventDetail={eventDetail}
                            accentColor={accentColor}
                            borderColor={borderColor}
                            textPrimary={textPrimary}
                            textSecondary={textSecondary}
                            formatAmount={formatAmount}
                        />
                    </ScrollView>

                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        style={[styles.confirmBtn, { backgroundColor: accentColor }]}
                    >
                        <Text style={[styles.confirmBtnText, { color: accentText }]}>Entendido</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlayCenter: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    detailCard: {
        width: '100%',
        maxHeight: '85%',
        borderRadius: BorderRadius.card,
        padding: 24,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    detailIconBox: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center'
    },
    detailCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center'
    },
    detailBody: {
        alignItems: 'center',
        paddingBottom: 8
    },
    detailType: {
        fontSize: 13,
        fontFamily: FontFamily.extrabold,
        letterSpacing: 2,
        marginBottom: 8
    },
    detailAmount: {
        fontSize: 42,
        fontFamily: FontFamily.black,
        letterSpacing: -1
    },
    divider: {
        width: '100%',
        height: 1,
        marginVertical: 25,
        opacity: 0.5
    },
    detailRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    detailLabel: {
        fontSize: 13,
        fontFamily: FontFamily.semibold
    },
    detailValue: {
        fontSize: 14,
        fontFamily: FontFamily.bold
    },
    statusBadgeDetail: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    statusTextDetail: {
        fontSize: 11,
        fontFamily: FontFamily.extrabold
    },
    confirmBtn: {
        width: '100%',
        height: 56,
        borderRadius: BorderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        marginTop: 16
    },
    confirmBtnText: {
        fontSize: 16,
        fontFamily: FontFamily.extrabold
    }
});

