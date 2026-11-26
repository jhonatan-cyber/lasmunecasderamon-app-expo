import VirtualizedList from "@/components/shared/VirtualizedList";
import { contentColumn, tabBarBottomPadding } from "@/constants/layout";
import { FontFamily } from "@/constants/fonts";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import Ionicons from '@expo/vector-icons/Ionicons';
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
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import {
  VentaCard,
  VentaDetailModal,
  VentaAnulacionModal,
  VentaActionSheet,
  VentasSkeleton,
  VentaCardSkeleton,
  VentasFiltersModal,
  type VentasStatusFilter,
  type VentasPaymentFilter,
  type VentasSortBy,
  type VentasSortOrder,
} from '@/components/cajero/ventas';
import { parseDateSafe } from '@/utils/timeUtils';

const VENTA_SKELETON_ITEMS = [1, 2, 3, 4];

export default function VentasScreen() {
  const { accentColor, accentText, gradientColors, isDark, bg, cardBg, textPrimary, textSecondary, borderColor, semanticColors } = useAccentColor();
  const esAdmin = useIsAdmin();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsiveMetrics();
  const numColumns = isTablet ? 2 : 1;
  const { timers, serverOffset } = useTimer();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<VentasStatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = React.useState<VentasPaymentFilter>('all');
  const [sortBy, setSortBy] = React.useState<VentasSortBy>('fecha_crea');
  const [sortOrder, setSortOrder] = React.useState<VentasSortOrder>('desc');
  const [filtersVisible, setFiltersVisible] = React.useState(false);
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
  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (paymentFilter !== 'all' ? 1 : 0) +
    (sortBy !== 'fecha_crea' ? 1 : 0) +
    (sortOrder !== 'desc' ? 1 : 0);

  const clearFilters = React.useCallback(() => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setSortBy('fecha_crea');
    setSortOrder('desc');
  }, []);

  const listData = React.useMemo(
    () => {
      if (loadingSales) return VENTA_SKELETON_ITEMS;

      const base = activeTab === "historial" ? ventasList : processSales;
      const q = searchQuery.trim().toLowerCase();
      const filtered = base.filter((item: any) => {
        if (statusFilter !== 'all' && Number(item.estado) !== Number(statusFilter)) {
          return false;
        }
        if (
          paymentFilter !== 'all' &&
          String(item.metodo_pago || '').toLowerCase() !== paymentFilter
        ) {
          return false;
        }
        if (!q) return true;

        const id = getVentaId(item);
        const values = [
          id,
          item.codigo,
          item.servicio,
          item.habitacion,
          item.habitacion_id,
          item.cliente_nombre,
          item.usuarios_nicks,
          item.anfitrionas_nicks,
        ];
        return values.some((value) =>
          String(value ?? '').toLowerCase().includes(q),
        );
      });

      return [...filtered].sort((a: any, b: any) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortBy === 'total') {
          aValue = Number(a.total || 0);
          bValue = Number(b.total || 0);
        } else if (sortBy === 'fecha_crea') {
          aValue = parseDateSafe(a.fecha_crea).getTime() || 0;
          bValue = parseDateSafe(b.fecha_crea).getTime() || 0;
        } else {
          aValue = String(a[sortBy] ?? '').toLowerCase();
          bValue = String(b[sortBy] ?? '').toLowerCase();
        }

        if (aValue === bValue) return 0;
        const result = aValue > bValue ? 1 : -1;
        return sortOrder === 'asc' ? result : -result;
      });
    },
    [
      activeTab,
      loadingSales,
      processSales,
      ventasList,
      searchQuery,
      statusFilter,
      paymentFilter,
      sortBy,
      sortOrder,
      getVentaId,
    ],
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
        variant="pills"
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
        textSecondary={textSecondary}
        borderColor={borderColor}
        isTablet={isTablet}
        style={{ marginTop: 15, gap: 12 }}
      />

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            compact
            placeholder="Buscar código o cliente..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </View>
        <Pressable
          onPress={() => setFiltersVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Filtrar ventas${activeFilterCount ? `, ${activeFilterCount} filtros activos` : ''}`}
          style={[
            styles.filterBtn,
            {
              backgroundColor: activeFilterCount ? `${accentColor}18` : cardBg,
              borderColor: activeFilterCount ? accentColor : borderColor,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount ? accentColor : textPrimary}
          />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: accentColor }]}>
              <Text style={[styles.filterBadgeText, { color: accentText }]}>
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <VirtualizedList
        data={listData as any}
        keyExtractor={(item: any, index: number) =>
          String(getVentaId(item) ?? item?.codigo ?? `venta-${index}`)
        }
        renderItem={
          loadingSales
            ? () => <VentaCardSkeleton isTablet={isTablet} cardBg={cardBg} borderColor={borderColor} />
            : renderVentaCard
        }
        numColumns={numColumns}
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
            title={
              searchQuery || activeFilterCount > 0
                ? "No se encontraron ventas"
                : "No hay ventas registradas"
            }
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
            dangerColor={semanticColors.error}
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
            dangerColor={semanticColors.error}
          />

          <PremiumFAB
            icon={activeTab === "historial" ? "cart-outline" : "home-outline"}
            accessibilityLabel="Nueva venta"
            onPress={() => router.push("/cajero/nueva-venta")}
            visible={true}
          />
        </>
      )}

      <VentasFiltersModal
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        statusFilter={statusFilter}
        paymentFilter={paymentFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onStatusChange={setStatusFilter}
        onPaymentChange={setPaymentFilter}
        onSortByChange={setSortBy}
        onSortOrderChange={setSortOrder}
        onClear={clearFilters}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 10, fontFamily: FontFamily.black },
  listContainer: { ...contentColumn, paddingVertical: 16, paddingHorizontal: 16, paddingBottom: tabBarBottomPadding },
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
});
