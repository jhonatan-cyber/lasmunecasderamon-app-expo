import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { contentColumn } from '@/constants/layout';
import { FontFamily } from '@/constants/fonts';
import { BorderRadius } from '@/constants/spacing';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
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
import { CajaSkeleton, CajaSection, StatRow, CajaModales } from '@/components/cajero/caja';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { MetricBanner, MetricCards, type MetricCardItem } from '@/components/ui/MetricCards';
import {
    formatearFechaApertura,
    formatearHoraApertura,
    formatearMonto
} from '@/utils/cajaFormat';
import { columnasCaja } from '@/utils/cajaLayout';

export default function CajaScreen() {
    const { accentOnSurface, accentText } = useAccentColor();
    const esAdmin = useIsAdmin();
    const { isTablet, isLandscape, width } = useResponsiveMetrics();
    const compacto = isLandscape && !isTablet;
    const columnas = columnasCaja(isTablet, isLandscape);
    // En tablet horizontal hay ancho de sobra: origen y destino van en dos columnas.
    const seccionesEnFila = isLandscape && (isTablet || width >= 900);
    // Al ir dos secciones lado a lado, cada una ocupa la mitad del ancho.
    const columnasSeccion = seccionesEnFila ? 2 : columnas;
    const padding = isTablet ? 24 : compacto ? 12 : 16;
    const gap = isTablet ? 16 : compacto ? 10 : 12;
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
        totalEntradas,
        cantidadEntradas,
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

    const montoCierrePrevisto = stats?.monto_cierre_previsto ?? stats?.balance_total;
    const saldoPendiente = stats?.saldo_clientes_pendiente ?? stats?.prepago_pendiente_clientes ?? 0;

    const origen = useMemo<MetricCardItem[]>(() => {
        if (!stats) return [];
        const prepagoCargado = stats.prepago_cargado ?? stats.prepago ?? 0;
        return [
            { key: 'ventas', label: 'Ventas', value: formatearMonto(stats.total_ventas), detail: `${stats.cantidad_ventas ?? 0} ventas`, icon: 'receipt-outline', color: accentOnSurface },
            { key: 'servicios', label: 'Servicios', value: formatearMonto(stats.total_servicios), detail: `${stats.cantidad_servicios ?? 0} servicios`, icon: 'construct-outline', color: accentOnSurface },
            { key: 'entradas', label: 'Entradas', value: formatearMonto(totalEntradas), detail: `${cantidadEntradas} del turno`, icon: 'ticket-outline', color: accentOnSurface },
            { key: 'prepago', label: 'Prepago clientes', value: formatearMonto(prepagoCargado), detail: `Saldo pendiente ${formatearMonto(saldoPendiente)}`, icon: 'happy-outline', color: accentOnSurface },
        ];
    }, [stats, totalEntradas, cantidadEntradas, saldoPendiente, accentOnSurface]);

    const ubicacion = useMemo<MetricCardItem[]>(() => {
        if (!stats) return [];
        return [
            { key: 'efectivo', label: 'Efectivo', value: formatearMonto(stats.efectivo_en_caja ?? stats.total_efectivo), icon: 'cash-outline', color: accentOnSurface },
            { key: 'tarjetas', label: 'Tarjetas', value: formatearMonto(stats.total_tarjeta), icon: 'card-outline', color: accentOnSurface },
            { key: 'transferencias', label: 'Transferencias', value: formatearMonto(stats.total_transferencia), icon: 'swap-horizontal-outline', color: accentOnSurface },
        ];
    }, [stats, accentOnSurface]);

    const otros = useMemo<MetricCardItem[]>(() => {
        if (!stats) return [];
        return [
            { key: 'iva', label: 'IVA', value: formatearMonto(stats.total_iva), icon: 'document-text-outline', color: accentOnSurface },
            { key: 'comisiones', label: 'Comisiones', value: formatearMonto(stats.total_comisiones), icon: 'briefcase-outline', color: accentOnSurface },
            { key: 'propinas', label: 'Propinas', value: formatearMonto(stats.total_propina), icon: 'heart-outline', color: accentOnSurface },
            { key: 'anticipos', label: 'Anticipos', value: formatearMonto(stats.total_anticipo), icon: 'trending-down-outline', color: accentOnSurface },
        ];
    }, [stats, accentOnSurface]);

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false, orientation: 'all' }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <PremiumHeader
                title={esAdmin ? 'Estado de caja' : 'Caja'}
                subtitle={fromCache
                    ? 'Datos guardados en el dispositivo'
                    : cajaAbierta && cajaInfo?.fecha_apertura
                        ? `Abierta: ${formatearHoraApertura(cajaInfo.fecha_apertura)}`
                        : 'Turno no iniciado'}
                connectionStatus={fromCache ? { isConnected: false, label: 'Modo Offline' } : undefined}
                onBack={() => router.replace('/(app)/cajero/(tabs)' as never)}
            />

            <OfflineStatusBanner pendientesHref={'/(app)/cajero/pendientes' as never} />

            {loading ? (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[contentColumn, { padding, gap }]}
                >
                    <CajaSkeleton
                        cardBg={cardBg}
                        borderColor={borderColor}
                        columnas={columnas}
                    />
                </ScrollView>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[
                        contentColumn,
                        styles.scroll,
                        { padding, gap, paddingBottom: isTablet ? 48 : compacto ? 24 : 40 },
                    ]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                    showsVerticalScrollIndicator={false}
                >

                    {!esAdmin && isOffline && (
                        <OfflineBlockedNotice message={OFFLINE_BLOCKED_ACTIONS.caja.message} />
                    )}

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
                            <Ionicons name="time-outline" size={16} color={accentOnSurface} />
                            <Text style={[styles.pendingNoticeText, { color: accentOnSurface }]}>
                                Cierre pendiente de autorización: el administrador tiene el link por
                                WhatsApp y la caja sigue abierta hasta que responda.
                            </Text>
                        </View>
                    )}


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
                            <Ionicons name="send-outline" size={15} color={accentOnSurface} />
                            <Text style={[styles.resendBtnText, { color: accentOnSurface }]}>
                                {reenviandoAviso ? 'Reenviando…' : 'Reenviar aviso al administrador'}
                            </Text>
                        </Pressable>
                    )}


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
                            <Ionicons name="refresh-outline" size={15} color={accentOnSurface} />
                            <Text style={[styles.resendBtnText, { color: accentOnSurface }]}>
                                {reabriendoCierre ? 'Pidiendo…' : 'Pedir cierre de nuevo'}
                            </Text>
                        </Pressable>
                    )}

                    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusPill, { backgroundColor: `${accentColor}18` }]}>
                                <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
                                <Text style={[styles.statusLabel, { color: accentOnSurface }]}>
                                    {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'}
                                </Text>
                            </View>
                            <View style={styles.actionGroup}>
                                {!esAdmin && (cajaAbierta ? (
                                    <>
                                        <Pressable
                                            style={[styles.actionBtn, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }, isOffline && styles.actionBtnDisabled]}
                                            onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'retiro' })}
                                            disabled={isOffline}
                                            accessibilityLabel="Retirar efectivo"
                                            accessibilityState={{ disabled: isOffline }}
                                        >
                                            <Ionicons name="arrow-down-circle-outline" size={15} color={accentOnSurface} />
                                            <Text style={[styles.actionBtnText, { color: accentOnSurface }]}>Retiro</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.actionBtn, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }, isOffline && styles.actionBtnDisabled]}
                                            onPress={() => dispatch({ type: 'OPEN_MODAL', payload: 'cerrar' })}
                                            disabled={isOffline}
                                            accessibilityLabel="Pedir cierre de caja"
                                            accessibilityState={{ disabled: isOffline }}
                                        >
                                            <Ionicons name="lock-closed-outline" size={15} color={accentOnSurface} />
                                            <Text style={[styles.actionBtnText, { color: accentOnSurface }]}>Cierre</Text>
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
                                        <Ionicons name="power-outline" size={15} color={accentOnSurface} />
                                        <Text style={[styles.actionBtnText, { color: accentOnSurface }]}>Abrir Caja</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {cajaAbierta && cajaInfo && (
                            <View style={[styles.openedInfo, { borderTopColor: borderColor }]}>
                                <Ionicons name="time-outline" size={13} color={textSecondary} />
                                <Text style={[styles.openedText, { color: textSecondary }]}>
                                    Apertura: {formatearFechaApertura(cajaInfo.fecha_apertura)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {cajaAbierta && stats && (
                        <>
                            {/* 1. La cifra principal del turno. */}
                            <MetricBanner
                                label="Balance total"
                                amount={formatearMonto(stats.balance_total)}
                                details={[
                                    `Cierre previsto ${formatearMonto(montoCierrePrevisto)}`,
                                    `${stats.cantidad_ventas ?? 0} ventas · ${stats.cantidad_servicios ?? 0} servicios`,
                                ]}
                                cardBg={cardBg}
                                borderColor={borderColor}
                                isDark={isDark}
                                style={compacto ? styles.heroCompacto : undefined}
                            />

                            <View style={seccionesEnFila ? styles.seccionesEnFila : undefined}>
                                {/* 2. Origen del dinero. */}
                                <CajaSection
                                    title="Origen del dinero"
                                    subtitle="De dónde viene el dinero del turno"
                                    icon="trending-up-outline"
                                    style={seccionesEnFila ? styles.seccionEnFila : undefined}
                                >
                                    <MetricCards
                                        items={origen}
                                        variant="grid"
                                        columns={columnasSeccion}
                                        cardBg={cardBg}
                                        borderColor={borderColor}
                                        isDark={isDark}
                                        animateIndex
                                    />
                                </CajaSection>

                                {/* 3. Forma en que está el dinero. */}
                                <CajaSection
                                    title="Dónde está el dinero"
                                    subtitle="Efectivo, tarjeta y transferencias"
                                    icon="wallet-outline"
                                    style={seccionesEnFila ? styles.seccionEnFila : undefined}
                                >
                                    <MetricCards
                                        items={ubicacion}
                                        variant="grid"
                                        columns={columnasSeccion}
                                        cardBg={cardBg}
                                        borderColor={borderColor}
                                        isDark={isDark}
                                        animateIndex
                                    />
                                </CajaSection>
                            </View>

                            {/* 4. Impuestos y movimientos del turno. */}
                            <CajaSection
                                title="IVA y otros movimientos"
                                subtitle="Impuestos, comisiones, propinas y anticipos"
                                icon="receipt-outline"
                            >
                                <MetricCards
                                    items={otros}
                                    variant="grid"
                                    columns={columnas}
                                    cardBg={cardBg}
                                    borderColor={borderColor}
                                    isDark={isDark}
                                    animateIndex
                                />
                            </CajaSection>

                            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                                <View style={styles.breakdownHeader}>
                                    <Ionicons name="bar-chart-outline" size={16} color={accentOnSurface} />
                                    <Text style={[styles.breakdownTitle, { color: textPrimary }]}>Detalle adicional</Text>
                                </View>

                                <StatRow label="Monto Apertura" value={stats.monto_apertura ?? 0} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Devoluciones" value={stats.total_devoluciones ?? 0} accent={accentOnSurface} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                                <StatRow label="Saldo clientes (no está en caja)" value={saldoPendiente} accent={accentOnSurface} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />

                                <View style={[styles.totalRow, { borderTopColor: borderColor }]}>
                                    <Text style={[styles.totalLabel, { color: textPrimary }]}>MONTO DE CIERRE PREVISTO</Text>
                                    <Text style={[styles.totalValue, { color: accentOnSurface }]}>
                                        {formatearMonto(montoCierrePrevisto)}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}

                    {!cajaAbierta && (
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor, alignItems: 'center', paddingVertical: 40 }]}>
                            <View style={[styles.emptyIconBox, { backgroundColor: surfaceMuted }]}>
                                <Ionicons name="wallet-outline" size={36} color={textSecondary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: textPrimary }]}>
                                {stats ? 'Turno no iniciado' : 'Sin datos de caja'}
                            </Text>
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
                </ScrollView>
            )}

            {!esAdmin && (
                <CajaModales
                    modalVisible={modalVisible}
                    modalType={modalType}
                    modalConfig={modalConfig}
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
    scroll: { gap: 12 },
    card: { borderRadius: BorderRadius.card, borderWidth: 1, padding: 16 },
    statusRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8,
    },
    actionGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
    heroCompacto: { paddingVertical: 16 },
    seccionesEnFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    seccionEnFila: { flex: 1 },
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
    breakdownHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    breakdownTitle: { fontSize: 14, fontFamily: FontFamily.extrabold, textTransform: 'uppercase', letterSpacing: 0.5 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 },
    totalLabel: { fontSize: 12, fontFamily: FontFamily.extrabold, letterSpacing: 0.8 },
    totalValue: { fontSize: 22, fontFamily: FontFamily.black },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontFamily: FontFamily.extrabold, marginBottom: 8 },
    emptyOpenBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14
    },
    emptyOpenBtnText: { fontSize: 15, fontFamily: FontFamily.extrabold },
});
