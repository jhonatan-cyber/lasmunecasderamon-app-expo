import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '../../hooks/useAccentColor';
import { parseDateSafe } from '../../utils/timeUtils';

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
}

export function AdvanceCard({
    item,
    index = 0,
    showIndexBadge = true,
    compactDate = false,
    viewMode = 'solicitudes',
    normalizeEstado,
}: AdvanceCardProps) {
    const { accentColor, isDark } = useAccentColor();

    const cardBg = isDark ? '#111111' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? `${accentColor}40` : 'rgba(0,0,0,0.05)';

    // Default normalizeEstado if not provided
    const normalize = normalizeEstado || ((estado: Anticipo['estado'] | number | string) => {
        if (estado === 2 || estado === '2' || estado === 'pendiente') return 'pendiente';
        if (estado === 1 || estado === '1' || estado === 'confirmada' || estado === 'aprobado' || estado === 'aprobada') return 'confirmada';
        if (estado === 0 || estado === '0' || estado === 'rechazada' || estado === 'rechazado') return 'rechazada';
        return String(estado ?? '');
    });

    const estado = normalize(item.estado);
    const isPendiente = estado === 'pendiente';
    const isAprobada = estado === 'confirmada';
    const isRechazada = estado === 'rechazada';

    // Status colors
    const getStatusColors = () => {
        if (isPendiente) {
            return {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
                color: isDark ? '#FBBF24' : '#B45309',
                label: 'Pendiente'
            };
        }
        if (isAprobada) {
            return {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#D1FAE5',
                color: isDark ? '#6EE7B7' : '#065F46',
                label: viewMode === 'solicitudes' ? 'Aprobada' : 'Cobrado'
            };
        }
        // Rechazada
        return {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2',
            color: isDark ? '#F87171' : '#B91C1C',
            label: 'Rechazada'
        };
    };

    const statusColors = getStatusColors();

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

    return (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: index * 100 }}
        >
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    {showIndexBadge ? (
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                        </View>
                    ) : (
                        <Text style={[styles.cardTitle, { color: textPrimary }]}>Anticipo</Text>
                    )}
                    
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.backgroundColor }]}>
                        <Text style={[styles.statusText, { color: statusColors.color }]}>
                            {statusColors.label}
                        </Text>
                    </View>
                </View>

                {/* Body */}
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

                    {/* Amount */}
                    <View style={[styles.amountsRow, compactDate && styles.amountsRowCompact]}>
                        <View style={[styles.amountItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }]}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Monto</Text>
                            <Text style={[styles.amountValue, { color: isAprobada ? accentColor : isPendiente ? '#F59E0B' : '#EF4444' }]}>
                                ${(item.monto || 0).toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* Motivo */}
                    {item.motivo ? (
                        <View style={styles.motivoRow}>
                            <Text style={[styles.motivoText, { color: textSecondary }]}>📝 {item.motivo}</Text>
                        </View>
                    ) : null}

                    {/* Motivo Rechazo */}
                    {item.motivo_rechazo && isRechazada && (
                        <View style={[styles.rejectionBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
                            <Ionicons name="close-circle" size={14} color={isDark ? '#F87171' : '#B91C1C'} />
                            <Text style={[styles.rejectionText, { color: isDark ? '#F87171' : '#991B1B' }]}>
                                Motivo rechazo: {item.motivo_rechazo}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        padding: 16,
        marginTop: 12,
        borderWidth: 1,
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
        fontSize: 10,
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
});
