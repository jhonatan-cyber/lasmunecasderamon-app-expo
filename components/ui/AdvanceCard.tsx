import Ionicons from '@expo/vector-icons/Ionicons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { FontSize, BorderRadius } from '@/constants/spacing';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '../../hooks/useAccentColor';
import { parseDateSafe } from '../../utils/timeUtils';
import { useRenderCount } from '../../hooks/useRenderCount';

export interface Anticipo {
    id_solicitud: number | string;
    usuario_id?: number | string;
    fecha_crea: string;
    fecha_mod?: string | null;
    monto: number;
    estado: number | string;
    estado_texto?: string;
    usuario?: string;
    motivo?: string;
    motivo_rechazo?: string;
}

interface AdvanceCardProps {
    item: Anticipo;
    index?: number;
    showIndexBadge?: boolean;
    compactDate?: boolean;
    viewMode?: 'solicitudes' | 'anticipos';
    normalizeEstado?: (estado: Anticipo['estado'] | number | string) => string;
    onPress?: () => void;
    title?: string;
    statusLabel?: string;
    footer?: React.ReactNode;
}

export function AdvanceCard({
    item,
    index = 0,
    showIndexBadge = true,
    compactDate = false,
    viewMode = 'solicitudes',
    normalizeEstado,
    onPress,
    title,
    statusLabel,
    footer,
}: AdvanceCardProps) {
    useRenderCount('AdvanceCard', { id: item.id_solicitud, estado: item.estado });
    const { accentColor, isDark, cardBg, surfaceMuted, textPrimary, textSecondary, borderColor } = useAccentColor();

    
    const normalize = normalizeEstado || ((estado: Anticipo['estado'] | number | string) => {
        if (estado === 2 || estado === '2' || estado === 'pendiente') return 'pendiente';
        if (estado === 1 || estado === '1' || estado === 'confirmada' || estado === 'aprobado' || estado === 'aprobada') return 'confirmada';
        if (estado === 0 || estado === '0' || estado === 'pagada' || estado === 'pagado' || estado === 'entregada' || estado === 'entregado') return 'pagada';
        if (estado === 3 || estado === '3' || estado === 'rechazada' || estado === 'rechazado') return 'rechazada';
        if (estado === 4 || estado === '4' || estado === 'liquidada' || estado === 'liquidado') return 'liquidada';
        return String(estado ?? '');
    });

    const estado = normalize(item.estado);
    const isPendiente = estado === 'pendiente';
    const isAprobada = estado === 'confirmada';
    const isPagada = estado === 'pagada';
    const isLiquidada = estado === 'liquidada';
    const isRechazada = estado === 'rechazada';

    const getStatusColors = () => {
        if (isPendiente) {
            return {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
                color: isDark ? '#FBBF24' : '#B45309',
                label: 'Pendiente'
            };
        }
        if (isPagada) {
            return {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#D1FAE5',
                color: isDark ? '#6EE7B7' : '#065F46',
                label: 'Recibido'
            };
        }
        if (isLiquidada) {
            return {
                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.16)' : '#EDE9FE',
                color: isDark ? '#C4B5FD' : '#6D28D9',
                label: 'Liquidado'
            };
        }
        if (isAprobada) {
            return {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : '#DBEAFE',
                color: isDark ? '#93C5FD' : '#1D4ED8',
                label: viewMode === 'solicitudes' ? 'Aprobado' : 'Recibido'
            };
        }
        if (isRechazada) {
            return {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
                color: isDark ? '#F87171' : '#B91C1C',
                label: 'Rechazada'
            };
        }
        return {
            backgroundColor: isDark ? 'rgba(107, 114, 128, 0.16)' : '#F3F4F6',
            color: isDark ? '#9CA3AF' : '#4B5563',
            label: 'Sin estado'
        };
    };

    const statusColors = getStatusColors();

    // Glow neón en modo oscuro con el color del estado
    const cardNeonColor = isPendiente ? '#F59E0B' : isPagada ? '#10B981' : isRechazada ? '#EF4444' : isLiquidada ? '#8B5CF6' : accentColor;
    const cardNeonGlow = isDark ? {
        shadowColor: cardNeonColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        borderColor: cardNeonColor,
        borderWidth: 1.5,
    } : {};

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Sin fecha';
        try {
            const date = parseDateSafe(dateStr);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            const day = date.getUTCDate();
            const month = date.toLocaleDateString('es-ES', { month: 'short' });
            const year = date.getUTCFullYear();
            return `${day} ${month} ${year}`;
        } catch { return 'Error'; }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = parseDateSafe(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const content = (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }, cardNeonGlow]}>
            <View style={styles.cardHeader}>
                {showIndexBadge ? (
                    <View style={[styles.indexBadge, { backgroundColor: surfaceMuted }]}>
                        <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                    </View>
                ) : (
                    <Text style={[styles.cardTitle, { color: textPrimary }]}>{title || 'Anticipo'}</Text>
                )}

                <View style={[styles.statusBadge, { backgroundColor: statusColors.backgroundColor }]}>
                    <Text style={[styles.statusText, { color: statusColors.color }]}>
                        {statusLabel || statusColors.label}
                    </Text>
                </View>
            </View>

            <View style={[styles.cardBody, compactDate && styles.cardBodyCompact]}>
                {compactDate ? (
                    <View style={styles.dateRowCompact}>
                        <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                        <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                        {item.fecha_crea && (
                            <Text style={[styles.timeTextCompact, { color: textSecondary }]}>  |  {formatTime(item.fecha_crea)}</Text>
                        )}
                    </View>
                ) : (
                    <View style={styles.dateRow}>
                        <View style={styles.infoInline}>
                            <Ionicons name="calendar-outline" size={15} color={textSecondary} />
                            <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                        </View>
                        {item.fecha_crea && (
                            <View style={styles.infoInline}>
                                <Ionicons name="time-outline" size={15} color={textSecondary} />
                                <Text style={[styles.dateText, { color: textPrimary }]}>{formatTime(item.fecha_crea)}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={[styles.amountsRow, compactDate && styles.amountsRowCompact]}>
                    <View style={[styles.amountItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }]}>
                        <Text style={[styles.amountLabel, { color: textSecondary }]}>Monto</Text>
                        <Text style={[styles.amountValue, { color: isAprobada ? accentColor : isPendiente ? '#F59E0B' : isRechazada ? '#EF4444' : '#10B981' }]}>
                            ${(item.monto || 0).toLocaleString()}
                        </Text>
                    </View>
                </View>

                {item.motivo ? (
                    <View style={styles.motivoRow}>
                        <Ionicons name="document-text-outline" size={14} color={textSecondary} style={{ marginRight: 4 }} />
                        <Text style={[styles.motivoText, { color: textSecondary }]}>{item.motivo}</Text>
                    </View>
                ) : null}

                {item.motivo_rechazo && isRechazada && (
                    <View style={[styles.rejectionBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
                        <Ionicons name="close-circle" size={14} color={isDark ? '#F87171' : '#B91C1C'} />
                        <Text style={[styles.rejectionText, { color: isDark ? '#F87171' : '#991B1B' }]}>
                            Motivo rechazo: {item.motivo_rechazo}
                        </Text>
                    </View>
                )}

                {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
            </View>
        </View>
    );

    if (onPress) {
        return (
            <AnimatedView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', delay: Math.min(index, 4) * 30 }}
            >
                <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Ver detalle de anticipo ${item.monto}`}>
                    {content}
                </Pressable>
            </AnimatedView>
        );
    }

    return (
        <AnimatedView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: Math.min(index, 4) * 30 }}
        >
            {content}
        </AnimatedView>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.card,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        gap: 12,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: -0.2,
        flex: 1,
    },
    indexBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexText: {
        fontSize: FontSize.xxs,
        fontWeight: '800',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9999,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
    },
    cardBody: {},
    cardBodyCompact: {},
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 14,
        flexWrap: 'wrap',
    },
    dateRowCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
    },
    infoInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 13,
        fontWeight: '700',
    },
    timeTextCompact: {
        fontSize: 13,
    },
    amountsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    amountsRowCompact: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    amountItem: {
        flex: 1,
        alignItems: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 14,
    },
    amountLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    amountValue: {
        fontSize: 18,
        fontWeight: '900',
    },
    motivoRow: {
        marginTop: 10,
    },
    motivoText: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    rejectionBox: {
        marginTop: 10,
        padding: 10,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rejectionText: {
        fontSize: 12,
        flex: 1,
    },
    footerSlot: {
        marginTop: 12,
    },
});
