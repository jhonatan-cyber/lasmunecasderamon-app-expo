import { Ionicons } from "@expo/vector-icons";
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
import {
  Stack,
  useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback } from "react";
import { MotiView } from "moti";
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
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumFAB } from '@/components/ui/PremiumFAB';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CuentaTimer } from '@/components/cajero/CuentaTimer';
import { CuentasOverlays } from '@/components/cajero/CuentasOverlays';
import { CuentasSkeleton } from '@/components/cajero/cuentas/CuentasSkeleton';
import { Colors } from '@/constants/theme';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useCuentasScreen } from '@/hooks/useCuentasScreen';
import { calculateRemainingTime, parseDateSafe } from '@/utils/timeUtils';

const FlashList = ShopifyFlashList as any;

const statusColors: Record<number, string> = {
  0: "#10B981", 
  1: "#fa2828ff", 
  2: "#F59E0B", 
  3: "#6B7280", 
  4: "#FB923C", 
};

const statusLabels: Record<number, string> = {
  0: "Cobrado",
  1: "Pendiente",
  2: "Solicitud Anul.",
  3: "Anulado",
  4: "Anul. Parcial",
};

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  prepago: "Prepago",
  mixto: "Mixto",
};

export default function CuentasScreen() {
  const { accentColor, gradientColors, isDark, bg, cardBg, textPrimary, textSecondary } = useAccentColor();
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

  const borderColor = isDark ? `${accentColor}40` : "rgba(0,0,0,0.05)";

  const renderCuentaCard = useCallback(
    ({ item }: { item: any }) => {
      const productCount =
        item.total_detalles ||
        (item.detalles
          ? item.detalles.reduce((acc: number, d: any) => acc + d.cantidad, 0)
          : 0);
      const statusValue = Number(item.estado);
      const activeTime = Number(item.tiempo_activo ?? item.tiempo ?? 0);

      const statusColor = statusColors[statusValue] || "#6B7280";

      const isPending = statusValue === 1;
      const isPartialPending = statusValue === 4;
      const hasTimer = isPending && activeTime > 0 && item.habitacion_id;
      const timer = hasTimer
        ? timers.find(
            (t) =>
              t.tipoTransaccion === "cuenta" &&
              String(t.servicioId) === String(item.id_cuenta),
          )
        : null;

      const isOverdue = hasTimer && timer ? calculateRemainingTime(timer, serverOffset) <= 0 : false;
      const paymentMethodText = item.metodo_pago
        ? (paymentMethodLabels[String(item.metodo_pago).toLowerCase()] || item.metodo_pago)
        : null;
      const financeText =
        statusValue === 1
          ? "Por cobrar"
          : statusValue === 0
            ? (paymentMethodText || "Cobrado")
            : statusValue === 2
              ? "Solicitud de anulacion"
              : statusValue === 4
                ? "Saldo pendiente"
              : "Anulado";

      const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return "";
        const date = parseDateSafe(dateStr);
        return date.toLocaleString("es-ES", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true
        }).replace(/,/g, '');
      };

      const statusText = statusLabels[statusValue] || "Desconocido";

      return (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 500 }}
        >
          <Pressable
            onPress={() =>
              setActionSheetVisible(true, item)
            }
            style={({ pressed }) => [{
              flex: 1, borderRadius: 24, padding: 16, borderWidth: 1,
              marginBottom: 16, marginHorizontal: 8,
              backgroundColor: cardBg,
              borderColor: isOverdue ? C.danger : borderColor,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            }]}
          >
            {}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: accentColor + '15' }}>
                  <Ionicons name="receipt" size={18} color={accentColor} />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', letterSpacing: -0.5, color: textPrimary }}>
                    {item.habitacion_nombre || item.habitacion_numero || "Barra / General"}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary }}>
                    Codigo : #{item.codigo}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: textSecondary, marginTop: 2 }}>
                    {formatDateTime(item.fecha_crea)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, gap: 4, backgroundColor: statusColor + '10' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
                <Text style={{ fontSize: 10, fontWeight: '900', color: statusColor }}>{statusText}</Text>
              </View>
            </View>

            {}
            <View style={{ gap: 8, marginBottom: 16, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="person" size={14} color={textSecondary} />
                <Text style={{ fontSize: 12, flex: 1, color: textPrimary }}>
                  <Text style={{ fontWeight: '800' }}>Cliente: </Text>
                  {item.cliente_nombre || "Sin registrar"}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="cube" size={14} color={textSecondary} />
                <Text style={{ fontSize: 12, flex: 1, color: textPrimary }}>
                  <Text style={{ fontWeight: '800' }}>Productos: </Text>
                  {productCount} item{productCount !== 1 ? "s" : ""}
                </Text>
              </View>
              {item.creador_nombre && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="create-outline" size={14} color={textSecondary} />
                  <Text style={{ fontSize: 12, flex: 1, color: textPrimary }}>
                    <Text style={{ fontWeight: '800' }}>Registrado por: </Text>
                    {item.creador_nombre}
                  </Text>
                </View>
              )}
            </View>

            {}
            {hasTimer && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12,
                backgroundColor: isOverdue ? `${C.danger}15` : `${accentColor}08`,
              }}>
                <Ionicons name="time" size={24} color={isOverdue ? C.danger : accentColor} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: textSecondary }}>TIEMPO RESTANTE</Text>
                  {timer ? (
                    <CuentaTimer timer={timer} serverOffset={serverOffset} accentColor={accentColor} />
                  ) : (
                    <Text style={{ fontSize: 24, fontWeight: '900', color: textSecondary }}>--:--</Text>
                  )}
                </View>
                <View style={{ flex: 1 }} />
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 0.5, color: textSecondary }}>TOTAL {activeTime} MIN</Text>
                </View>
              </View>
            )}

            {}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(156, 163, 175, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Ionicons name="card-outline" size={12} color={textSecondary} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: textSecondary }}>
                  {financeText}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary }}>TOTAL</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: textPrimary }}>${item.total.toLocaleString()}</Text>
              </View>
            </View>

            {isPartialPending && (
              <View
                style={{
                  marginTop: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(251, 146, 60, 0.35)" : "#FDBA74",
                  backgroundColor: isDark ? "rgba(251, 146, 60, 0.12)" : "#FFF7ED",
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: "#F59E0B", fontWeight: '800', fontSize: 12 }}>
                  SALDO RESTANTE
                </Text>
                <Text style={{ color: "#F59E0B", fontWeight: '900', fontSize: 18 }}>
                  ${Number(item.total || 0).toLocaleString("es-CL")}
                </Text>
              </View>
            )}

            {}
            {isPending && (
              <View style={{ gap: 10, marginTop: 15 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {hasTimer && (
                    <Pressable
                      style={({ pressed }) => [{
                        flex: 1, height: 44, borderRadius: 12,
                        justifyContent: 'center', alignItems: 'center',
                        flexDirection: 'row', gap: 6,
                        backgroundColor: isDark ? `${C.warning}24` : '#FFF7ED',
                        borderWidth: 1, borderColor: `${C.warning}55`,
                        opacity: pressed ? 0.7 : 1,
                      }]}
                      onPress={() => handleFinalizarTemporizador(item)}
                    >
                      <Ionicons name="stop-circle-outline" size={16} color={C.warning} />
                      <Text style={{ color: '#F59E0B', fontWeight: '900', fontSize: 12 }}>FINALIZAR</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={({ pressed }) => [{
                      flex: 1, height: 44, borderRadius: 12,
                      justifyContent: 'center', alignItems: 'center',
                      flexDirection: 'row', gap: 6,
                      backgroundColor: isDark ? `${C.danger}24` : '#FEF2F2',
                      borderWidth: 1, borderColor: `${C.danger}55`,
                      opacity: pressed ? 0.7 : 1,
                    }]}
                    onPress={() => handleSolicitarAnulacion(item)}
                  >
                    <Ionicons name="ban-outline" size={16} color={C.danger} />
                    <Text style={{ color: '#EF4444', fontWeight: '900', fontSize: 12 }}>ANULAR</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  style={({ pressed }) => [{
                    flex: 1, height: 44, borderRadius: 12,
                    justifyContent: 'center', alignItems: 'center',
                    flexDirection: 'row', gap: 6,
                    backgroundColor: `${accentColor}10`,
                    borderWidth: 1, borderColor: `${accentColor}30`,
                    opacity: pressed ? 0.7 : 1,
                  }]}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/cajero/agregar-cuenta",
                      params: { cuenta: JSON.stringify(item) },
                    })
                  }
                >
                  <Ionicons name="add" size={16} color={accentColor} />
                  <Text style={{ color: accentColor, fontWeight: '900', fontSize: 13 }}>AGREGAR</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [{
                    flex: 1, height: 44, borderRadius: 12,
                    justifyContent: 'center', alignItems: 'center',
                    flexDirection: 'row', gap: 6,
                    backgroundColor: accentColor,
                    elevation: 2,
                    shadowColor: accentColor, shadowOpacity: 0.3,
                    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
                    opacity: pressed ? 0.7 : 1,
                  }]}
                  onPress={() => handleCobrarCuenta(item)}
                >
                  <Ionicons name="cash-outline" size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>COBRAR</Text>
                </Pressable>
                </View>
              </View>
            )}

            {isPartialPending && (
              <View style={{ gap: 10, marginTop: 15 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    style={({ pressed }) => [{
                      flex: 1, height: 44, borderRadius: 12,
                      justifyContent: 'center', alignItems: 'center',
                      flexDirection: 'row', gap: 6,
                      backgroundColor: accentColor,
                      elevation: 2,
                      shadowColor: accentColor, shadowOpacity: 0.3,
                      shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
                      opacity: pressed ? 0.7 : 1,
                    }]}
                    onPress={() => handleCobrarCuenta(item)}
                  >
                    <Ionicons name="cash-outline" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>COBRAR SALDO</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        </MotiView>
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
  if (loading && !refreshing && cuentas.length === 0)
    return <CuentasSkeleton bg={bg} cardBg={cardBg} borderColor={borderColor} gradientColors={gradientColors} insets={insets} isTablet={isTablet} />;

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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    height: 44,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(155,155,155,0.1)',
  },
  backText: {
    fontWeight: '800',
    fontSize: 14,
  },
  plusBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  headerTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: "600", opacity: 0.8 },
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



  
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  cardAccentBar: { height: 4, width: "100%" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  cardCode: { fontSize: 16, fontWeight: "900", letterSpacing: 0.8 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardInfoGrid: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  cardInfoCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "rgba(128,128,128,0.05)",
  },
  cardInfoIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfoLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardInfoValue: { fontSize: 13, fontWeight: "700", marginTop: 1 },
  cardTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardTimerSync: { fontSize: 12, fontWeight: "600", flex: 1 },
  cardTimerTotal: { fontSize: 11, fontWeight: "600", marginLeft: "auto" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
  },
  cardTotalBig: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  cardSubCount: { fontSize: 11, fontWeight: "600", marginTop: 2, opacity: 0.7 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardActionBtn: {
    height: 38,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  cardActionBtnAdd: {
    paddingHorizontal: 12,
    backgroundColor: "#3B82F610",
    borderWidth: 1,
    borderColor: "#3B82F630",
  },
  cardActionBtnAddText: { color: "#3B82F6", fontSize: 13, fontWeight: "800" },
  cardActionBtnCobrar: {
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardActionBtnCobrarText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  
  cardMainRow: { flexDirection: "row", justifyContent: "space-between" },
  cardLeftContent: { flex: 1.2 },
  cardTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statusBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardDetailsList: { gap: 6 },
  detailItemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowIcon: { width: 16, textAlign: "center" },
  detailValue: { fontSize: 14, fontWeight: "600" },
  cardRightContent: {
    flex: 0.8,
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0,0,0,0.03)",
    paddingLeft: 12,
  },
  actionButtonsCol: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
    marginTop: -4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    gap: 6,
    minWidth: 90,
    justifyContent: "center",
  },
  addBtn: { backgroundColor: "#3B82F6" },
  addBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  finishBtn: {},
  finishBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  subInfoRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },

  
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

});




