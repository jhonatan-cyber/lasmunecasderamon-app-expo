import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from '@/api/client';
import { parseDateSafe } from '@/utils/timeUtils';
import { safeNumber } from '@/hooks/useServiciosScreen';

interface DetailModalProps {
    visible: boolean;
    service: any;
    theme: {
        accent: string;
        text: string;
        textMuted: string;
        card: string;
        border: string;
        bg: string;
        success: string;
    };
    onClose: () => void;
}

export function ServiceDetailModal({ visible, service, theme, onClose }: DetailModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.detailModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={[styles.modalTitleText, { color: theme.text }]}>Detalle del Servicio</Text>
                            <Text style={[styles.modalSubText, { color: theme.textMuted }]}>
                                #{service?.servicioCode || "S/N"}
                            </Text>
                        </View>
                        <Pressable style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.detailsGrid}>
                            <View style={[styles.gridItem, styles.wideGridItem]}>
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

                            <View style={[styles.gridItem, { width: '100%' }]}>
                                <Text style={[styles.gridLabel, { color: theme.textMuted }]}>ANFITRIONAS</Text>
                                <View style={styles.badgeContainer}>
                                    {service?.anfitrionas?.split(', ').map((name: string, idx: number) => {
                                        const badgeColors = ['#F59E0B', '#A855F7', '#3B82F6', '#EC4899', '#06B6D4', '#10B981'];
                                        const color = badgeColors[idx % badgeColors.length];
                                        const foto = service?.anfitrionas_fotos?.[idx];
                                        return (
                                            <View key={`${name}-${idx}`} style={[styles.hostessBadge, { backgroundColor: color + '15', borderColor: color + '40' }]}>
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

                            <View style={styles.gridItem}>
                                <Text style={[styles.gridLabel, { color: theme.textMuted }]}>METODO PAGO</Text>
                                <Text style={[styles.gridValue, { color: theme.text }]}>
                                    {service?.metodo_pago?.toUpperCase()}
                                </Text>
                            </View>

                            <View style={styles.gridItem}>
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

                        <ServiceSummarySection service={service} theme={theme} />

                        <Pressable style={[styles.modalCloseBtn, { backgroundColor: theme.accent }]} onPress={onClose}>
                            <Text style={styles.modalCloseBtnText}>Cerrar</Text>
                        </Pressable>
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
        <View style={styles.gridItem}>
            <Text style={[styles.gridLabel, { color: theme.textMuted }]}>{label}</Text>
            <View style={styles.userRow}>
                {foto ? (
                    <Image source={{ uri: foto.startsWith('http') ? foto : `${BASE_URL}/img/users/${foto}` }} style={styles.avatarSquare} />
                ) : (
                    <View style={[styles.avatarSquare, styles.avatarPlaceholder]}>
                        <Ionicons name={icon as any} size={16} color={theme.textMuted} />
                    </View>
                )}
                <Text style={[styles.gridValue, { color: theme.text, flex: 1 }]}>{name}</Text>
            </View>
        </View>
    );
}

function ServiceSummarySection({ service, theme }: { service: any; theme: any }) {
    const totalUsuarios = safeNumber(service?.total_usuarios);

    return (
        <View style={[styles.summarySection, { backgroundColor: theme.bg, borderColor: theme.border }]}>
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
                <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: 13 }]}>
                    Comisión p/Anfitriona ({totalUsuarios})
                </Text>
                <Text style={[styles.summaryVal, { color: theme.text, fontSize: 14 }]}>
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
                <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: 13 }]}>
                    Comisión p/Anfitriona ({totalUsuarios})
                </Text>
                <Text style={[styles.summaryVal, { color: theme.text, fontSize: 14 }]}>
                    ${safeNumber(service?.comision_individual).toLocaleString()} c/u
                </Text>
            </View>
            <InfoBanner text="* La comisión total se divide entre las anfitrionas que participaron en el servicio." theme={theme} />
        </>
    );
}

function InfoBanner({ text, theme }: { text: string; theme: any }) {
    return (
        <View style={[styles.infoBannerBox, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '30' }]}>
            <Text style={[styles.infoBannerText, { color: theme.accent }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    detailModal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%', borderTopWidth: 1 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitleText: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    modalSubText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(156, 163, 175, 0.1)', justifyContent: 'center', alignItems: 'center' },
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
    gridItem: { width: '47%', padding: 14, borderRadius: 18, backgroundColor: 'rgba(156, 163, 175, 0.05)', justifyContent: 'center' },
    wideGridItem: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
    gridSubItem: { flex: 1, marginRight: 8 },
    gridLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
    gridValue: { fontSize: 15, fontWeight: '700' },
    badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    hostessBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    hostessBadgeText: { fontSize: 13, fontWeight: '800' },
    avatarMini: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(156, 163, 175, 0.2)' },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    avatarSquare: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(156, 163, 175, 0.2)' },
    avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    summarySection: { padding: 24, borderRadius: 28, borderWidth: 1, marginBottom: 24 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    summaryLabel: { fontSize: 15, fontWeight: '600' },
    summaryVal: { fontSize: 16, fontWeight: '700' },
    totalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    totalLabelFinal: { fontSize: 16, fontWeight: '900' },
    totalValFinal: { fontSize: 26, fontWeight: '900' },
    infoBannerBox: { marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1 },
    infoBannerText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
    modalCloseBtn: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalCloseBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
});
