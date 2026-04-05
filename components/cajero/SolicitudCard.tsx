import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { parseDateSafe } from '@/utils/timeUtils';

interface SolicitudCardProps {
    item: any;
    accentColor: string;
    textPrimary: string;
    textSecondary: string;
    cardBg: string;
    borderColor: string;
    serverOffset: number;
    cajaAbierta: boolean;
    onAprobar: (id: string, tipo: string, item: any) => void;
    onRechazar: (id: string, tipo: string) => void;
    onShowServiceModal: (item: any) => void;
    nowTick?: number; // Para forzar re-render de timers
}

export const SolicitudCard: React.FC<SolicitudCardProps> = ({
    item,
    accentColor,
    textPrimary,
    textSecondary,
    cardBg,
    borderColor,
    serverOffset,
    cajaAbierta,
    onAprobar,
    onRechazar,
    onShowServiceModal,
    nowTick
}) => {
    const isSolicitud = item.tipoItem === 'solicitud';
    const isAnticipo = item.tipoItem === 'anticipo';
    const iconName = isSolicitud ? 'receipt' : isAnticipo ? 'cash' : 'beer';
    const color = isSolicitud ? accentColor : isAnticipo ? '#10B981' : '#F59E0B';
    
    const bedText = isSolicitud 
        ? `Hab: ${item.habitacion_nombre || 'N/A'}` 
        : isAnticipo ? 'Anticipo' : `Mesa/Sala`;
        
    const personText = isSolicitud 
        ? `Gz: ${item.solicitado_por_nombre || 'Desconocido'}` 
        : isAnticipo ? `De: ${item.usuario}` : `Gz: ${item.mesero_nick || item.mesero_nombre || item.garzon || 'Desconocido'}`;
        
    const recordTime = parseDateSafe(isSolicitud ? item.fecha_solicitud : item.fecha_crea);
    const timeText = new Date(recordTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'});
    const responseTime = isAnticipo && item.fecha_mod
        ? new Date(parseDateSafe(item.fecha_mod)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    const nowServerMs = Date.now() + serverOffset;
    const minutesElapsed = Math.floor((nowServerMs - recordTime.getTime()) / 60000);

    const isUrgent = minutesElapsed >= 5 && !isAnticipo;
    const itemId = isSolicitud ? item.id_solicitud : isAnticipo ? item.id_anticipo : item.id_pedido;
    const tipoItem = item.tipoItem;
    console.log('[SolicitudCard] Render - itemId:', itemId, 'id_solicitud:', item.id_solicitud, 'id_anticipo:', item.id_anticipo, 'id_pedido:', item.id_pedido, 'tipoItem:', tipoItem);

    const handleCardPress = () => {
        console.log('[SolicitudCard] itemId:', itemId, 'tipoItem:', item.tipoItem, 'item keys:', Object.keys(item));
        if (isSolicitud) {
            onShowServiceModal(item);
        } else if (isAnticipo) {
            if (item.estado === 1) {
                onAprobar(itemId, 'anticipo', item);
            }
        } else {
            onAprobar(itemId, 'pedido', item);
        }
    };

    return (
        <Pressable
            style={[
                styles.card,
                { backgroundColor: cardBg, borderColor },
                isUrgent && styles.cardUrgent
            ]}
            onPress={handleCardPress}
        >
            {isUrgent && (
                <MotiView
                    from={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true, repeatReverse: true }}
                    style={styles.urgentBadge}
                >
                    <Text style={styles.urgentBadgeText}>ATENCIÓN CRÍTICA</Text>
                </MotiView>
            )}
            <View style={styles.cardHeader}>
                <View style={styles.badgeContainer}>
                    <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
                        <Ionicons name={iconName} size={16} color={color} />
                    </View>
                    <Text style={[styles.codigo, { color: textPrimary }]}>Codigo : {item.codigo}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
                        <Text style={[styles.typeText, { color }]}>{isSolicitud ? 'Servicio' : isAnticipo ? 'Anticipo' : 'Trago'}</Text>
                    </View>
                </View>
                <Text style={styles.precio}>${Math.floor(item.monto || item.total || 0).toLocaleString('de-DE')}</Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Ionicons name="bed" size={16} color={textSecondary} />
                    <Text style={[styles.infoText, { color: textSecondary }]}>{bedText}</Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 4 }]}>
                    <Ionicons name="person" size={16} color={textSecondary} />
                    <Text style={[styles.infoText, { color: textSecondary }]}>{personText}</Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 4 }]}>
                    <Ionicons name="time" size={16} color={isUrgent ? '#EF4444' : textSecondary} />
                    <Text style={[styles.infoText, { color: isUrgent ? '#EF4444' : textSecondary, fontWeight: isUrgent ? '800' : '400' }]}>
                        {timeText}{(isSolicitud && item.habitacion_nombre) ? ` (${minutesElapsed} min)` : ''}
                    </Text>
                </View>
                {isAnticipo && (
                    <View
                        style={[
                            styles.responseBox,
                            {
                                backgroundColor: item.estado === 1 ? '#DCFCE7' : '#DBEAFE',
                                borderColor: item.estado === 1 ? '#86EFAC' : '#93C5FD'
                            }
                        ]}
                    >
                        <Text style={[styles.responseTitle, { color: item.estado === 1 ? '#166534' : '#1D4ED8' }]}>
                            {item.estado === 1 ? 'Aprobado por administrador' : 'Esperando respuesta del administrador'}
                        </Text>
                        <Text style={[styles.responseText, { color: item.estado === 1 ? '#166534' : textSecondary }]}>
                            {item.motivo || 'Sin detalle adicional'}
                        </Text>
                        {responseTime && item.estado === 1 ? (
                            <Text style={[styles.responseMeta, { color: '#166534' }]}>
                                Respondido a las {responseTime}
                            </Text>
                        ) : null}
                    </View>
                )}
            </View>

            <View style={[styles.cardFooter, !cajaAbierta && { opacity: 0.5 }]}>
                {isAnticipo ? (
                    <>
                        {item.estado === 2 ? (
                            <View style={[styles.btnAction, { backgroundColor: '#3B82F620', flex: 1 }]}>
                                <Text style={[styles.btnActionText, { color: '#3B82F6' }]}>Esp. Admin</Text>
                            </View>
                        ) : (
                            <Pressable
                                style={[styles.btnAction, { backgroundColor: accentColor, flex: 1 }]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onAprobar(itemId, 'anticipo', item);
                                }}
                                disabled={!cajaAbierta}
                            >
                                <Text style={[styles.btnActionText, { color: '#FFFFFF' }]}>Entregar Efectivo</Text>
                            </Pressable>
                        )}
                    </>
                ) : (
                    <>
                        <Pressable
                            style={[styles.btnAction, { backgroundColor: '#EF444420' }]}
                            onPress={(e) => {
                                e.stopPropagation();
                                onRechazar(itemId, item.tipoItem);
                            }}
                            disabled={!cajaAbierta}
                        >
                            <Text style={[styles.btnActionText, { color: '#EF4444' }]}>Rechazar</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.btnAction, { backgroundColor: accentColor, flex: 1.5 }]}
                            onPress={(e) => {
                                e.stopPropagation();
                                const idAEnviar = tipoItem === 'solicitud' ? item.id_solicitud : tipoItem === 'anticipo' ? item.id_anticipo : item.id_pedido;
                                console.log('[SolicitudCard] APROBAR - tipoItem:', tipoItem, 'idCalculado:', idAEnviar, 'id_pedido:', item.id_pedido, 'id_solicitud:', item.id_solicitud);
                                onAprobar(idAEnviar, tipoItem, item);
                            }}
                            disabled={!cajaAbierta}
                        >
                            <Text style={[styles.btnActionText, { color: '#FFFFFF' }]}>Aprobar</Text>
                        </Pressable>
                    </>
                )}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    cardUsual: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    card: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    cardUrgent: { borderColor: '#EF4444', borderWidth: 2, shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    codigo: { fontSize: 16, fontWeight: '800' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
    typeText: { fontSize: 12, fontWeight: '700' },
    precio: { fontSize: 18, fontWeight: '900', color: '#10B981' },
    cardBody: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 12, marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoText: { fontSize: 13, fontWeight: '600' },
    responseBox: { marginTop: 12, borderRadius: 12, borderWidth: 1, padding: 10, gap: 4 },
    responseTitle: { fontSize: 12, fontWeight: '800' },
    responseText: { fontSize: 12, fontWeight: '600' },
    responseMeta: { fontSize: 11, fontWeight: '700' },
    cardFooter: { flexDirection: 'row', gap: 10 },
    btnAction: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    btnActionText: { fontSize: 14, fontWeight: '800' },
    urgentBadge: {
        position: 'absolute',
        top: -12,
        right: 16,
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 10,
        elevation: 5,
        shadowColor: '#EF4444',
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    urgentBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
});


