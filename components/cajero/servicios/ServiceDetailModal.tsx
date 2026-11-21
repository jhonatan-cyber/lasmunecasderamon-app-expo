import React, { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
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
import { ServiceCardTimer } from './ServiceCardTimer';

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
    const esActivo = Number(service?.estado) === 2 || Number(service?.estado) === 3;

    const tiempo = useMemo(
        () =>
            service?.startTime
                ? tiempoServicio(
                    {
                        startTime: service.startTime,
                        duration: Number(service.duration) || 0,
                        isPaused: Boolean(service.isPaused),
                        remainingTime: Number(service.remainingTime) || 0,
                    },
                    serverOffset,
                )
                : null,
        [service, serverOffset],
    );

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

    const acentoReloj =
        visual === 'excedido' || visual === 'anulado'
            ? theme.danger
            : visual === 'critico'
                ? theme.warning
                : visual === 'pausado'
                    ? theme.textMuted
                    : theme.accent;

    // Glow neón en modo oscuro con el accentColor
    const modalNeonGlow = theme.isDark ? {
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
        borderColor: theme.accent,
        borderWidth: 1.5,
    } : {};

    // Glow neón en botón de finalizar en modo oscuro
    const finalizarNeonGlow = theme.isDark ? {
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    } : {};

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.detailModal, { backgroundColor: theme.card, borderColor: theme.border }, modalNeonGlow]}>
                    <View style={styles.modalHeader}>
                        <View style={styles.headerInfo}>
                            <Text style={[styles.modalTitleText, { color: theme.text }]}>Detalle del Servicio</Text>
                            <View style={styles.headerMeta}>
                                <Text style={[styles.modalSubText, { color: theme.textMuted }]}>
                                    #{service?.servicioCode || "S/N"}
                                </Text>
                                <View style={[styles.estadoChip, { backgroundColor: badge.background, borderRadius: BorderRadius.sm }]}>
                                    <View style={[styles.estadoDot, { backgroundColor: badge.foreground }]} />
                                    <Text style={[styles.estadoChipText, { color: badge.foreground }]}>
                                        {estadoTexto}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <Pressable
                            style={[styles.closeBtn, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(156,163,175,0.12)' }]}
                            onPress={() => {
                              haptic.tap();
                              onClose();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Cerrar detalle del servicio"
                            accessibilityHint="Cierra el modal de detalle"
                            hitSlop={HitSlop.sm}
                        >
                            <Ionicons name="close" size={24} color={theme.text} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {esActivo && tiempo && (
                            <ServiceCardTimer
                                visible
                                etiqueta={
                                    visual === 'pausado'
                                        ? 'PAUSADO'
                                        : tiempo.estaExcedido
                                            ? 'TIEMPO EXCEDIDO'
                                            : 'TIEMPO RESTANTE'
                                }
                                valor={
                                    visual === 'pausado' || !tiempo.estaExcedido
                                        ? formatTime(tiempo.restante)
                                        : `+${formatTime(tiempo.excedidoSegundos)}`
                                }
                                totalMinutos={safeNumber(service?.duration)}
                                progreso={tiempo.progreso}
                                icono={
                                    visual === 'pausado'
                                        ? 'pause'
                                        : tiempo.estaExcedido
                                            ? 'alert-circle'
                                            : 'time'
                                }
                                acento={acentoReloj}
                                fondo={
                                    visual === 'excedido'
                                        ? `${theme.danger}14`
                                        : visual === 'critico'
                                            ? `${theme.warning}14`
                                            : visual === 'pausado'
                                                ? theme.isDark
                                                    ? 'rgba(156,163,175,0.14)'
                                                    : 'rgba(156,163,175,0.12)'
                                                : theme.bg
                                }
                                barraFondo={theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'}
                                textMutedColor={theme.textMuted}
                                accessibilityLabel={`${visual === 'pausado' ? 'Servicio pausado' : tiempo.estaExcedido ? 'Servicio excedido' : 'Tiempo restante'} de ${safeNumber(service?.duration)} minutos`}
                            />
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
                                        const badgeColors = ['#F59E0B', '#A855F7', '#3B82F6', '#EC4899', '#06B6D4', '#10B981'];
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

                        <ServiceSummarySection service={service} theme={theme} neonGlow={modalNeonGlow} />

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

                        {onFinalizar ? (
                            <>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.modalCloseBtn,
                                        { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                                        finalizarNeonGlow,
                                    ]}
                                    onPress={() => {
                                      haptic.confirm();
                                      onFinalizar();
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Finalizar servicio"
                                    accessibilityHint="Cierra y finaliza el servicio activo"
                                    hitSlop={HitSlop.sm}
                                >
                                    <Ionicons name="stop-circle-outline" size={20} color={theme.accentText || '#FFF'} />
                                    <Text style={[styles.modalCloseBtnText, { color: theme.accentText || '#FFF' }]}>
                                        Finalizar servicio
                                    </Text>
                                </Pressable>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.secondaryBtn,
                                        { borderColor: theme.border, opacity: pressed ? 0.85 : 1, borderRadius: BorderRadius.card },
                                    ]}
                                    onPress={() => {
                                      haptic.tap();
                                      onClose();
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Cerrar detalle"
                                    accessibilityHint="Cierra el modal sin finalizar"
                                    hitSlop={HitSlop.sm}
                                >
                                    <Text style={[styles.secondaryBtnText, { color: theme.textMuted }]}>Cerrar</Text>
                                </Pressable>
                            </>
                        ) : (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.modalCloseBtn,
                                    { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                                    finalizarNeonGlow,
                                ]}
                                onPress={() => {
                                  haptic.tap();
                                  onClose();
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Cerrar detalle"
                                accessibilityHint="Cierra el modal de detalle"
                                hitSlop={HitSlop.sm}
                            >
                                <Text style={[styles.modalCloseBtnText, { color: theme.accentText || '#FFF' }]}>
                                    Cerrar
                                </Text>
                            </Pressable>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
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

function ServiceSummarySection({ service, theme, neonGlow }: { service: any; theme: any; neonGlow?: any }) {
    const totalUsuarios = safeNumber(service?.total_usuarios);

    return (
        <View style={[styles.summarySection, { backgroundColor: theme.bg, borderColor: theme.border }, neonGlow]}>
            <SummaryRow label="Precio Servicio" value={`${(safeNumber(service?.precio_servicio) * totalUsuarios).toLocaleString()}`} theme={theme} />
            <SummaryRow label="Precio Habitación" value={`${safeNumber(service?.precio_habitacion).toLocaleString()}`} theme={theme} />
            {service?.iva > 0 && <SummaryRow label="IVA (Tarjeta)" value={`${safeNumber(service?.iva).toLocaleString()}`} theme={theme} />}

            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.totalLabelFinal, { color: theme.text }]}>TOTAL FINAL</Text>
                <Text style={[styles.totalValFinal, { color: theme.accent }]}>
                    ${safeNumber(service?.total).toLocaleString()}
                </Text>
            </View>

            {service?.habitacion_comision > 0 ? (
                <CommissionSectionWithRoom service={service} theme={theme} totalUsuarios={totalUsuarios} />
            ) : (
                <CommissionSection service={service} theme={theme} totalUsuarios={totalUsuarios} />
            )}
        </View>
    );
}

function SummaryRow({ label, value, theme }: { label: string; value: string; theme: any }) {
    return (
        <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{label}</Text>
            <Text style={[styles.summaryVal, { color: theme.text }]}>${value}</Text>
        </View>
    );
}

function CommissionSectionWithRoom({ service, theme, totalUsuarios }: { service: any; theme: any; totalUsuarios: number }) {
    return (
        <>
            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.summaryLabel, { color: theme.success, fontWeight: 'bold' }]}>Comisión Habitación</Text>
                <Text style={[styles.summaryVal, { color: theme.success, fontWeight: 'bold' }]}>
                    ${safeNumber(service?.total_comision).toLocaleString()}
                </Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: FontSize.xs }]}>
                    Comisión p/Anfitriona ({totalUsuarios})
                </Text>
                <Text style={[styles.summaryVal, { color: theme.text, fontSize: FontSize.sm }]}>
                    ${safeNumber(service?.comision_individual).toLocaleString()} c/u
                </Text>
            </View>
            <InfoBanner text={`* La comisión de habitación se divide entre las ${totalUsuarios} anfitrionas.`} theme={theme} />
        </>
    );
}

function CommissionSection({ service, theme, totalUsuarios }: { service: any; theme: any; totalUsuarios: number }) {
    return (
        <>
            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.summaryLabel, { color: theme.success, fontWeight: 'bold' }]}>Total Comisión</Text>
                <Text style={[styles.summaryVal, { color: theme.success, fontWeight: 'bold' }]}>
                    ${safeNumber(service?.total_comision ?? (safeNumber(service?.comision_individual) * totalUsuarios)).toLocaleString()}
                </Text>
            </View>
            <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: FontSize.xs }]}>
                    Comisión p/Anfitriona ({totalUsuarios})
                </Text>
                <Text style={[styles.summaryVal, { color: theme.text, fontSize: FontSize.sm }]}>
                    ${safeNumber(service?.comision_individual).toLocaleString()} c/u
                </Text>
            </View>
            <InfoBanner text="* La comisión total se divide entre las anfitrionas que participaron en el servicio." theme={theme} />
        </>
    );
}

function InfoBanner({ text, theme }: { text: string; theme: any }) {
    return (
        <View style={[styles.infoBannerBox, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '30', borderRadius: BorderRadius.card }]}>
            <Text style={[styles.infoBannerText, { color: theme.accent }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    detailModal: { width: '100%', maxWidth: 720, alignSelf: 'center', borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: 24, maxHeight: '90%', borderTopWidth: 1, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
    headerInfo: { flex: 1 },
    headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
    estadoChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3 },
    estadoDot: { width: 6, height: 6, borderRadius: 3 },
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
    summarySection: { padding: 24, borderRadius: BorderRadius.xxl, borderWidth: 1, marginBottom: 24, overflow: 'hidden' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    summaryLabel: { fontSize: FontSize.md, fontWeight: '600' },
    summaryVal: { fontSize: FontSize.sm, fontWeight: '700' },
    totalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    totalLabelFinal: { fontSize: FontSize.sm, fontWeight: '900' },
    totalValFinal: { fontSize: FontSize.xl, fontWeight: '900' },
    infoBannerBox: { marginTop: 16, padding: 12, borderWidth: 1 },
    infoBannerText: { fontSize: FontSize.xs, fontWeight: '700', textAlign: 'center' },
    actionsList: { borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    actionLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600' },
    modalCloseBtn: { minHeight: 56, borderRadius: BorderRadius.card, justifyContent: 'center', alignItems: 'center', marginBottom: 12, flexDirection: 'row', gap: 8, paddingHorizontal: 16, overflow: 'hidden' },
    modalCloseBtnText: { fontSize: FontSize.lg, fontWeight: '900' },
    secondaryBtn: { minHeight: MIN_TOUCH_TARGET, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
    secondaryBtnText: { fontSize: FontSize.md, fontWeight: '700' },
});
