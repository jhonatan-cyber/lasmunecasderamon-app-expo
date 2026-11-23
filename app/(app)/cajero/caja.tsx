import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { contentColumn } from '@/constants/layout';
import { FontFamily } from '@/constants/fonts';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { OfflineStatusBanner } from '@/components/offline/OfflineStatusBanner';
import { OfflineBlockedNotice } from '@/components/offline/OfflineBlockedNotice';
import { OFFLINE_BLOCKED_ACTIONS } from '@/utils/offlineGuard';
import { useCaja } from '@/hooks/useCaja';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { CajaSkeleton, MetricCard, StatRow, CajaModales } from '@/components/cajero/caja';
import { useAccentColor } from '@/hooks/useAccentColor';

export default function CajaScreen() {
    const { accentOnSurface, accentText } = useAccentColor();
    const esAdmin = useIsAdmin();
    const {
        accentColor,
        isDark,
        bg,
        cardBg,
        surfaceMuted,
        textPrimary,
        textSecondary,
        router,
        loading,
        refreshing,
        cajaAbierta,
        cajaInfo,
        stats,
        modalVisible,
        modalType,
        monto,
        motivoRetiro,
        submitting,
        reenviandoAviso,
        reabriendoCierre,
        borderColor,
        fromCache,
        isOffline,
        dispatch,
        onRefresh,
        handleMontoChange,
        handleSubmit,
        handleReenviarAviso,
        handleReabrirCierre,
        modalConfig
    } = useCaja();

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <PremiumHeader
                title={esAdmin ? 'Estado de caja' : 'Caja'}
                subtitle={fromCache
                    ? 'Datos guardados en el dispositivo'
                    : cajaAbierta && cajaInfo?.fecha_apertura
                        ? `Abierta: ${new Date(cajaInfo.fecha_apertura).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}`
                        : 'Turno no iniciado'}
                connectionStatus={fromCache ? { isConnected: false, label: 'Modo Offline' } : undefined}
                onBack={() => router.replace('/(app)/cajero/(tabs)' as any)}
            />

            <OfflineStatusBanner pendientesHref={'/(app)/cajero/pendientes' as never} />

            {loading ? (
                <ScrollView style={{ flex: 1 }}>
                    <CajaSkeleton cardBg={cardBg} borderColor={borderColor} />
                </ScrollView>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scroll}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Abrir, cerrar y retirar mueven el efectivo del turno y
                        dependen del estado real del servidor: sin conexión se
                        deshabilitan y se dice por qué. El admin solo consulta. */}
                    {!esAdmin && isOffline && (
                        <OfflineBlockedNotice message={OFFLINE_BLOCKED_ACTIONS.caja.message} />
                    )}

                    {/* Cierre ya pedido: la caja sigue abierta esperando al
                        administrador, y eso hay que verlo sin abrir el modal. */}
                    {cajaAbierta && stats?.cierre_pendiente && (
                        <View
                            style={[
                                styles.pendingNotice,
                                {
                                    backgroundColor: `${accentColor}18`,
                                    borderColor: `${accentColor}40`,
                                },
                            ]}
                            accessibilityRole="alert"
                        >
                            <Ionicons name="time-outline" size={16} color={accentColor} />
                            <Text style={[styles.pendingNoticeText, { color: accentColor }]}>
                                Cierre pendiente de autorización: el administrador tiene el link por
                                WhatsApp y la caja sigue abierta hasta que responda.
                            </Text>
                        </View>
                    )}

                    {/* El aviso puede no llegar o quedarse sin respuesta: si el cierre sigue
                        pendiente, se puede insistir sin abrir el modal ni crear otra solicitud. */}
                    {!esAdmin && cajaAbierta && stats?.cierre_pendiente && (
                        <Pressable
                            style={[
                                styles.resendBtn,
                                {
                                    backgroundColor: `${accentColor}18`,
                                    borderColor: `${accentColor}40`,
                                },
                                (isOffline || reenviandoAviso) && styles.actionBtnDisabled,
                            ]}
                            onPress={handleReenviarAviso}
                            disabled={isOffline || reenviandoAviso}
                            accessibilityRole="button"
                            accessibilityLabel="Reenviar aviso de cierre al administrador"
                            accessibilityState={{ disabled: isOffline || reenviandoAviso }}
                        >
                            <Ionicons name="send-outline" size={15} color={accentColor} />
                            <Text style={[styles.resendBtnText, { color: accentColor }]}>
                                {reenviandoAviso ? 'Reenviando…' : 'Reenviar aviso al administrador'}
                            </Text>
                        </Pressable>
                    )}

                    {/* Nadie contestó el cierre: pasado el plazo se puede pedir de nuevo, lo
                        que expira la solicitud vieja y vuelve a avisar desde cero. */}
                    {!esAdmin && cajaAbierta && stats?.cierre_pendiente && stats?.cierre_estancado && (
                        <Pressable
                            style={[
                                styles.resendBtn,
                                {
                                    backgroundColor: `${accentColor}18`,
                                    borderColor: `${accentColor}40`,
                                },
                                (isOffline || reabriendoCierre) && styles.actionBtnDisabled,
                            ]}
                            onPress={handleReabrirCierre}
                            disabled={isOffline || reabriendoCierre}
                            accessibilityRole="button"
                            accessibilityLabel="Pedir el cierre de nuevo al administrador"
                            accessibilityState={{ disabled: isOffline || reabriendoCierre }}
                        >
                            <Ionicons name="refresh-outline" size={15} color={accentColor} />
                            <Text style={[styles.resendBtnText, { color: accentColor }]}>
                                {reabriendoCierre ? 'Pidiendo…' : 'Pedir cierre de nuevo'}
                            </Text>
                        </Pressable>
                    )}

                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusPill, { backgroundColor: `${accentColor}18` }]}>
                                <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
                                <Text style={[styles.statusLabel, { color: accentColor }]}>
                                    {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {!esAdmin && (cajaAbierta ? (
                                    <>
                                        <Pressable
                                            style={[styles.actionBtn, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }, isOffline && styles.actionBtnDisabled]}
                                            onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'retiro' })}
                                            disabled={isOffline}
                                            accessibilityLabel="Retirar efectivo"
                                            accessibilityState={{ disabled: isOffline }}
                                        >
                                            <Ionicons name="arrow-down-circle-outline" size={15} color={accentColor} />
                                            <Text style={[styles.actionBtnText, { color: accentColor }]}>Retiro</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.actionBtn, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }, isOffline && styles.actionBtnDisabled]}
                                            onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'cerrar' })}
                                            disabled={isOffline}
                                            accessibilityLabel="Pedir cierre de caja"
                                            accessibilityState={{ disabled: isOffline }}
                                        >
                                            <Ionicons name="lock-closed-outline" size={15} color={accentColor} />
                                            <Text style={[styles.actionBtnText, { color: accentColor }]}>Cierre</Text>
                                        </Pressable>
                                    </>
                                ) : (
                                    <Pressable
                                        style={[styles.actionBtn, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }, isOffline && styles.actionBtnDisabled]}
                                        onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'abrir' })}
                                        disabled={isOffline}
                                        accessibilityLabel="Abrir caja"
                                        accessibilityState={{ disabled: isOffline }}
                                    >
                                        <Ionicons name="power-outline" size={15} color={accentColor} />
                                        <Text style={[styles.actionBtnText, { color: accentColor }]}>Abrir Caja</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {cajaAbierta && cajaInfo && (
                            <View style={[styles.openedInfo, { borderTopColor: borderColor }]}>
                                <Ionicons name="time-outline" size={13} color={textSecondary} />
                                <Text style={[styles.openedText, { color: textSecondary }]}>
                                    Apertura: {new Date(cajaInfo.fecha_apertura).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                                </Text>
                            </View>
                        )}
                    </View>

                    {cajaAbierta && stats && (
                        <>
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="Balance Total" value={stats.balance_total || 0}
                                    icon="wallet-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Total Ventas" value={stats.total_ventas || 0}
                                    subtitle={`${stats.cantidad_ventas || 0} ventas`}
                                    icon="cart-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="Total Servicios" value={stats.total_servicios || 0}
                                    subtitle={`${stats.cantidad_servicios || 0} servicios`}
                                    icon="construct-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Efectivo" value={stats.total_efectivo || 0}
                                    icon="cash-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="Tarjetas" value={stats.total_tarjeta || 0}
                                    icon="card-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Transferencias" value={stats.total_transferencia || 0}
                                    icon="swap-horizontal-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="IVA" value={stats.total_iva || 0}
                                    icon="document-text-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Comisiones" value={stats.total_comisiones || 0}
                                    icon="people-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="Propinas" value={stats.total_propina || 0}
                                    icon="heart-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Anticipos" value={stats.total_anticipo || 0}
                                    icon="trending-down-outline" color={accentOnSurface} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>

                            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                                <View style={styles.breakdownHeader}>
                                    <Ionicons name="bar-chart-outline" size={16} color={accentOnSurface} />
                                    <Text style={[styles.breakdownTitle, { color: textPrimary }]}>Desglose del Turno</Text>
                                </View>

                                <StatRow label="Efectivo en Caja" value={stats.efectivo_en_caja || 0} accent={accentOnSurface} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Tarjetas" value={stats.total_tarjeta || 0} accent={accentOnSurface} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Transferencias" value={stats.total_transferencia || 0} accent={accentOnSurface} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Monto Apertura" value={stats.monto_apertura || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Servicios" value={stats.total_servicios || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Ventas" value={stats.total_ventas || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Anticipos" value={stats.total_anticipo || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Devoluciones" value={stats.total_devoluciones || 0} accent={accentOnSurface} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="IVA" value={stats.total_iva || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Propinas" value={stats.total_propina || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Comisiones" value={stats.total_comisiones || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />

                                <View style={[styles.totalRow, { borderTopColor: borderColor }]}>
                                    <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL INGRESADO</Text>
                                    <Text style={[styles.totalValue, { color: accentColor }]}>
                                        ${(stats.balance_total || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}

                    {!cajaAbierta && stats && (
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor, alignItems: 'center', paddingVertical: 40 }]}>
                            <View style={[styles.emptyIconBox, { backgroundColor: surfaceMuted }]}>
                                <Ionicons name="wallet-outline" size={36} color={textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Turno no iniciado</Text>
                            {!esAdmin && (
                                <Pressable
                                    style={[styles.emptyOpenBtn, { backgroundColor: accentColor }]}
                                    onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'abrir' })}
                                    accessibilityRole="button"
                                    accessibilityLabel="Abrir caja de turno"
                                >
                                    <Ionicons name="power-outline" size={18} color={accentText} />
                                    <Text style={styles.emptyOpenBtnText}>Abrir Caja</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {!cajaAbierta && !stats && (
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor, alignItems: 'center', paddingVertical: 40 }]}>
                            <View style={[styles.emptyIconBox, { backgroundColor: surfaceMuted }]}>
                                <Ionicons name="wallet-outline" size={36} color={textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Sin datos de caja</Text>
                            {!esAdmin && (
                                <Pressable
                                    style={[styles.emptyOpenBtn, { backgroundColor: accentColor }]}
                                    onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'abrir' })}
                                    accessibilityRole="button"
                                    accessibilityLabel="Abrir caja sin datos"
                                >
                                    <Ionicons name="power-outline" size={18} color={accentText} />
                                    <Text style={styles.emptyOpenBtnText}>Abrir Caja</Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}

            {!esAdmin && (
                <CajaModales
                    modalVisible={modalVisible}
                    modalType={modalType}
                    modalConfig={modalConfig}
                    isDark={isDark}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    stats={stats}
                    monto={monto}
                    motivoRetiro={motivoRetiro}
                    submitting={submitting}
                    dispatch={dispatch}
                    handleMontoChange={handleMontoChange}
                    handleSubmit={handleSubmit}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backBtnRight: {
        flexDirection: 'row', 
        alignItems: 'center', 
        height: 38, 
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        gap: 6
    },
    backTextRight: { fontFamily: FontFamily.extrabold, fontSize: 13, letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    scroll: { ...contentColumn, padding: 16, gap: 12, paddingBottom: 40 },
    card: { borderRadius: 20, borderWidth: 1, padding: 16 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusLabel: { fontSize: 13, fontFamily: FontFamily.extrabold },
    openedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
    openedText: { fontSize: 12, fontFamily: FontFamily.medium },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12, borderWidth: 1
    },
    actionBtnDisabled: { opacity: 0.45 },
    actionBtnText: { fontSize: 13, fontFamily: FontFamily.bold },
    pendingNotice: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
        marginBottom: 12
    },
    pendingNoticeText: { fontSize: 12, fontFamily: FontFamily.bold, flex: 1, lineHeight: 17 },
    resendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1, borderRadius: 14,
        paddingHorizontal: 12, paddingVertical: 10,
        marginBottom: 12
    },
    resendBtnText: { fontSize: 12, fontFamily: FontFamily.extrabold },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    breakdownTitle: { fontSize: 14, fontFamily: FontFamily.extrabold, textTransform: 'uppercase', letterSpacing: 0.5 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 },
    totalLabel: { fontSize: 12, fontFamily: FontFamily.extrabold, letterSpacing: 0.8 },
    totalValue: { fontSize: 22, fontFamily: FontFamily.black },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontFamily: FontFamily.extrabold, marginBottom: 8 },
    emptySubtitle: { fontSize: 13, fontFamily: FontFamily.medium, textAlign: 'center', marginBottom: 24, maxWidth: 260, lineHeight: 20 },
    emptyOpenBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14
    },
    emptyOpenBtnText: { fontSize: 15, fontFamily: FontFamily.extrabold },
});
