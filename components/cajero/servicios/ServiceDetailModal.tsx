import React from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BASE_URL } from '@/api/client';
import { formatTime, parseDateSafe } from '@/utils/timeUtils';
import { safeNumber } from '@/utils/format';
import { tiempoServicio } from '@/utils/servicioTiempo';
import {
    coloresBadgeEstado,
    estadoServicio,
    estadoVisualServicio,
} from '@/utils/servicioEstado';
import { FontSize, MIN_TOUCH_TARGET, BorderRadius, HitSlop } from '@/constants/spacing';
import { haptic } from '@/utils/haptics';
import { useAccentColor } from '@/hooks/useAccentColor';
import { DetailSheet } from '@/components/ui/DetailSheet';
import { useServerNowTick } from '@/hooks/useServerNowTick';

export interface DetailAction {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
}

interface DetailModalProps {
    visible: boolean;
    service: any;
    theme: {
        accent: string;
        accentText?: string;
        text: string;
        textMuted: string;
        card: string;
        border: string;
        bg: string;
        success: string;
        danger: string;
        warning: string;
        isDark?: boolean;
    };
    onClose: () => void;
    acciones?: DetailAction[];
    onFinalizar?: () => void;
    serverOffset?: number;
}

export function ServiceDetailModal({
    visible,
    service,
    theme,
    onClose,
    acciones = [],
    onFinalizar,
    serverOffset = 0,
}: DetailModalProps) {
    const { accentColor, accentUi, accentOnSurface } = useAccentColor();
    const correReloj =
        visible &&
        Boolean(service?.startTime) &&
        !service?.isPaused &&
        ![0, 1, 3, 4].includes(Number(service?.estado));
    const now = useServerNowTick(correReloj);

    const tiempo = service?.startTime
        ? tiempoServicio(
            {
                startTime: service.startTime,
                duration: Number(service.duration) || 0,
                isPaused: Boolean(service.isPaused),
                remainingTime: Number(service.remainingTime) || 0,
            },
            serverOffset,
            now,
        )
        : null;

    const visual = estadoVisualServicio(service?.estado, {
        excedido: tiempo?.estaExcedido ?? false,
        critico: tiempo?.estaCritico ?? false,
    });
    const badge = coloresBadgeEstado(visual, Boolean(theme.isDark));
    const estadoInfo = estadoServicio(service?.estado);

    let estadoTexto = estadoInfo.label.toUpperCase();
    if (visual === 'excedido') estadoTexto = 'EXCEDIDO';
    else if (visual === 'critico') estadoTexto = 'POR VENCER';
    else if (visual === 'pausado') estadoTexto = 'PAUSADO';

    return (
        <DetailSheet
            visible={visible}
            onClose={onClose}
            title="Detalle del Servicio"
            code={`#${service?.servicioCode || 'S/N'}`}
            status={{ label: estadoTexto, color: badge.foreground }}
            height="90%"
            footerActions={
                onFinalizar
                    ? [
                        {
                          label: 'Finalizar servicio',
                          onPress: onFinalizar,
                          primary: true,
                          icon: 'stop-circle-outline',
                        },
                        { label: 'Cerrar', onPress: onClose },
                      ]
                    : [{ label: 'Cerrar', onPress: onClose }]
            }
            accessibilityLabel="Detalle del servicio"
        >
                        {/* Timer section - no mostrar en servicios finalizados */}
                        {tiempo && visual !== 'finalizado' && (
                            <View style={[styles.timerSection, { backgroundColor: theme.bg, borderRadius: BorderRadius.card, borderColor: theme.border }]}>
                                <View style={styles.timerRow}>
                                    <Ionicons
                                        name={visual === 'pausado' ? 'pause' : visual === 'excedido' ? 'alert-circle' : 'time'}
                                        size={22}
                                        color={visual === 'excedido' ? theme.danger : visual === 'critico' ? theme.warning : visual === 'pausado' ? theme.textMuted : theme.accent}
                                    />
                                    <View style={styles.timerInfo}>
                                        <Text style={[styles.timerLabel, { color: theme.textMuted }]}>
                                            {visual === 'pausado' ? 'PAUSADO' : tiempo.estaExcedido ? 'TIEMPO EXCEDIDO' : 'TIEMPO RESTANTE'}
                                        </Text>
                                        <Text style={[
                                            styles.timerValue,
                                            {
                                                color: visual === 'excedido' ? theme.danger : visual === 'critico' ? theme.warning : visual === 'pausado' ? theme.textMuted : theme.accent,
                                            }
                                        ]}>
                                            {visual === 'pausado' || !tiempo.estaExcedido
                                                ? formatTime(tiempo.restante)
                                                : `+${formatTime(tiempo.excedidoSegundos)}`}
                                        </Text>
                                    </View>
                                    <Text style={[styles.timerTotal, { color: theme.textMuted }]}>
                                        de {safeNumber(service?.duration)} min
                                    </Text>
                                </View>
                                <View style={[styles.progressTrack, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)' }]}>
                                    <View style={[
                                        styles.progressFill,
                                        {
                                            width: `${Math.round(tiempo.progreso * 100)}%`,
                                            backgroundColor: visual === 'excedido' ? theme.danger : visual === 'critico' ? theme.warning : visual === 'pausado' ? theme.textMuted : theme.accent,
                                        }
                                    ]} />
                                </View>
                            </View>
                        )}

                        <View style={styles.detailsGrid}>
                            <View style={[styles.gridItem, styles.wideGridItem, { borderRadius: BorderRadius.card }]}>
                                <View style={styles.gridSubItem}>
                                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>HABITACIÓN</Text>
                                    <Text style={[styles.gridValue, { color: theme.text }]} numberOfLines={1}>
                                        {service?.roomName || 'S/N'}
                                    </Text>
                                </View>
                                <View style={styles.gridSubItem}>
                                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>TIEMPO</Text>
                                    <Text style={[styles.gridValue, { color: theme.text }]}>
                                        {service?.duration} min
                                    </Text>
                                </View>
                                <View style={styles.gridSubItem}>
                                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>CLIENTE</Text>
                                    <Text style={[styles.gridValue, { color: theme.text }]} numberOfLines={1}>
                                        {(service?.clienteNombre && service.clienteNombre !== 'Sin cliente')
                                            ? service.clienteNombre
                                            : (service?.cliente_nombre && service.cliente_nombre !== 'Sin cliente')
                                                ? service.cliente_nombre
                                                : 'Sin cliente registrado'}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.gridItem, { width: '100%', borderRadius: BorderRadius.card }]}>
                                <Text style={[styles.gridLabel, { color: theme.textMuted }]}>ANFITRIONAS</Text>
                                <View style={styles.badgeContainer}>
                                    {service?.anfitrionas?.split(', ').map((name: string, idx: number) => {
                                        const badgeColors = [accentColor, accentUi, accentColor, accentColor, accentOnSurface, accentOnSurface];
                                        const color = badgeColors[idx % badgeColors.length];
                                        const foto = service?.anfitrionas_fotos?.[idx];
                                        return (
                                            <View key={`${name}-${idx}`} style={[styles.hostessBadge, { backgroundColor: color + '15', borderColor: color + '40', borderRadius: BorderRadius.sm }]}>
                                                {foto && (
                                                    <Image source={{ uri: foto.startsWith('http') ? foto : `${BASE_URL}/img/users/${foto}` }} style={styles.avatarMini} />
                                                )}
                                                <Text style={[styles.hostessBadgeText, { color }]}>
                                                    {name.trim().toUpperCase()}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>

                            <UserInfoRow
                                label="PROCESADO POR"
                                name={service?.waiter_name || "Admin"}
                                foto={service?.waiter_foto}
                                icon="person"
                                theme={theme}
                            />

                            {(service?.solicitante_name && service.solicitante_name !== 'Cajero (Manual)') && (
                                <UserInfoRow
                                    label="SOLICITADO POR"
                                    name={service.solicitante_name}
                                    foto={service?.solicitante_foto}
                                    icon="hand-right"
                                    theme={theme}
                                />
                            )}

                            <View style={[styles.gridItem, { borderRadius: BorderRadius.card }]}>
                                <Text style={[styles.gridLabel, { color: theme.textMuted }]}>METODO PAGO</Text>
                                <Text style={[styles.gridValue, { color: theme.text }]}>
                                    {service?.metodo_pago?.toUpperCase() || '—'}
                                </Text>
                            </View>

                            <View style={[styles.gridItem, { borderRadius: BorderRadius.card }]}>
                                <Text style={[styles.gridLabel, { color: theme.textMuted }]}>FECHA / HORA</Text>
                                <Text style={[styles.gridValue, { color: theme.text }]}>
                                    {service?.created_at
                                        ? parseDateSafe(service.created_at).toLocaleString("es-ES", {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit', hour12: true
                                        }).replace(/,/g, '')
                                        : "-"
                                    }
                                </Text>
                            </View>
                        </View>

                        {/* Financial summary section */}
                        <View style={[styles.summarySection, { backgroundColor: theme.bg, borderColor: theme.border, borderRadius: BorderRadius.card }]}>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                                    Precio Servicio
                                </Text>
                                <Text style={[styles.summaryVal, { color: theme.text }]}>
                                    ${safeNumber(service?.precio_servicio).toLocaleString()}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                                    Precio Habitación
                                </Text>
                                <Text style={[styles.summaryVal, { color: theme.text }]}>
                                    ${safeNumber(service?.precio_habitacion).toLocaleString()}
                                </Text>
                            </View>
                            {service?.iva > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                                        IVA (Tarjeta)
                                    </Text>
                                    <Text style={[styles.summaryVal, { color: theme.text }]}>
                                        ${safeNumber(service?.iva).toLocaleString()}
                                    </Text>
                                </View>
                            )}
                            <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
                                <Text style={[styles.totalLabel, { color: theme.text }]}>TOTAL FINAL</Text>
                                <Text style={[styles.totalValue, { color: theme.accent }]}>
                                    ${safeNumber(service?.total).toLocaleString()}
                                </Text>
                            </View>
                            {service?.comision_individual > 0 && (
                                <>
                                    <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 12, borderTopColor: theme.border }]}>
                                        <Text style={[styles.summaryLabel, { color: theme.success, fontWeight: 'bold' }]}>
                                            {service?.habitacion_comision > 0 ? 'Comisión Habitación' : 'Total Comisión'}
                                        </Text>
                                        <Text style={[styles.summaryVal, { color: theme.success, fontWeight: 'bold' }]}>
                                            ${safeNumber(service?.total_comision ?? (safeNumber(service?.comision_individual) * safeNumber(service?.total_usuarios))).toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: FontSize.xs }]}>
                                            Comisión p/Anfitriona ({safeNumber(service?.total_usuarios)})
                                        </Text>
                                        <Text style={[styles.summaryVal, { color: theme.text, fontSize: FontSize.sm }]}>
                                            ${safeNumber(service?.comision_individual).toLocaleString()} c/u
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {acciones.length > 0 && (
                            <View style={[styles.actionsList, { borderColor: theme.border, borderRadius: BorderRadius.card }]}>
                                {acciones.map((accion) => (
                                    <Pressable
                                        key={accion.key}
                                        onPress={() => {
                                          haptic.tap();
                                          accion.onPress();
                                        }}
                                        style={({ pressed }) => [
                                            styles.actionRow,
                                            {
                                                borderColor: theme.border,
                                                backgroundColor: pressed ? `${theme.textMuted}14` : 'transparent',
                                            },
                                        ]}
                                        accessibilityRole="button"
                                        accessibilityLabel={accion.label}
                                        accessibilityHint={`Ejecuta la acción: ${accion.label}`}
                                        hitSlop={HitSlop.sm}
                                    >
                                        <Ionicons name={accion.icon} size={20} color={theme.text} />
                                        <Text style={[styles.actionLabel, { color: theme.text }]}>{accion.label}</Text>
                                        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                                    </Pressable>
                                ))}
                            </View>
                        )}
        </DetailSheet>
    );
}

function UserInfoRow({ label, name, foto, icon, theme }: {
    label: string;
    name: string;
    foto?: string;
    icon: string;
    theme: any;
}) {
    return (
        <View style={[styles.gridItem, { borderRadius: BorderRadius.card }]}>
            <Text style={[styles.gridLabel, { color: theme.textMuted }]}>{label}</Text>
            <View style={styles.userRow}>
                {foto ? (
                    <Image source={{ uri: foto.startsWith('http') ? foto : `${BASE_URL}/img/users/${foto}` }} style={[styles.avatarSquare, { borderRadius: BorderRadius.sm }]} />
                ) : (
                    <View style={[styles.avatarSquare, styles.avatarPlaceholder, { borderRadius: BorderRadius.sm }]}>
                        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={theme.textMuted} />
                    </View>
                )}
                <Text style={[styles.gridValue, { color: theme.text, flex: 1 }]}>{name}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    detailModal: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', borderRadius: BorderRadius.card, padding: 24, maxHeight: '90%', borderWidth: 1, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
    headerInfo: { flex: 1 },
    headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
    estadoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3 },
    estadoDot: { width: 6, height: 6, borderRadius: BorderRadius.full },
    estadoChipText: { fontSize: FontSize.xxs, fontWeight: '900', letterSpacing: 0.4 },
    modalTitleText: { fontSize: FontSize.xl, fontWeight: '900', letterSpacing: -0.5 },
    modalSubText: { fontSize: FontSize.xs, fontWeight: '600' },
    closeBtn: { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, borderRadius: MIN_TOUCH_TARGET / 2, justifyContent: 'center', alignItems: 'center' },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
    gridItem: { width: '47%', padding: 14, backgroundColor: 'rgba(156, 163, 175, 0.05)', justifyContent: 'center', overflow: 'hidden' },
    wideGridItem: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
    gridSubItem: { flex: 1, marginRight: 8 },
    gridLabel: { fontSize: FontSize.xxs, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
    gridValue: { fontSize: FontSize.md, fontWeight: '700' },
    badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    hostessBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
    hostessBadgeText: { fontSize: FontSize.xs, fontWeight: '800' },
    avatarMini: { width: 24, height: 24, borderRadius: BorderRadius.sm, backgroundColor: 'rgba(156, 163, 175, 0.2)' },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    avatarSquare: { width: 32, height: 32, backgroundColor: 'rgba(156, 163, 175, 0.2)' },
    avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    actionsList: { borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    actionLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600' },
    modalCloseBtn: { minHeight: 56, borderRadius: BorderRadius.full, justifyContent: 'center', alignItems: 'center', marginBottom: 12, flexDirection: 'row', gap: 8, paddingHorizontal: 16, overflow: 'hidden' },
    modalCloseBtnText: { fontSize: FontSize.lg, fontWeight: '900' },
    secondaryBtn: { minHeight: MIN_TOUCH_TARGET, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
    secondaryBtnText: { fontSize: FontSize.md, fontWeight: '700' },
    scrollContent: { paddingBottom: 20 },
    footer: { paddingBottom: 24, gap: 12 },
    timerSection: { padding: 14, marginBottom: 14, borderWidth: 1, gap: 10 },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    timerInfo: { flex: 1 },
    timerLabel: { fontSize: FontSize.xxs, fontWeight: '800', letterSpacing: 0.6 },
    timerValue: { fontSize: FontSize.xl, fontWeight: '900', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
    timerTotal: { fontSize: FontSize.xs, fontWeight: '700' },
    progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3 },
    summarySection: { padding: 16, marginBottom: 14, borderWidth: 1 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    summaryLabel: { fontSize: FontSize.md, fontWeight: '600' },
    summaryVal: { fontSize: FontSize.sm, fontWeight: '700' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    totalLabel: { fontSize: FontSize.sm, fontWeight: '900' },
    totalValue: { fontSize: FontSize.xl, fontWeight: '900' },
});
