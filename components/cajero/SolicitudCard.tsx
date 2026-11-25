import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { FontSize, HitSlop, BorderRadius } from '@/constants/spacing';
import { FontFamily, TabularNumbers } from '@/constants/fonts';
import { parseDateSafe } from '@/utils/timeUtils';
import { formatCurrency } from '@/utils/format';
import type { SolicitudItem } from '@/hooks/types/solicitudesTypes';
import { useAccentColor } from '@/hooks/useAccentColor';

import logger from '@/utils/logger';
import { useRenderCount } from '@/hooks/useRenderCount';
import { haptic } from '@/utils/haptics';

interface SolicitudCardProps {
    item: SolicitudItem;
    accentColor: string;
    textPrimary: string;
    textSecondary: string;
    cardBg: string;
    borderColor: string;
    serverOffset: number;
    cajaAbierta: boolean;
    isDark?: boolean;
    onAprobar: (id: string, tipo: "pedido" | "solicitud" | "anticipo", item: SolicitudItem) => void;
    onRechazar: (id: string, tipo: "pedido" | "solicitud" | "anticipo") => void;
    onShowServiceModal: (item: SolicitudItem) => void;
    nowTick?: number;
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
    isDark = false,
    onAprobar,
    onRechazar,
    onShowServiceModal,
    nowTick
}) => {
    const { accentOnSurface, accentBg, accentColor: themeAccent, accentText } = useAccentColor();
    useRenderCount('SolicitudCard', { id: item.id_solicitud || item.id_anticipo || item.id_pedido, tipo: item.tipoItem });
    const isSolicitud = item.tipoItem === 'solicitud';
    const isAnticipo = item.tipoItem === 'anticipo';
    const anticipoEntregado = item.tipoItem === 'anticipo' && !!item.fecha_entrega;
    const iconName = isSolicitud ? 'receipt' : isAnticipo ? 'cash' : 'beer';
    const color = isSolicitud ? accentColor : isAnticipo ? accentOnSurface : accentOnSurface;
    const tipoLabel = isSolicitud ? 'Servicio' : isAnticipo ? 'Anticipo' : 'Trago';

    const personText = isSolicitud
        ? item.solicitado_por_nombre || 'Desconocido'
        : isAnticipo ? item.usuario || 'Desconocido' : item.mesero_nick || item.mesero_nombre || item.garzon || 'Desconocido';

    const recordTime = parseDateSafe(isSolicitud ? item.fecha_solicitud : item.fecha_crea);
    const hasValidDate = !isNaN(recordTime.getTime());
    const timeText = hasValidDate
        ? recordTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';
    // Fecha de la solicitud (día/mes) para poder ubicarla en el listado.
    const dateText = hasValidDate
        ? recordTime.toLocaleDateString('es-CL', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : '—';
    const responseTime = isAnticipo && item.fecha_mod
        ? new Date(parseDateSafe(item.fecha_mod)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    const nowServerMs = Date.now() + serverOffset;
    const minutesElapsed = Math.floor((nowServerMs - recordTime.getTime()) / 60000);

    const isUrgent = minutesElapsed >= 5 && !isAnticipo;
    const itemId = String(item.id_solicitud || item.id_anticipo || item.id_pedido || '');
    const tipoItem = item.tipoItem;

    const monto = Math.floor(item.monto || item.total || 0);
    const hasMonto = monto > 0;

    const handleCardPress = () => {
        logger.debug('[SolicitudCard] itemId:', { arg0: itemId, arg1: 'tipoItem:', arg2: item.tipoItem, arg3: 'item keys:', arg4: Object.keys(item) });
        if (isSolicitud) {
            haptic.tap();
            onShowServiceModal(item);
        } else if (isAnticipo) {
            if (item.estado === 1 && !anticipoEntregado) {
                haptic.tap();
                onAprobar(itemId, 'anticipo', item);
            }
        } else {
            haptic.tap();
            onAprobar(itemId, 'pedido', item);
        }
    };

    const neonGlow = isDark ? {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    } : {};

    return (
        <View style={[
            styles.card,
            { backgroundColor: cardBg, borderColor },
            neonGlow,
            isUrgent && styles.cardUrgent,
        ]}>
            <Pressable
                style={styles.cardInner}
                onPress={handleCardPress}
                hitSlop={HitSlop.sm}
            >
                {/* Badge de criticidad en su propia fila: así no tapa el pill de monto */}
                {isUrgent && (
                    <View style={styles.urgentRow}>
                        <AnimatedView
                            from={{ opacity: 0.5 }}
                            animate={{ opacity: 1 }}
                            transition={{ type: 'timing', duration: 1000, loop: true, repeatReverse: true }}
                            style={[styles.urgentBadge, { backgroundColor: themeAccent, shadowColor: themeAccent }]}
                        >
                            <Text style={[styles.urgentBadgeText, { color: accentText }]}>CRÍTICA</Text>
                        </AnimatedView>
                    </View>
                )}

                {/* Header: tipo + código + monto pill */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
                            <Ionicons name={iconName} size={14} color={color} />
                        </View>
                        <View>
                            <Text style={[styles.codigo, { color: textPrimary }]} numberOfLines={1}>
                                {item.codigo}
                            </Text>
                            <Text style={[styles.tipoLabel, { color }]}>{tipoLabel}</Text>
                        </View>
                    </View>
                    <View style={[styles.montoPill, {
                        backgroundColor: hasMonto ? `${color}1A` : 'rgba(155,155,155,0.05)',
                    }]}>
                        <Ionicons name="cash-outline" size={12} color={hasMonto ? color : textSecondary} />
                        <View>
                            <Text style={[styles.pillLabel, { color: textSecondary }]}>MONTO</Text>
                            <Text style={[styles.montoValue, { color: hasMonto ? color : textPrimary }]}>
                                {formatCurrency(monto)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Metadata section */}
                <View style={styles.metadataRow}>
                    {isSolicitud && item.habitacion_nombre ? (
                        <View style={styles.metadataItem}>
                            <Ionicons name="bed-outline" size={12} color={textSecondary} />
                            <Text style={[styles.metadataText, { color: textSecondary }]} numberOfLines={1}>
                                Hab: {item.habitacion_nombre}
                            </Text>
                        </View>
                    ) : null}
                    <View style={styles.metadataItem}>
                        <Ionicons name="person-outline" size={12} color={textSecondary} />
                        <Text style={[styles.metadataText, { color: textSecondary }]} numberOfLines={1}>
                            {personText}
                        </Text>
                    </View>
                    <View style={styles.metadataItem}>
                        <Ionicons name="time-outline" size={12} color={isUrgent ? accentColor : textSecondary} />
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.metadataText,
                                {
                                    color: isUrgent ? accentColor : textSecondary,
                                    fontFamily: isUrgent ? FontFamily.bold : FontFamily.medium,
                                    flexShrink: 1,
                                },
                            ]}
                        >
                            {dateText} {timeText}
                            {isSolicitud && item.habitacion_nombre && Number.isFinite(minutesElapsed)
                                ? ` • ${minutesElapsed} min`
                                : ''}
                        </Text>
                    </View>
                </View>

                {/* Anticipo response box */}
                {isAnticipo && (
                    <View style={[
                        styles.responseBox,
                        {
                            backgroundColor: item.estado === 1 ? `${accentOnSurface}10` : `${accentColor}10`,
                            borderColor: item.estado === 1 ? `${accentOnSurface}30` : `${accentColor}30`,
                        }
                    ]}>
                        <View style={styles.responseContent}>
                            <Ionicons
                                name={anticipoEntregado ? 'checkmark-circle' : item.estado === 1 ? 'shield-checkmark' : 'time'}
                                size={14}
                                color={item.estado === 1 ? accentOnSurface : accentColor}
                            />
                            <Text style={[styles.responseText, { color: item.estado === 1 ? accentOnSurface : accentColor }]}>
                                {anticipoEntregado
                                    ? 'Entregado por cajero'
                                    : item.estado === 1
                                        ? 'Aprobado por administrador'
                                        : 'Esperando respuesta'}
                            </Text>
                            {responseTime && item.estado === 1 && (
                                <Text style={[styles.responseTime, { color: accentOnSurface }]}>
                                    {responseTime}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Actions section */}
                <View style={[styles.actionsRow, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                    {isAnticipo ? (
                        <>
                            {item.estado === 2 ? (
                                <View style={[styles.actionBtn, { backgroundColor: `${accentColor}1A`, flex: 1 }]}>
                                    <Ionicons name="hourglass-outline" size={14} color={accentColor} />
                                    <Text style={[styles.actionLabel, { color: accentOnSurface }]}>Esp. Admin</Text>
                                </View>
                            ) : anticipoEntregado ? (
                                <View style={[styles.actionBtn, { backgroundColor: `${accentOnSurface}1A`, flex: 1 }]}>
                                    <Ionicons name="checkmark-circle" size={14} color={accentOnSurface} />
                                    <Text style={[styles.actionLabel, { color: accentOnSurface }]}>Entregado</Text>
                                </View>
                            ) : (
                                <Pressable
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        haptic.tap();
                                        onAprobar(itemId, 'anticipo', item);
                                    }}
                                    disabled={!cajaAbierta}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Entregar anticipo ${item.codigo}`}
                                    accessibilityHint="Marca el anticipo como entregado"
                                    hitSlop={HitSlop.sm}
                                >
                                    {({ pressed }) => (
                                        <View style={[styles.actionBtn, { backgroundColor: `${accentColor}1A`, flex: 1 }, !cajaAbierta && { opacity: 0.5 }, { opacity: pressed ? 0.7 : 1 }]}>
                                            <Ionicons name="cash" size={14} color={accentColor} />
                                            <Text style={[styles.actionLabel, { color: accentOnSurface }]}>Entregar</Text>
                                        </View>
                                    )}
                                </Pressable>
                            )}
                        </>
                    ) : (
                        <>
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    haptic.tap();
                                    onRechazar(itemId, item.tipoItem);
                                }}
                                disabled={!cajaAbierta}
                                accessibilityRole="button"
                                accessibilityLabel={`Rechazar ${item.codigo}`}
                                accessibilityHint="Rechaza la solicitud"
                                hitSlop={HitSlop.sm}
                            >
                                {({ pressed }) => (
                                    <View style={[styles.actionBtn, { backgroundColor: accentBg }, !cajaAbierta && { opacity: 0.5 }, { opacity: pressed ? 0.7 : 1 }]}>
                                        <Ionicons name="close-circle-outline" size={14} color={accentColor} />
                                        <Text style={[styles.actionLabel, { color: accentOnSurface }]}>Rechazar</Text>
                                    </View>
                                )}
                            </Pressable>
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    haptic.tap();
                                    logger.info('[SolicitudCard] APROBAR - tipoItem:', { arg0: tipoItem, arg1: 'idCalculado:', arg2: itemId, arg3: 'id_pedido:', arg4: item.id_pedido, arg5: 'id_solicitud:', arg6: item.id_solicitud });
                                    onAprobar(itemId, tipoItem, item);
                                }}
                                disabled={!cajaAbierta}
                                accessibilityRole="button"
                                accessibilityLabel={`Aprobar ${item.codigo}`}
                                accessibilityHint="Aprueba la solicitud"
                                hitSlop={HitSlop.sm}
                            >
                                {({ pressed }) => (
                                    <View style={[styles.actionBtn, { backgroundColor: `${accentColor}1A`, flex: 1.5 }, !cajaAbierta && { opacity: 0.5 }, { opacity: pressed ? 0.7 : 1 }]}>
                                        <Ionicons name="checkmark-circle" size={14} color={accentColor} />
                                        <Text style={[styles.actionLabel, { color: accentOnSurface }]}>Aprobar</Text>
                                    </View>
                                )}
                            </Pressable>
                        </>
                    )}
                </View>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: BorderRadius.card,
        borderWidth: 1,
        marginBottom: 10,
        marginHorizontal: 6,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    cardUrgent: {
        borderWidth: 2,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    cardInner: {
        flex: 1,
        padding: 12,
        gap: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 0,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    codigo: {
        fontSize: FontSize.sm,
        fontFamily: FontFamily.bold,
        letterSpacing: -0.2,
    },
    tipoLabel: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.semibold,
    },
    montoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        gap: 6,
    },
    pillLabel: {
        fontSize: 9,
        fontFamily: FontFamily.bold,
        letterSpacing: 0.6,
        marginBottom: -1,
        opacity: 0.7,
    },
    montoValue: {
        fontSize: FontSize.xs,
        fontFamily: FontFamily.bold,
        ...TabularNumbers,
    },
    metadataRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    metadataItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metadataText: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.medium,
    },
    responseBox: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        padding: 8,
    },
    responseContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    responseText: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.semibold,
        flex: 1,
    },
    responseTime: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.medium,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        gap: 6,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: BorderRadius.md,
        gap: 4,
    },
    actionLabel: {
        fontSize: FontSize.xxs,
        fontFamily: FontFamily.semibold,
    },
    urgentRow: {
        alignItems: 'flex-end',
    },
    urgentBadge: {
        alignSelf: 'flex-end',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        elevation: 5,
        shadowOpacity: 0.5,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 4 },
    },
    urgentBadgeText: {
        fontSize: 9,
        fontFamily: FontFamily.black,
        letterSpacing: 1,
    },
});


