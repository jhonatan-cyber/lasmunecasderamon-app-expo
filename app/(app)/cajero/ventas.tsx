import VirtualizedList from "@/components/shared/VirtualizedList";
import { contentColumn } from "@/constants/layout";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  RefreshControl,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { OfflineStatusBanner } from '@/components/offline/OfflineStatusBanner';
import { PremiumFAB } from '@/components/ui/PremiumFAB';
import { Tabs } from '@/components/ui/Tabs';
import { useTimer } from '@/context/TimerContext';
import { useVentasScreen } from '@/hooks/useVentasScreen';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Colors } from '@/constants/theme';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import {
  VentaCard,
  VentaDetailModal,
  VentaAnulacionModal,
  VentaActionSheet,
  VentasSkeleton,
  VentaCardSkeleton,
} from '@/components/cajero/ventas';

const VENTA_SKELETON_ITEMS = [1, 2, 3, 4];

export default function VentasScreen() {
  const { accentColor, accentText, gradientColors, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const esAdmin = useIsAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsiveMetrics();
  const numColumns = isTablet ? 2 : 1;
  const { timers, serverOffset } = useTimer();
  const [searchQuery, setSearchQuery] = React.useState('');
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
    fromCache,
  } = useVentasScreen();

  const C = Colors[isDark ? 'dark' : 'light'];


  const activeVentaTimers = React.useMemo(
    () => timers.filter((timer) => timer.tipoTransaccion === "venta"),
    [timers],
  );
  const activeTimerServiceIds = React.useMemo(
    () => new Set(activeVentaTimers.map((timer) => String(timer.servicioId))),
    [activeVentaTimers],
  );
  const processSales = React.useMemo(
    () => ventasList.filter((venta) =>
      venta.estado === 2 || activeTimerServiceIds.has(String(getVentaId(venta))),
    ),
    [activeTimerServiceIds, getVentaId, ventasList],
  );
  const listData = React.useMemo(
    () => {
      let data: any[];
      if (loadingSales) {
        data = VENTA_SKELETON_ITEMS;
      } else {
        data = activeTab === "historial" ? ventasList : processSales;
      }
      if (!searchQuery.trim()) return data;
      const q = searchQuery.toLowerCase();
      return data.filter((item: any) => {
        const id = getVentaId(item);
        const servicio = item.servicio || '';
        const habitacion = item.habitacion || item.habitacion_id || '';
        return String(id).includes(q) || String(servicio).toLowerCase().includes(q) || String(habitacion).toLowerCase().includes(q);
      });
    },
    [activeTab, loadingSales, processSales, ventasList, searchQuery, getVentaId],
  );
  const handleCardPress = React.useCallback(
    (item: any) => {
      if (!esAdmin) {
        handleOpenActionSheet(item);
        return;
      }
      const ventaId = getVentaId(item);
      if (ventaId) handleVerDetalles(ventaId);
    },
    [esAdmin, getVentaId, handleOpenActionSheet, handleVerDetalles],
  );

  const renderVentaCard = React.useCallback(({ item }: { item: any }) => {
    return (
      <VentaCard
        item={item}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
        onPress={handleCardPress}
        onFinalizar={esAdmin ? undefined : handleFinalizarVenta}
        timers={timers}
        serverOffset={serverOffset}
        getVentaId={getVentaId}
      />
    );
  }, [accentColor, borderColor, cardBg, esAdmin, getVentaId, handleCardPress, handleFinalizarVenta, isDark, serverOffset, timers, textPrimary, textSecondary]);

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
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <PremiumHeader
        title="Ventas"
        subtitle={
          fromCache
            ? "Datos guardados en el dispositivo"
            : activeTab === "historial"
              ? "Historial de transacciones"
              : "Ventas activas en tiempo real"
        }
        connectionStatus={fromCache ? { isConnected: false, label: 'Modo Offline' } : undefined}
        onBack={() => router.replace("/cajero/(tabs)" as any)}
      />

      <OfflineStatusBanner pendientesHref={'/(app)/cajero/pendientes' as never} />

      <Tabs
        tabs={[
          { key: 'historial', label: 'Listado de Ventas' },
          {
            key: 'proceso',
            label: 'Ventas con Habitación',
            count: activeVentaTimers.length || undefined,
          },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
        accentColor={accentColor}
        accentText={accentText}
        cardBg={cardBg}
        textSecondary={textPrimary}
        borderColor={borderColor}
        isTablet={isTablet}
        style={{ marginTop: 15, gap: 12 }}
      />

      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <SearchBar
          placeholder="Buscar por código o habitación..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      </View>

      <VirtualizedList
        data={listData as any}
        renderItem={loadingSales ? VentaCardSkeleton : renderVentaCard}
        numColumns={numColumns}
        ListHeaderComponent={null}
        contentContainerStyle={[styles.listContainer, isTablet && { paddingHorizontal: 12 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        windowSize={10}
        maxToRenderPerBatch={7}
        initialNumToRender={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title={searchQuery ? "No se encontraron ventas" : "No hay ventas registradas"}
            message={searchQuery ? "Intenta con otros términos de búsqueda" : "Las ventas aparecerán conforme se procesen los pagos."}
          />
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

      {!esAdmin && (
        <>
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
            icon={activeTab === "historial" ? "cart-outline" : "home-outline"}
            onPress={() => router.push("/cajero/nueva-venta")}
            visible={true}
          />
        </>
      )}

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
  listContainer: { ...contentColumn, paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100 },
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
});
