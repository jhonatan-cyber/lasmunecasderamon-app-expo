import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
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
import { CajaSkeleton, MetricCard, StatRow, CajaModales } from '@/components/cajero/caja';

export default function CajaScreen() {
    const {
        accentColor,
        isDark,
        bg,
        cardBg,
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
            <StatusBar style={isDark ? 'dark' : 'light'} />

            <PremiumHeader
                title="Caja"
                subtitle={fromCache
                    ? 'Datos guardados en el dispositivo'
                    : cajaAbierta && cajaInfo?.fecha_apertura
                        ? `Abierta: ${new Date(cajaInfo.fecha_apertura).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}`
                        : 'Turno no iniciado'}
                connectionStatus={fromCache ? { isConnected: false, label: 'Modo Offline' } : undefined}
                rightComponent={
                    <View style={styles.headerActions}>
                        <Pressable
                            style={styles.backBtnRight}
                            onPress={onRefresh}
                            accessibilityLabel="Actualizar caja"
                        >
                            <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                        </Pressable>
                        <Pressable
                            onPress={() => router.replace('/(app)/cajero/(tabs)' as any)}
                            style={styles.backBtnRight}
                            accessibilityLabel="Volver"
                        >
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backTextRight}>Atrás</Text>
                        </Pressable>
                    </View>
                }
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
                        deshabilitan y se dice por qué. */}
                    {isOffline && (
                        <OfflineBlockedNotice message={OFFLINE_BLOCKED_ACTIONS.caja.message} />
                    )}

                    {/* Cierre ya pedido: la caja sigue abierta esperando al
                        administrador, y eso hay que verlo sin abrir el modal. */}
                    {cajaAbierta && stats?.cierre_pendiente && (
                        <View
                            style={[
                                styles.pendingNotice,
                                {
                                    backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB',
                                    borderColor: isDark ? 'rgba(245,158,11,0.40)' : '#FDE68A',
                                },
                            ]}
                            accessibilityRole="alert"
                        >
                            <Ionicons name="time-outline" size={16} color="#D97706" />
                            <Text style={[styles.pendingNoticeText, { color: isDark ? '#FCD34D' : '#B45309' }]}>
                                Cierre pendiente de autorización: el administrador tiene el link por
                                WhatsApp y la caja sigue abierta hasta que responda.
                            </Text>
                        </View>
                    )}

                    {/* El aviso puede no llegar o quedarse sin respuesta: si el cierre sigue
                        pendiente, se puede insistir sin abrir el modal ni crear otra solicitud. */}
                    {cajaAbierta && stats?.cierre_pendiente && (
                        <Pressable
                            style={[
                                styles.resendBtn,
                                {
                                    backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7',
                                    borderColor: isDark ? 'rgba(245,158,11,0.45)' : '#FCD34D',
                                },
                                (isOffline || reenviandoAviso) && styles.actionBtnDisabled,
                            ]}
                            onPress={handleReenviarAviso}
                            disabled={isOffline || reenviandoAviso}
                            accessibilityRole="button"
                            accessibilityLabel="Reenviar aviso de cierre al administrador"
                            accessibilityState={{ disabled: isOffline || reenviandoAviso }}
                        >
                            <Ionicons name="send-outline" size={15} color="#B45309" />
                            <Text style={styles.resendBtnText}>
                                {reenviandoAviso ? 'Reenviando…' : 'Reenviar aviso al administrador'}
                            </Text>
                        </Pressable>
                    )}

                    {/* Nadie contestó el cierre: pasado el plazo se puede pedir de nuevo, lo
                        que expira la solicitud vieja y vuelve a avisar desde cero. */}
                    {cajaAbierta && stats?.cierre_pendiente && stats?.cierre_estancado && (
                        <Pressable
                            style={[
                                styles.resendBtn,
                                {
                                    backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7',
                                    borderColor: isDark ? 'rgba(245,158,11,0.45)' : '#FCD34D',
                                },
                                (isOffline || reabriendoCierre) && styles.actionBtnDisabled,
                            ]}
                            onPress={handleReabrirCierre}
                            disabled={isOffline || reabriendoCierre}
                            accessibilityRole="button"
                            accessibilityLabel="Pedir el cierre de nuevo al administrador"
                            accessibilityState={{ disabled: isOffline || reabriendoCierre }}
                        >
                            <Ionicons name="refresh-outline" size={15} color="#B45309" />
                            <Text style={styles.resendBtnText}>
                                {reabriendoCierre ? 'Pidiendo…' : 'Pedir cierre de nuevo'}
                            </Text>
                        </Pressable>
                    )}

                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusPill, { backgroundColor: cajaAbierta ? '#10B98118' : '#EF444418' }]}>
                                <View style={[styles.statusDot, { backgroundColor: cajaAbierta ? '#10B981' : '#EF4444' }]} />
                                <Text style={[styles.statusLabel, { color: cajaAbierta ? '#10B981' : '#EF4444' }]}>
                                    {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {cajaAbierta ? (
                                    <>
                                        <Pressable
                                            style={[styles.actionBtn, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B40' }, isOffline && styles.actionBtnDisabled]}
                                            onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'retiro' })}
                                            disabled={isOffline}
                                            accessibilityLabel="Retirar efectivo"
                                            accessibilityState={{ disabled: isOffline }}
                                        >
                                            <Ionicons name="arrow-down-circle-outline" size={15} color="#F59E0B" />
                                            <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Retiro</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.actionBtn, { backgroundColor: '#EF444420', borderColor: '#EF444440' }, isOffline && styles.actionBtnDisabled]}
                                            onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'cerrar' })}
                                            disabled={isOffline}
                                            accessibilityLabel="Pedir cierre de caja"
                                            accessibilityState={{ disabled: isOffline }}
                                        >
                                            <Ionicons name="lock-closed-outline" size={15} color="#EF4444" />
                                            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Cierre</Text>
                                        </Pressable>
                                    </>
                                ) : (
                                    <Pressable
                                        style={[styles.actionBtn, { backgroundColor: '#10B98120', borderColor: '#10B98140' }, isOffline && styles.actionBtnDisabled]}
                                        onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'abrir' })}
                                        disabled={isOffline}
                                        accessibilityLabel="Abrir caja"
                                        accessibilityState={{ disabled: isOffline }}
                                    >
                                        <Ionicons name="power-outline" size={15} color="#10B981" />
                                        <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Abrir Caja</Text>
                                    </Pressable>
                                )}
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
                                    icon="wallet-outline" color={accentColor} bgColor={`${accentColor}18`}
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Total Ventas" value={stats.total_ventas || 0}
                                    subtitle={`${stats.cantidad_ventas || 0} ventas`}
                                    icon="cart-outline" color="#10B981" bgColor="#10B98118"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="Total Servicios" value={stats.total_servicios || 0}
                                    subtitle={`${stats.cantidad_servicios || 0} servicios`}
                                    icon="construct-outline" color="#3B82F6" bgColor="#3B82F618"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Efectivo" value={stats.total_efectivo || 0}
                                    icon="cash-outline" color="#F59E0B" bgColor="#F59E0B18"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="Tarjetas" value={stats.total_tarjeta || 0}
                                    icon="card-outline" color="#8B5CF6" bgColor="#8B5CF618"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Transferencias" value={stats.total_transferencia || 0}
                                    icon="swap-horizontal-outline" color="#EC4899" bgColor="#EC489918"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="IVA" value={stats.total_iva || 0}
                                    icon="document-text-outline" color="#10B981" bgColor="#10B98118"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Comisiones" value={stats.total_comisiones || 0}
                                    icon="people-outline" color="#8B5CF6" bgColor="#8B5CF618"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>
                            <View style={styles.metricsGrid}>
                                <MetricCard
                                    label="Propinas" value={stats.total_propina || 0}
                                    icon="heart-outline" color="#F59E0B" bgColor="#F59E0B18"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                                <MetricCard
                                    label="Anticipos" value={stats.total_anticipo || 0}
                                    icon="trending-down-outline" color="#EF4444" bgColor="#EF444418"
                                    isDark={isDark} cardBg={cardBg} borderColor={borderColor}
                                />
                            </View>

                            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                                <View style={styles.breakdownHeader}>
                                    <Ionicons name="bar-chart-outline" size={16} color={accentColor} />
                                    <Text style={[styles.breakdownTitle, { color: textPrimary }]}>Desglose del Turno</Text>
                                </View>

                                <StatRow label="Efectivo en Caja" value={stats.efectivo_en_caja || 0} accent="#10B981" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Tarjetas" value={stats.total_tarjeta || 0} accent="#3B82F6" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Transferencias" value={stats.total_transferencia || 0} accent="#6366F1" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Monto Apertura" value={stats.monto_apertura || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Servicios" value={stats.total_servicios || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Ventas" value={stats.total_ventas || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Anticipos" value={stats.total_anticipo || 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Devoluciones" value={stats.total_devoluciones || 0} accent="#EF4444" textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
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
                            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#111111' : '#F1F5F9' }]}>
                                <Ionicons name="wallet-outline" size={36} color={textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Turno no iniciado</Text>
                            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                                Abre la caja para comenzar a registrar movimientos del turno
                            </Text>
                            <Pressable
                                style={[styles.emptyOpenBtn, { backgroundColor: accentColor }]}
                                onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'abrir' })}
                            >
                                <Ionicons name="power-outline" size={18} color="#FFF" />
                                <Text style={styles.emptyOpenBtnText}>Abrir Caja</Text>
                            </Pressable>
                        </View>
                    )}

                    {!cajaAbierta && !stats && (
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor, alignItems: 'center', paddingVertical: 40 }]}>
                            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#111111' : '#F1F5F9' }]}>
                                <Ionicons name="wallet-outline" size={36} color={textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Sin datos de caja</Text>
                            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                                No hay registros de caja aún. Abre una para comenzar.
                            </Text>
                            <Pressable
                                style={[styles.emptyOpenBtn, { backgroundColor: accentColor }]}
                                onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'abrir' })}
                            >
                                <Ionicons name="power-outline" size={18} color="#FFF" />
                                <Text style={styles.emptyOpenBtnText}>Abrir Caja</Text>
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            )}

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
    backTextRight: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    scroll: { padding: 16, gap: 12, paddingBottom: 40 },
    card: { borderRadius: 20, borderWidth: 1, padding: 16 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusLabel: { fontSize: 13, fontWeight: '800' },
    openedInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
    openedText: { fontSize: 12, fontWeight: '500' },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12, borderWidth: 1
    },
    actionBtnDisabled: { opacity: 0.45 },
    actionBtnText: { fontSize: 13, fontWeight: '700' },
    pendingNotice: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
        marginBottom: 12
    },
    pendingNoticeText: { fontSize: 12, fontWeight: '700', flex: 1, lineHeight: 17 },
    resendBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1, borderRadius: 14,
        paddingHorizontal: 12, paddingVertical: 10,
        marginBottom: 12
    },
    resendBtnText: { fontSize: 12, fontWeight: '800', color: '#B45309' },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    breakdownTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 },
    totalLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
    totalValue: { fontSize: 22, fontWeight: '900', color: '#E11D48' },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    emptySubtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginBottom: 24, maxWidth: 260, lineHeight: 20 },
    emptyOpenBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14
    },
    emptyOpenBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
