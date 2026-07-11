import { Ionicons } from '@expo/vector-icons';
import { AnimatedView } from '@/components/ui/AnimatedView';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from '../../hooks/useAccentColor';
import { parseDateSafe } from '../../utils/timeUtils';

export interface HoraExtra {
    id_hora_extra: number;
    fecha_crea: string;
    fecha_mod: string | null;
    hora: string;
    monto: number;
    total: number;
    estado: number; 
    fecha_formatted?: string;
}

interface OvertimeCardProps {
    item: HoraExtra;
    index?: number;
    showIndexBadge?: boolean;
    usePagadoLabel?: boolean;
    compactDate?: boolean;
    showPaymentDate?: boolean;
}

export function OvertimeCard({
    item,
    index = 0,
    showIndexBadge = false,
    usePagadoLabel = true,
    compactDate = false,
    showPaymentDate = true,
}: OvertimeCardProps) {
    const { accentColor, isDark, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();

    const isPendiente = item.estado === 1;
    const hourLabel = item.hora ? `${item.hora} hrs` : null;

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

    return (
        <AnimatedView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: index * 100 }}
        >
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                {}
                <View style={styles.cardHeader}>
                    {showIndexBadge ? (
                        <View style={[styles.indexBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <Text style={[styles.indexText, { color: textPrimary }]}>{index + 1}</Text>
                        </View>
                    ) : (
                        <Text style={[styles.cardTitle, { color: textPrimary }]}>Hora Extra</Text>
                    )}
                    
                    <View style={[
                        styles.statusBadge,
                        {
                            backgroundColor: isPendiente
                                ? (isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEE2E2')
                                : (isDark ? 'rgba(255,255,255,0.10)' : '#E5E7EB')
                        }
                    ]}>
                        <Text style={[
                            styles.statusText,
                            { color: isPendiente ? '#EF4444' : textPrimary }
                        ]}>
                            {isPendiente ? 'Por cobrar' : (usePagadoLabel ? 'Pagado' : 'Cobrado')}
                        </Text>
                    </View>
                </View>

                {}
                <View style={[styles.cardBody, compactDate && styles.cardBodyCompact]}>
                    {compactDate ? (
                        <View style={styles.dateRowCompact}>
                            <Ionicons name="calendar-outline" size={14} color={textSecondary} />
                            <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                            {hourLabel ? (
                                <Text style={[styles.timeTextCompact, { color: textSecondary }]}>  |  {item.hora}</Text>
                            ) : null}
                        </View>
                    ) : (
                        <View style={styles.dateRow}>
                            <View style={styles.infoInline}>
                                <Ionicons name="calendar-outline" size={15} color={textSecondary} />
                                <Text style={[styles.dateText, { color: textPrimary }]}>{formatDate(item.fecha_crea)}</Text>
                            </View>
                            {hourLabel ? (
                                <View style={styles.infoInline}>
                                    <Ionicons name="time-outline" size={15} color={textSecondary} />
                                    <Text style={[styles.dateText, { color: textPrimary }]}>{hourLabel}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}

                    {}
                    <View style={[styles.amountsRow, compactDate && styles.amountsRowCompact]}>
                        <View style={[styles.amountItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }]}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Monto/hr</Text>
                            <Text style={[styles.amountValue, { color: textPrimary }]}>${(item.monto || 0).toLocaleString()}</Text>
                        </View>
                        <View style={[styles.amountItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                            <Text style={[styles.amountLabel, { color: textSecondary }]}>Total</Text>
                            <Text style={[styles.amountValue, { color: isPendiente ? '#EF4444' : textPrimary }]}>${(item.total || 0).toLocaleString()}</Text>
                        </View>
                    </View>

                    {}
                    {showPaymentDate && item.fecha_mod && item.estado === 0 && (
                        <View style={styles.paymentRow}>
                            <Ionicons name="checkmark-circle" size={14} color={accentColor} />
                            <Text style={[styles.paymentText, { color: textSecondary }]}>
                                {usePagadoLabel ? 'Pagado' : 'Cobrado'}: {formatDate(item.fecha_mod)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </AnimatedView>
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
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    paymentText: {
        fontSize: 12,
    },
});
