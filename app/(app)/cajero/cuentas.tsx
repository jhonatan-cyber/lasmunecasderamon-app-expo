import { Ionicons } from "@expo/vector-icons";
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumFAB } from '@/components/ui/PremiumFAB';
import { CuentasOverlays } from '@/components/cajero/CuentasOverlays';
import type { CuentaDetalle } from '@/hooks/types/cuentaTypes';
import { CuentasSkeleton } from '@/components/cajero/cuentas/CuentasSkeleton';
import { Colors } from '@/constants/theme';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCuentasScreen } from '@/hooks/useCuentasScreen';
import { CuentaCard } from '@/components/cajero/cuentas/CuentaCard';

const FlashList = ShopifyFlashList as any;

export default function CuentasScreen() {
  const { accentColor, gradientColors, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const C = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const screen = useCuentasScreen();
  const {
    loading,
    refreshing,
    cuentas,
    resumen,
    activeTab,
    search,
    filteredCuentas,
    pendingCount,
    timers,
    serverOffset,
    setActiveTab,
    setSearch,
    setActionSheetVisible,
    onRefresh,
    fetchCuentas,
    handleCobrarCuenta,
    handleFinalizarTemporizador,
    handleSolicitarAnulacion,
    modalVisible,
    actionSheetVisible,
    cobroModalVisible,
  } = screen;



  const renderCuentaCard = useCallback(
    ({ item }: { item: CuentaDetalle }) => {
      return (
        <CuentaCard
          item={item}
          timers={timers}
          serverOffset={serverOffset}
          accentColor={accentColor}
          isDark={isDark}
          cardBg={cardBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          borderColor={borderColor}
          themeColors={{ danger: C.danger, warning: C.warning }}
          router={router}
          handleCobrarCuenta={handleCobrarCuenta}
          handleFinalizarTemporizador={handleFinalizarTemporizador}
          handleSolicitarAnulacion={handleSolicitarAnulacion}
          setActionSheetVisible={setActionSheetVisible}
        />
      );
    },
    [
      cardBg,
      borderColor,
      textPrimary,
      textSecondary,
      handleCobrarCuenta,
      handleFinalizarTemporizador,
      handleSolicitarAnulacion,
      setActionSheetVisible,
      timers,
      serverOffset,
      accentColor,
      isDark,
      router,
      C.danger,
      C.warning,
    ],
  );

  if (loading && !refreshing && cuentas.length === 0) {
    return (
      <CuentasSkeleton
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
      <StatusBar style={isDark ? "light" : "dark"} />

      <PremiumHeader
        title="Cuentas"
        subtitle={activeTab === "historial" ? "Historial de transacciones" : "Cuentas por cobrar"}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <TouchableOpacity onPress={() => fetchCuentas(true)} style={styles.backBtnRight}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Pressable onPress={() => router.back()} style={styles.backBtnRight}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backTextHeader}>Atrás</Text>
            </Pressable>
          </View>
        }
      />

      <View style={styles.content}>
        <View style={[styles.searchOuter, { backgroundColor: isDark ? "#111111" : "#FFFFFF" }]}>
          <View style={[styles.searchContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
            <Ionicons name="search" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
            <TextInput
              style={[styles.searchInput, { color: isDark ? "#FFFFFF" : "#111827" }]}
              placeholder="Buscar por código o cliente..."
              placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={isDark ? "#4B5563" : "#9CA3AF"} />
              </Pressable>
            )}
          </View>

          <View style={styles.summaryContainer}>
            <View style={[styles.summaryPill, { backgroundColor: `${accentColor}10` }]}>
              <Ionicons name="wallet-outline" size={14} color={accentColor} />
              <Text style={styles.summaryLabel}>POR COBRAR</Text>
              <Text style={[styles.summaryValue, { color: accentColor }]}>
                ${(resumen?.total_por_cobrar || 0).toLocaleString()}
              </Text>
            </View>
            <View style={[styles.summaryPill, { backgroundColor: `${C.success}10` }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={C.success} />
              <Text style={styles.summaryLabel}>PRODUCTOS</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {resumen?.total_cuentas || 0}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.tabContainer,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                marginTop: 15,
                padding: 4,
                borderRadius: 14,
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                borderWidth: 1
              }
            ]}
          >
            <Pressable
              style={[styles.tab, activeTab === "historial" && { backgroundColor: accentColor }]}
              onPress={() => setActiveTab("historial")}
            >
              <Text style={[styles.tabText, activeTab === "historial" ? { color: "#FFF" } : { color: textSecondary }]}>Todas</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === "pendientes" && { backgroundColor: accentColor }]}
              onPress={() => setActiveTab("pendientes")}
            >
              <View style={styles.tabWithBadge}>
                <Text style={[styles.tabText, activeTab === "pendientes" ? { color: "#FFF" } : { color: textSecondary }]}>Pendientes</Text>
                {pendingCount > 0 && (
                  <View style={[styles.tabBadge, activeTab === 'pendientes' ? { backgroundColor: '#FFF' } : { backgroundColor: accentColor }]}>
                    <Text style={[styles.tabBadgeText, activeTab === 'pendientes' ? { color: accentColor } : { color: '#FFF' }]}>
                      {pendingCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>
        </View>

        <FlashList
          data={filteredCuentas}
          extraData={timers}
          renderItem={renderCuentaCard}
          numColumns={numColumns}
          estimatedItemSize={150}
          contentContainerStyle={[
            styles.listContainer,
            isTablet ? { paddingHorizontal: 12 } : undefined,
          ]}
          keyExtractor={(item: any, index: number) =>
            item.id_cuenta ? item.id_cuenta.toString() : index.toString()
          }
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
                No hay cuentas registradas
              </Text>
              <Text style={[styles.emptySub, { color: textSecondary }]}>
                Las cuentas aparecerán cuando las crees en el registro.
              </Text>
            </View>
          }
        />
      </View>

      <PremiumFAB
        label="nueva cuenta"
        icon="add"
        onPress={() => router.push('/cajero/nueva-cuenta')}
        visible={!modalVisible && !actionSheetVisible && !cobroModalVisible}
      />

      <CuentasOverlays
        screen={screen}
        styles={styles}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backTextHeader: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  content: { flex: 1 },
  searchOuter: {
    padding: 16,
    paddingTop: 10,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 10,
    marginBottom: 5,
  },
  searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      height: 50,
      borderRadius: 16,
      gap: 10,
  },
  searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
  },
  summaryContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginTop: 15
  },
  summaryPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      gap: 8,
      justifyContent: 'center'
  },
  summaryLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, opacity: 0.7 },
  summaryValue: { fontSize: 14, fontWeight: '900' },
  listContainer: { padding: 16, paddingBottom: 100 },
  tabContainer: {
    flexDirection: "row",
    marginTop: 20,
    borderRadius: 9999,
    padding: 4,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
  tabText: { fontSize: 14, fontWeight: "700" },
  tabWithBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  tabBadgeText: { color: "#E11D48", fontSize: 11, fontWeight: "900" },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  detailModal: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    height: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitleText: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  modalSubText: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: "rgba(128,128,128,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
    paddingVertical: 10,
  },
  gridItem: { width: "47%", marginBottom: 12 },
  gridLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  gridValue: { fontSize: 15, fontWeight: "700" },
  hostessSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  hostessBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hostessBadgeDetail: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  hostessTextDetail: { fontSize: 13, fontWeight: "800", color: "#E11D48" },
  tableContainer: {
    borderRadius: 9999,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  tableHead: { fontSize: 12, fontWeight: "800" },
  tableRow: {
    flexDirection: "row",
    padding: 14,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  productName: { fontSize: 14, fontWeight: "800" },
  productQty: { fontSize: 14, fontWeight: "600" },
  productPrice: { fontSize: 14, fontWeight: "600" },
  productSubtotal: { fontSize: 14, fontWeight: "900" },
  summarySection: { padding: 10 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabelFinal: { fontSize: 18, fontWeight: "900" },
  totalValFinal: { fontSize: 24, fontWeight: "900", color: '#E11D48' },
  modalCloseBtn: {
    height: 56,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  modalCloseBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  actionSheet: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  actionSheetHeader: { alignItems: "center", marginBottom: 24 },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 16,
  },
  actionSheetTitle: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
  actionSheetSub: { fontSize: 14, fontWeight: "500" },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  actionItemPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionText: { fontSize: 16, fontWeight: "700" },
  actionCancelBtn: {
    marginTop: 8,
    height: 56,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  actionCancelText: { fontSize: 16, fontWeight: "800" },

  infoBannerCobro: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  summaryRowCobro: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  summaryLabelCobro: { fontSize: 14, fontWeight: "600" },
  summaryValCobro: { fontSize: 16, fontWeight: "800" },
  dividerCobro: { height: 1, marginVertical: 12 },
  totalLabelCobro: { fontSize: 18, fontWeight: "900" },
  totalValCobro: { fontSize: 24, fontWeight: "900", color: "#10B981" },
  cobrarSubmitBtn: {
    height: 60,
    borderRadius: 9999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  cobrarSubmitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  cobrarCancelBtn: {
    height: 56,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  cobrarCancelBtnText: { fontSize: 16, fontWeight: "800" },
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
  
  distribucionSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  distribucionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distribucionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distribucionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distribucionAvatarText: {
    fontSize: 13,
    fontWeight: '900',
  },
  distribucionNick: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  distribucionMonto: {
    fontSize: 15,
    fontWeight: '900',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  habitacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  tiempoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  tiempoText: { fontSize: 12, fontWeight: '800' },
  origenSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  origenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  origenIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  origenType: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  origenPersonas: { gap: 3 },
  origenPersonaLabel: { fontSize: 13, fontWeight: '500' },
  origenPersonaValue: { fontWeight: '700' },
});
