import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useAccentColor } from '../hooks/useAccentColor';
import { useAuthStore } from '../store/authStore';

interface EventDetailModalProps {
    visible: boolean;
    event: any;
    eventDetail: any;
    loadingDetail: boolean;
    onClose: () => void;
    getEventLabel: (event: any) => string;
    getStatusLabel: (status: any) => string;
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
    const { accentColor, isDark } = useAccentColor();
    const user = useAuthStore((state) => state.user);

    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

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
    const iconColor = isAnticipo ? '#EF4444' : '#10B981';

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
                                name={getIconName(event?.type) as any}
                                size={32}
                                color={iconColor}
                            />
                        </View>
                        <Pressable
                            onPress={onClose}
                            style={styles.detailCloseBtn}
                        >
                            <Ionicons name="close" size={24} color={textPrimary} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailBody}>
                        <Text style={[styles.detailType, { color: textSecondary }]}>
                            {getEventLabel(event).toUpperCase()}
                        </Text>
                        <Text style={[styles.detailAmount, { color: iconColor }]}>
                            {isAnticipo ? '-' : '+'}${event?.amount.toLocaleString()}
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

                        {event?.codigo && event.codigo !== 'TIPS' && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: textSecondary }]}>Código</Text>
                                <Text style={[styles.detailValue, { color: textPrimary }]}>{event.codigo}</Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Estado</Text>
                            <View style={[styles.statusBadgeDetail, { backgroundColor: `${(event?.estado === 3 ? '#EF4444' : '#10B981')}20` }]}>
                                <Text style={[styles.statusTextDetail, { color: event?.estado === 3 ? '#EF4444' : '#10B981' }]}>
                                    {event ? getStatusLabel(event.estado) : ''}
                                </Text>
                            </View>
                        </View>

                        {loadingDetail && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: textSecondary }]}>Cargando detalle...</Text>
                            </View>
                        )}

                        {eventDetail && (
                            <>
                                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                                {eventDetail.tipo === 'asistencia' && (
                                    <>
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Sueldo</Text>
                                            <Text style={[styles.detailValue, { color: textPrimary }]}>${Number(eventDetail.sueldo).toLocaleString()}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Aporte</Text>
                                            <Text style={[styles.detailValue, { color: '#EF4444' }]}>-${Number(eventDetail.aporte).toLocaleString()}</Text>
                                        </View>
                                        {Number(eventDetail.descuento_total) > 0 && (
                                            <View style={styles.detailRow}>
                                                <Text style={[styles.detailLabel, { color: textSecondary }]}>Desc. habitación ({eventDetail.semanas_con_descuento} sem.)</Text>
                                                <Text style={[styles.detailValue, { color: '#EF4444' }]}>-${Number(eventDetail.descuento_total).toLocaleString()}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.divider, { backgroundColor: borderColor }]} />
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Neto por asistencia</Text>
                                            <Text style={[styles.detailValue, { color: '#10B981' }]}>${Number(eventDetail.neto).toLocaleString()}</Text>
                                        </View>
                                    </>
                                )}

                                {eventDetail.tipo === 'anticipo' && (
                                    <>
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Solicitado por</Text>
                                            <Text style={[styles.detailValue, { color: textPrimary }]}>{eventDetail.solicitante_nick || eventDetail.solicitante_nombre}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Monto</Text>
                                            <Text style={[styles.detailValue, { color: '#EF4444' }]}>${Number(eventDetail.monto).toLocaleString()}</Text>
                                        </View>
                                    </>
                                )}

                                {eventDetail.garzon_nombre && (
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: textSecondary }]}>Realizó el pedido</Text>
                                        <Text style={[styles.detailValue, { color: textPrimary }]}>{eventDetail.garzon_nick || eventDetail.garzon_nombre}</Text>
                                    </View>
                                )}

                                {eventDetail.cajero_nombre && (
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: textSecondary }]}>Procesó la venta</Text>
                                        <Text style={[styles.detailValue, { color: textPrimary }]}>{eventDetail.cajero_nick || eventDetail.cajero_nombre}</Text>
                                    </View>
                                )}

                                {eventDetail.habitacion_nombre && (
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: textSecondary }]}>Habitación</Text>
                                        <Text style={[styles.detailValue, { color: textPrimary }]}>{eventDetail.habitacion_nombre}</Text>
                                    </View>
                                )}

                                {eventDetail.tiempo && (
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: textSecondary }]}>Tiempo</Text>
                                        <Text style={[styles.detailValue, { color: textPrimary }]}>{eventDetail.tiempo} min</Text>
                                    </View>
                                )}

                                {eventDetail.cliente_nombre && eventDetail.cliente_nombre !== 'Sin cliente' && (
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: textSecondary }]}>Cliente</Text>
                                        <Text style={[styles.detailValue, { color: textPrimary }]}>{eventDetail.cliente_nombre}</Text>
                                    </View>
                                )}

                                {eventDetail.anfitrionas?.length > 0 && (
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: textSecondary }]}>Anfitrionas</Text>
                                        <Text style={[styles.detailValue, { color: textPrimary, flex: 1, textAlign: 'right' }]}>
                                            {eventDetail.anfitrionas.map((a: any) => a.nick || a.nombre).join(', ')}
                                        </Text>
                                    </View>
                                )}

                                {user?.role?.toLowerCase() !== 'anfitriona' && eventDetail.propinas_detalle?.length > 0 && (
                                    <>
                                        <View style={[styles.divider, { backgroundColor: borderColor }]} />
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Propina total</Text>
                                            <Text style={[styles.detailValue, { color: '#10B981' }]}>
                                                ${eventDetail.propinas_detalle.reduce((s: number, p: any) => s + Number(p.monto), 0).toLocaleString()}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={[styles.detailLabel, { color: textSecondary }]}>Dividida entre</Text>
                                            <Text style={[styles.detailValue, { color: textPrimary }]}>
                                                {eventDetail.propinas_detalle.length} ({eventDetail.propinas_detalle.map((p: any) => p.nick || p.nombre).join(', ')})
                                            </Text>
                                        </View>
                                    </>
                                )}

                                {user?.role?.toLowerCase() === 'anfitriona' && eventDetail.anfitrionas?.length > 0 && (
                                    <View style={{ width: '100%', marginTop: 4 }}>
                                        <Text style={[styles.detailLabel, { color: textSecondary, marginBottom: 8 }]}>Comisión por anfitriona</Text>
                                        {eventDetail.anfitrionas.map((a: any, i: number) => (
                                            <View key={i} style={[styles.detailRow, { marginBottom: 6 }]}>
                                                <Text style={[styles.detailLabel, { color: textPrimary, flex: 1 }]}>{a.nick || a.nombre}</Text>
                                                <Text style={[styles.detailValue, { color: '#10B981' }]}>${Number(a.comision || 0).toLocaleString()}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {eventDetail.detalles?.length > 0 && (
                                    <View style={{ width: '100%', marginTop: 4 }}>
                                        <Text style={[styles.detailLabel, { color: textSecondary, marginBottom: 8 }]}>Productos</Text>
                                        {eventDetail.detalles.map((d: any, i: number) => (
                                            <View key={i} style={[styles.detailRow, { marginBottom: 6 }]}>
                                                <Text style={[styles.detailLabel, { color: textPrimary, flex: 1 }]}>{d.cantidad}x {d.producto_nombre}</Text>
                                                <Text style={[styles.detailValue, { color: textSecondary }]}>${Number(d.subtotal).toLocaleString()}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>

                    <Pressable
                        onPress={onClose}
                        style={[styles.confirmBtn, { backgroundColor: accentColor }]}
                    >
                        <Text style={styles.confirmBtnText}>Entendido</Text>
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
        borderRadius: 32,
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
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center'
    },
    detailCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)'
    },
    detailBody: {
        alignItems: 'center',
        paddingBottom: 8
    },
    detailType: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 8
    },
    detailAmount: {
        fontSize: 42,
        fontWeight: '900',
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
        fontWeight: '600'
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700'
    },
    statusBadgeDetail: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
    },
    statusTextDetail: {
        fontSize: 11,
        fontWeight: '800'
    },
    confirmBtn: {
        width: '100%',
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        marginTop: 16
    },
    confirmBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800'
    }
});
