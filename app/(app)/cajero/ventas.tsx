import { Ionicons } from "@expo/vector-icons";
import FlashList from "@/components/shared/FlashList";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumFAB } from '@/components/ui/PremiumFAB';
import { useTimer } from '@/context/TimerContext';
import { useVentasScreen } from '@/hooks/useVentasScreen';
import { Colors } from '@/constants/theme';
import { useAccentColor } from '@/hooks/useAccentColor';
import {
  VentaCard,
  VentaDetailModal,
  VentaAnulacionModal,
  VentaActionSheet,
  VentaTabs,
  VentasSkeleton,
  VentaCardSkeleton,
} from '@/components/cajero/ventas';

export default function VentasScreen() {
  const { accentColor, gradientColors, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const { timers, serverOffset } = useTimer();
  const {
    loading,
    refreshing,
    ventasList,
    loadingSales,
    selectedVenta,
    loadingDetail,
    modalVisible,
    actionSheetVisible,
    activeVenta,
    anulacionModalVisible,
    motivoAnulacion,
    montoAnulacion,
    anulandoVenta,
    activeTab,
    alertConfig,
    onRefresh,
    setActiveTab,
    setAlertConfig,
    setModalVisible,
    setActionSheetVisible,
    setMotivoAnulacion,
    setMontoAnulacion,
    handleOpenActionSheet,
    handleVerDetalles,
    handleFinalizarVenta,
    handleAnularVenta,
    openAnulacionModal,
    closeAnulacionModal,
    formatMontoInput,
    getVentaId,
  } = useVentasScreen();

  const C = Colors[isDark ? 'dark' : 'light'];


  const renderVentaCard = ({ item }: { item: any }) => {
    return (
      <VentaCard
        item={item}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
        onPress={handleOpenActionSheet}
        onFinalizar={handleFinalizarVenta}
        timers={timers}
        serverOffset={serverOffset}
        getVentaId={getVentaId}
      />
    );
  };

  if (loading) {
    return (
      <VentasSkeleton
        bg={bg}
        cardBg={cardBg}
        borderColor={borderColor}
        gradientColors={gradientColors}
        insets={insets}
        isTablet={isTablet}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? 'dark' : 'light'} />
      <PremiumHeader
        title="Ventas"
        subtitle={activeTab === "historial" ? "Historial de transacciones" : "Ventas activas en tiempo real"}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <TouchableOpacity onPress={onRefresh} style={styles.backBtnRight}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Pressable onPress={() => router.replace("/cajero/(tabs)" as any)} style={styles.backBtnRight}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backTextRight}>Atrás</Text>
            </Pressable>
          </View>
        }
      />

      <VentaTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={accentColor}
        isDark={isDark}
        isTablet={isTablet}
        activeTimerCount={timers.filter((t) => t.tipoTransaccion === "venta").length}
      />

      <FlashList
        data={
          loadingSales
            ? [1, 2, 3, 4] as any
            : (activeTab === "historial"
              ? ventasList
              : ventasList.filter(
                (v) =>
                  v.estado === 2 ||
                  timers.some(
                    (t) =>
                      t.tipoTransaccion === "venta" &&
                      (t.servicioId === getVentaId(v) ||
                        (t.roomId === v.habitacion_id && v.estado === 2)),
                  ),
              ))
        }
        renderItem={loadingSales ? VentaCardSkeleton : renderVentaCard}
        numColumns={numColumns}
        estimatedItemSize={120}
        ListHeaderComponent={null}
        contentContainerStyle={[styles.listContainer, isTablet && { paddingHorizontal: 12 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { borderColor }]}>
            <Ionicons name="receipt-outline" size={64} color={textSecondary} />
            <Text style={[styles.emptyText, { color: textPrimary }]}>
              No hay ventas registradas
            </Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>
              Las ventas aparecerán conforme se procesen los pagos.
            </Text>
          </View>
        }
      />

      <VentaDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        loadingDetail={loadingDetail}
        selectedVenta={selectedVenta}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
      />

      <VentaAnulacionModal
        visible={anulacionModalVisible}
        onClose={closeAnulacionModal}
        activeVenta={activeVenta}
        montoAnulacion={montoAnulacion}
        onMontoChange={(value) => setMontoAnulacion(formatMontoInput(value))}
        motivoAnulacion={motivoAnulacion}
        onMotivoChange={setMotivoAnulacion}
        anulandoVenta={anulandoVenta}
        onAnular={handleAnularVenta}
        formatMontoInput={formatMontoInput}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
        dangerColor={C.danger}
      />

      <VentaActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        activeVenta={activeVenta}
        onVerDetalles={() => {
          const ventaId = getVentaId(activeVenta);
          if (ventaId) handleVerDetalles(ventaId);
        }}
        onSolicitarAnulacion={openAnulacionModal}
        accentColor={accentColor}
        cardBg={cardBg}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        dangerColor={C.danger}
      />

      <PremiumFAB
        label={activeTab === "historial" ? "NUEVA VENTA" : "NUEVO SERVICIO"}
        icon={activeTab === "historial" ? "cart-outline" : "add"}
        onPress={() => router.push(activeTab === "historial" ? "/cajero/nueva-venta" : "/cajero/nuevo-servicio")}
        visible={true}
      />

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel || (() => setAlertConfig((prev) => ({ ...prev, visible: false })))}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText || "Confirmar"}
        cancelText="Cancelar"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100 },
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
  emptyCard: {
    borderRadius: 32,
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginTop: 40,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.7,
  },
});
