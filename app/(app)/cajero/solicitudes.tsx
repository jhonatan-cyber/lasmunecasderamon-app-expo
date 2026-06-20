import { Ionicons } from '@expo/vector-icons';
import { FlashList as ShopifyFlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import React, { useState } from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAccentColor } from '@/hooks/useAccentColor';
import { SolicitudesSkeleton } from '@/components/cajero/solicitudes/SolicitudesSkeleton';


import { CheckoutModal } from '@/components/cajero/CheckoutModal';
import { ServiceModal } from '@/components/cajero/ServiceModal';
import { SolicitudCard } from '@/components/cajero/SolicitudCard';
import { useSolicitudes } from '@/hooks/useSolicitudes';
import { useSolicitudesActions } from '@/hooks/useSolicitudesActions';

const FlashList = ShopifyFlashList as any;

export default function SolicitudesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const numColumns = isTablet ? 2 : 1;

    
    const {
        solicitudes,
        loading,
        refreshing,
        cajaAbierta,
        allHostesses,
        fetchSolicitudes,
        onRefresh,
        pendingAutoOpen,
        setPendingAutoOpen,
        serverOffset,
        removeSolicitudLocally,
        isOffline
    } = useSolicitudes();

    const {
        nowTick,
        checkoutModalVisible,
        selectedPedido,
        pedidoDetails,
        loadingDetails,
        loadingClient,
        metodoPago,
        metodoPagoAdicional,
        selectedClient,
        agregarPropina,
        selectedMinutesPedido,
        submittingCheckout,
        alertConfig,
        serviceModalVisible,
        selectedService,
        setCheckoutModalVisible,
        setMetodoPago,
        setMetodoPagoAdicional,
        setAgregarPropina,
        setSelectedMinutesPedido,
        setAlertConfig,
        setServiceModalVisible,
        setSelectedService,
        handleAprobar,
        handleRechazar,
        handleCheckoutSubmit,
        handleAddToCuenta,
    } = useSolicitudesActions({
        solicitudes,
        cajaAbierta,
        fetchSolicitudes,
        removeSolicitudLocally,
        pendingAutoOpen,
        setPendingAutoOpen,
    });

    
    const [activeFilter, setActiveFilter] = useState<'all' | 'anticipo' | 'pedido' | 'solicitud'>('all');

    
    const { totalAPagar, filteredSolicitudes } = React.useMemo(() => {
        let filtered = solicitudes;
        if (activeFilter !== 'all') {
            filtered = solicitudes.filter(s => s.tipoItem === activeFilter);
        }
        const total = filtered
            .filter(s => s.tipoItem === 'anticipo' && s.estado !== 0)
            .reduce((sum: number, s: any) => sum + (Number(s.monto) || 0), 0);
        return { totalAPagar: total, filteredSolicitudes: filtered };
    }, [solicitudes, activeFilter]);

    
    const { 
        accentColor, 
        gradientColors, 
        isDark, 
        accentBg, 
        accentBorder,
        bg,
        cardBg,
        textPrimary,
        textSecondary,
        borderColor
    } = useAccentColor();


    if (loading) {
        return <SolicitudesSkeleton bg={bg} cardBg={cardBg} borderColor={borderColor} insets={insets} isTablet={isTablet} gradientColors={gradientColors} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <PremiumHeader
                title="Solicitudes"
                subtitle={!cajaAbierta ? 'Caja cerrada' : 'Pendientes de aprobación'}
                connectionStatus={{ 
                    isConnected: !isOffline, 
                    label: isOffline ? 'Modo Offline' : 'En Línea' 
                }}
                rightComponent={
                    <View style={styles.headerActions}>
                        <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
                            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                            <Text style={styles.backTextRight}>Atrás</Text>
                        </Pressable>
                    </View>
                }
            />

            {isOffline && (
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    style={[styles.offlineBanner, { backgroundColor: '#EF4444' }]}
                >
                    <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
                    <Text style={styles.offlineBannerText}>MODO OFFLINE - VIENDO DATOS GUARDADOS</Text>
                </MotiView>
            )}

            {}
            {totalAPagar > 0 && (
                <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={[styles.totalBanner, { backgroundColor: cardBg, borderColor, borderLeftColor: accentColor }]}
                >
                    <View style={[styles.totalBannerIcon, { backgroundColor: `${accentColor}20` }]}>
                        <Ionicons name="cash-outline" size={22} color={accentColor} />
                    </View>
                    <View style={styles.totalBannerText}>
                        <Text style={[styles.totalBannerLabel, { color: textSecondary }]}>TOTAL A PAGAR EN ANTICIPOS</Text>
                        <Text style={[styles.totalBannerValue, { color: accentColor }]}>${totalAPagar.toLocaleString()}</Text>
                    </View>
                </MotiView>
            )}

            {}
            <View style={[styles.filterRow, { paddingHorizontal: 16 }]}>
                {(['all', 'anticipo', 'pedido', 'solicitud'] as const).map(type => {
                    const count = type === 'all' ? solicitudes.length : solicitudes.filter(s => s.tipoItem === type).length;
                    const labels: Record<string, string> = { all: 'Todas', anticipo: 'Anticipos', pedido: 'Pedidos', solicitud: 'Servicios' };
                    return (
                        <Pressable
                            key={type}
                            style={[
                                styles.filterTab,
                                { backgroundColor: cardBg, borderColor },
                                activeFilter === type && { backgroundColor: accentColor, borderColor: accentColor }
                            ]}
                            onPress={() => setActiveFilter(type)}
                        >
                            <Text style={[
                                styles.filterTabText,
                                { color: textSecondary },
                                activeFilter === type && { color: '#FFFFFF', fontWeight: '800' }
                            ]}>
                                {labels[type]} ({count})
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {solicitudes.length > 0 && !isOffline && (
                <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={[styles.urgencyBar, { backgroundColor: accentColor, marginHorizontal: 16 }]}
                >
                    <Ionicons name="warning" size={20} color="#FFFFFF" />
                    <Text style={styles.urgencyBarText}>
                        {filteredSolicitudes.length} {activeFilter === 'all' ? 'SOLICITUDES' : activeFilter.toUpperCase()} PENDIENTE{filteredSolicitudes.length !== 1 ? 'S' : ''}
                    </Text>
                </MotiView>
            )}

            <FlashList
                data={filteredSolicitudes}
                keyExtractor={(item: any) => item.id_unificado}
                renderItem={({ item }: { item: any }) => (
                    <View
                        style={[
                            styles.cardWrapper,
                            numColumns > 1 && styles.cardWrapperGrid,
                        ]}
                    >
                        <SolicitudCard 
                            item={item}
                            accentColor={accentColor}
                            textPrimary={textPrimary}
                            textSecondary={textSecondary}
                            cardBg={cardBg}
                            borderColor={borderColor}
                            serverOffset={serverOffset}
                            cajaAbierta={cajaAbierta}
                            onAprobar={handleAprobar}
                            onRechazar={handleRechazar}
                            onShowServiceModal={(si) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setSelectedService(si);
                                setServiceModalVisible(true);
                            }}
                            nowTick={nowTick}
                        />
                    </View>
                )}
                extraData={`${nowTick}-${activeFilter}`}
                estimatedItemSize={120}
                numColumns={numColumns}
                columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
                contentContainerStyle={styles.listContainer}
                drawDistance={500}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
                ListEmptyComponent={
                    <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}>
                        <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" style={{ marginBottom: 12 }} />
                        <Text style={[styles.emptyText, { color: textPrimary }]}>
                            {!cajaAbierta ? 'Caja Cerrada' : activeFilter !== 'all' ? `Sin ${activeFilter === 'anticipo' ? 'anticipos' : activeFilter === 'pedido' ? 'pedidos' : 'servicios'} pendientes` : 'Todo al día'}
                        </Text>
                        <Text style={[styles.emptySub, { color: textSecondary }]}>
                            {!cajaAbierta ? 'Abre una caja para procesar' : 'No hay solicitudes pendientes'}
                        </Text>
                    </View>
                }
            />

            <CheckoutModal 
                visible={checkoutModalVisible}
                onClose={() => setCheckoutModalVisible(false)}
                selectedPedido={selectedPedido}
                pedidoDetails={pedidoDetails}
                loadingDetails={loadingDetails}
                selectedClient={selectedClient}
                metodoPago={metodoPago}
                setMetodoPago={setMetodoPago}
                metodoPagoAdicional={metodoPagoAdicional}
                setMetodoPagoAdicional={setMetodoPagoAdicional}
                agregarPropina={agregarPropina}
                setAgregarPropina={setAgregarPropina}
                selectedMinutesPedido={selectedMinutesPedido}
                setSelectedMinutesPedido={setSelectedMinutesPedido}
                submittingCheckout={submittingCheckout}
                onCheckoutSubmit={handleCheckoutSubmit}
                onAddToCuenta={handleAddToCuenta}
                isDark={isDark}
                accentColor={accentColor}
                accentBg={accentBg}
                accentBorder={accentBorder}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderColor={borderColor}
                cardBg={cardBg}
            />

            <ServiceModal 
                visible={serviceModalVisible}
                onClose={() => setServiceModalVisible(false)}
                selectedService={selectedService}
                selectedClient={selectedClient}
                loadingClient={loadingClient}
                metodoPago={metodoPago}
                setMetodoPago={setMetodoPago}
                metodoPagoAdicional={metodoPagoAdicional}
                setMetodoPagoAdicional={setMetodoPagoAdicional}
                allHostesses={allHostesses}
                onAprobar={handleAprobar}
                isDark={isDark}
                isTablet={isTablet}
                accentColor={accentColor}
                accentBg={accentBg}
                accentBorder={accentBorder}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderColor={borderColor}
                cardBg={cardBg}
            />

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
                onCancel={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                showCancel
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
    listContainer: { padding: 16, paddingBottom: 100 },
    cardWrapper: { paddingBottom: 16 },
    cardWrapperGrid: { flex: 1, paddingHorizontal: 8 },
    columnWrapper: { marginHorizontal: -8 },
    cardSkeleton: { flex: 1, borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 16 },
    emptyCard: { borderRadius: 24, padding: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 40, borderStyle: 'dashed' },
    emptyText: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    emptySub: { fontSize: 14, fontWeight: '500' },
    totalBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 4,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderLeftWidth: 4,
        gap: 14,
        elevation: 2,
    },
    totalBannerIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    totalBannerText: { flex: 1 },
    totalBannerLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    totalBannerValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    filterTab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
    },
    filterTabText: { fontSize: 12, fontWeight: '700' },
    urgencyBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        gap: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginBottom: 8,
    },
    urgencyBarText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 10,
        margin: 16,
        marginBottom: 0,
        borderRadius: 12,
        elevation: 4,
    },
    offlineBannerText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

