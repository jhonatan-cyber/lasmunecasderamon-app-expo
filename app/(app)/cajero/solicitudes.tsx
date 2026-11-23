import Ionicons from "@expo/vector-icons/Ionicons";
import VirtualizedList from "@/components/shared/VirtualizedList";
import { contentColumn, tabBarBottomPadding } from "@/constants/layout";
import { FontFamily } from "@/constants/fonts";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AnimatedView } from "@/components/ui/AnimatedView";
import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { SolicitudesSkeleton } from "@/components/cajero/solicitudes/SolicitudesSkeleton";

import { CheckoutModal } from "@/components/cajero/CheckoutModal";
import { OfflineStatusBanner } from "@/components/offline/OfflineStatusBanner";
import { ServiceModal } from "@/components/cajero/ServiceModal";
import { SolicitudCard } from "@/components/cajero/SolicitudCard";
import type { SolicitudItem } from "@/hooks/types/solicitudesTypes";
import { useSolicitudes } from "@/hooks/useSolicitudes";
import { useSolicitudesActions } from "@/hooks/useSolicitudesActions";

export default function SolicitudesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsiveMetrics();
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
    isOffline,
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

  const [activeFilter, setActiveFilter] = useState<
    "all" | "anticipo" | "pedido" | "solicitud"
  >("all");

  const counts = React.useMemo(() => {
    const result = {
      all: solicitudes.length,
      anticipo: 0,
      pedido: 0,
      solicitud: 0,
    };
    for (const solicitud of solicitudes) result[solicitud.tipoItem] += 1;
    return result;
  }, [solicitudes]);

  const { totalAPagar, filteredSolicitudes } = React.useMemo(() => {
    let filtered = solicitudes;
    if (activeFilter !== "all") {
      filtered = solicitudes.filter((s) => s.tipoItem === activeFilter);
    }
    const total = filtered
      .filter((s: SolicitudItem) => s.tipoItem === "anticipo" && s.estado !== 0)
      .reduce(
        (sum: number, s: SolicitudItem) => sum + (Number(s.monto) || 0),
        0,
      );
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
    borderColor, accentOnSurface} = useAccentColor();

  const renderSolicitud = useCallback(
    ({ item }: { item: SolicitudItem }) => (
      <View
        style={[styles.cardWrapper, numColumns > 1 && styles.cardWrapperGrid]}
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
    ),
    [
      accentColor,
      textPrimary,
      textSecondary,
      cardBg,
      borderColor,
      serverOffset,
      cajaAbierta,
      handleAprobar,
      handleRechazar,
      numColumns,
      nowTick,
      setSelectedService,
      setServiceModalVisible,
    ],
  );

  if (loading) {
    return (
      <SolicitudesSkeleton
        bg={bg}
        cardBg={cardBg}
        borderColor={borderColor}
        insets={insets}
        isTablet={isTablet}
        gradientColors={gradientColors}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? "light" : "dark"} />

      <PremiumHeader
        title="Solicitudes"
        subtitle={!cajaAbierta ? "Caja cerrada" : "Pendientes de aprobación"}
        connectionStatus={{
          isConnected: !isOffline,
          label: isOffline ? "Modo Offline" : "En Línea",
        }}
        onBack={() => router.back()}
      />

      <OfflineStatusBanner
        pendientesHref={"/(app)/cajero/pendientes" as never}
      />

      {totalAPagar > 0 && (
        <AnimatedView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={[
            styles.totalBanner,
            {
              backgroundColor: cardBg,
              borderColor,
              borderLeftColor: accentColor,
            },
          ]}
        >
          <View
            style={[
              styles.totalBannerIcon,
              { backgroundColor: `${accentColor}20` },
            ]}
          >
            <Ionicons name="cash-outline" size={22} color={accentOnSurface} />
          </View>
          <View style={styles.totalBannerText}>
            <Text style={[styles.totalBannerLabel, { color: textSecondary }]}>
              TOTAL A PAGAR EN ANTICIPOS
            </Text>
            <Text style={[styles.totalBannerValue, { color: accentOnSurface }]}>
              ${totalAPagar.toLocaleString()}
            </Text>
          </View>
        </AnimatedView>
      )}

      <FilterTabs
        scrollable
        tabs={[
          { key: "all", label: "Todas", count: counts.all },
          { key: "anticipo", label: "Anticipos", count: counts.anticipo },
          { key: "pedido", label: "Pedidos", count: counts.pedido },
          { key: "solicitud", label: "Servicios", count: counts.solicitud },
        ]}
        activeKey={activeFilter}
        onTabPress={setActiveFilter}
        accentColor={accentColor}
        cardBg={cardBg}
        textSecondary={textSecondary}
        borderColor={borderColor}
      />

      <VirtualizedList
        data={filteredSolicitudes}
        keyExtractor={(item: SolicitudItem) => item.id_unificado}
        renderItem={renderSolicitud}
        extraData={`${nowTick}-${activeFilter}`}
        estimatedItemSize={120}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.listContainer}
        drawDistance={500}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        ListEmptyComponent={
          <View
            style={[styles.emptyCard, { backgroundColor: cardBg, borderColor }]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color={accentOnSurface}
              style={{ marginBottom: 12 }}
            />
            <Text style={[styles.emptyText, { color: textPrimary }]}>
              {!cajaAbierta
                ? "Caja Cerrada"
                : activeFilter !== "all"
                  ? `Sin ${activeFilter === "anticipo" ? "anticipos" : activeFilter === "pedido" ? "pedidos" : "servicios"} pendientes`
                  : "Todo al día"}
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
        onAprobar={(id, tipo, producto) =>
          handleAprobar(id, tipo as any, selectedService || undefined, producto)
        }
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
        onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        showCancel
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtnRight: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    gap: 6,
  },
  backTextRight: {
    fontFamily: FontFamily.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  listContainer: { ...contentColumn, padding: 16, paddingBottom: tabBarBottomPadding },
  cardWrapper: { paddingBottom: 16 },
  cardWrapperGrid: { flex: 1, paddingHorizontal: 8 },
  columnWrapper: { marginHorizontal: -8 },
  cardSkeleton: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginTop: 40,
    borderStyle: "dashed",
  },
  emptyText: { fontSize: 18, fontFamily: FontFamily.extrabold, marginBottom: 4 },
  emptySub: { fontSize: 14, fontFamily: FontFamily.medium },
  totalBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
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
    justifyContent: "center",
    alignItems: "center",
  },
  totalBannerText: { flex: 1 },
  totalBannerLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  totalBannerValue: { fontSize: 24, fontFamily: FontFamily.black, letterSpacing: -0.5 },
});
