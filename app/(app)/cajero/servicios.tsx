import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  DeviceEventEmitter,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { apiClient } from "../../../api/client";
import { PremiumAlert } from "../../../components/PremiumAlert";
import { PremiumHeader } from "../../../components/PremiumHeader";
import { EditServiceModal } from "../../../components/cajero/forms/EditServiceModal";
import { Skeleton } from "../../../components/ui/Skeleton";
import {
  calculateRemainingTime,
  Timer,
  useTimer,
} from "../../../context/TimerContext";
import { useAccentColor } from "../../../hooks/useAccentColor";

// --- Helper for safe number conversion ---
const safeNumber = (val: any) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
  return 0;
};

// --- ServiceCard Component ---
const ServiceCard = memo(({ item, activeTab, serverOffset, onFinalizar, onEditar, onPress, theme }: {
  item: Timer & {
    waiter_name?: string;
    habitacion_comision?: number;
    precio_habitacion?: number;
    precio_servicio?: number;
    iva?: number;
    pago_estado?: number;
    created_at?: string;
    estado?: number;
  };
  activeTab: string;
  serverOffset: number;
  onFinalizar: (t: Timer) => void;
  onEditar?: (t: Timer) => void;
  onPress?: (t: any) => void;
  theme: any;
}) => {
  const [remaining, setRemaining] = useState(() => calculateRemainingTime(item, serverOffset));

  useEffect(() => {
    if (!item.isActive || item.isPaused) return;
    const interval = setInterval(() => {
      setRemaining(calculateRemainingTime(item, serverOffset));
    }, 1000);
    return () => clearInterval(interval);
  }, [item, serverOffset]);

  const formatTime = (secs: number) => {
    const absSecs = Math.max(0, Math.abs(secs));
    const m = Math.floor(absSecs / 60);
    const s = absSecs % 60;
    return `${secs < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;
  };

  const isCritical = remaining < 60 && remaining > 0;
  const isOverdue = remaining <= 0;
  const total = safeNumber(item.total);

  // Status mapping logic from original
  let statusText = activeTab === "finalizados" ? "FINALIZADO" : isOverdue ? "TIEMPO AGOTADO" : "EN PROCESO";
  let statusColor = isOverdue ? theme.danger : theme.success;

  if (item.estado === 0) { statusText = "ANULADO"; statusColor = theme.danger; }
  else if (item.estado === 3) { statusText = "PAUSADO"; statusColor = theme.warning; }
  else if (item.estado === 4) { statusText = "SOLICITUD ANUL."; statusColor = theme.info; }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Pressable
      onPress={() => onPress && onPress(item)}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: isOverdue ? theme.danger : theme.border, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.roomBadge}>
          <View style={[styles.iconBox, { backgroundColor: theme.accent + "15" }]}>
            <Ionicons name="bed" size={18} color={theme.accent} />
          </View>
          <View>
            <Text style={[styles.roomName, { color: theme.text }]}>{item.roomName || "Habitación"}</Text>
            <Text style={[styles.serviceCode, { color: theme.textMuted }]}>#{item.servicioCode || "S/N"} • {formatDateTime(item.created_at)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "10" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.detailsList}>
        <View style={styles.detailItem}>
          <Ionicons name="people" size={14} color={theme.textMuted} />
          <Text style={[styles.detailText, { color: theme.text }]}>
            <Text style={styles.bold}>Anfitrionas: </Text>
            {item.anfitrionas || "No asignadas"}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="person" size={14} color={theme.textMuted} />
          <Text style={[styles.detailText, { color: theme.text }]}>
            <Text style={styles.bold}>Cliente: </Text>
            {item.clienteNombre || "Sin registrar"}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="create-outline" size={14} color={theme.textMuted} />
          <Text style={[styles.detailText, { color: theme.text }]}>
            <Text style={styles.bold}>Registrado por: </Text>
            {item.waiter_name || "Admin"}
          </Text>
        </View>
      </View>

      {activeTab === "activos" && item.estado !== 3 && (
        <View style={[styles.timerHero, { backgroundColor: isOverdue ? theme.danger + "15" : isCritical ? theme.warning + "15" : theme.bg }]}>
          <Ionicons name="time" size={24} color={isOverdue ? theme.danger : isCritical ? theme.warning : theme.accent} />
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.timerLabel, { color: theme.textMuted }]}>TIEMPO RESTANTE</Text>
            <Text style={[styles.timerValue, { color: isOverdue ? theme.danger : theme.text }]}>{formatTime(remaining)}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.timerTotalLabel, { color: theme.textMuted }]}>TOTAL {item.duration} MIN</Text>
          </View>
        </View>
      )}

      <View style={styles.financeBox}>
        <View style={styles.paymentMethodBadge}>
          <Ionicons name="card-outline" size={12} color={theme.textMuted} />
          <Text style={[styles.paymentMethodText, { color: theme.textMuted }]}>
            {item.metodo_pago?.toUpperCase() || "EFECTIVO"}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.totalLabel, { color: theme.textMuted }]}>TOTAL COBRADO</Text>
          <Text style={[styles.totalPrice, { color: theme.text }]}>${total.toLocaleString()}</Text>
          {activeTab === "finalizados" && (
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: item.pago_estado === 0 ? theme.success + '15' : theme.danger + '15',
                marginTop: 4,
                borderColor: item.pago_estado === 0 ? theme.success : theme.danger,
                borderWidth: 1
              }
            ]}>
              <Text style={[
                styles.statusLabel,
                { color: item.pago_estado === 0 ? theme.success : theme.danger, fontSize: 8 }
              ]}>
                {item.pago_estado === 0 ? 'COBRADO ✓' : 'POR COBRAR ⚠'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {activeTab === "activos" && (
        <View style={styles.actionsBox}>
          {((item.habitacion_comision ?? 0) > 0 || (item.precio_servicio ?? 0) === 0) && (
            <Pressable
              style={[styles.editActionBtn, { backgroundColor: theme.warning }]}
              onPress={() => onEditar && onEditar(item)}
              accessibilityLabel="Editar servicio"
              accessibilityRole="button"
            >
              <Ionicons name="create" size={16} color="#FFF" />
              <Text style={styles.btnText}>EDITAR</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.finishActionBtn, { backgroundColor: theme.danger }]}
            onPress={() => onFinalizar(item)}
            accessibilityLabel="Finalizar servicio"
            accessibilityRole="button"
          >
            <Ionicons name="stop" size={16} color="#FFF" />
            <Text style={styles.btnText}>FINALIZAR</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
});

const ServiceSkeleton = ({ theme }: { theme: any }) => (
  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={styles.cardHeader}>
      <View style={styles.roomBadge}>
        <Skeleton width={34} height={34} borderRadius={10} />
        <View style={{ gap: 4 }}>
          <Skeleton width={120} height={18} />
          <Skeleton width={100} height={11} />
        </View>
      </View>
      <Skeleton width={80} height={20} borderRadius={16} />
    </View>
    <View style={styles.detailsList}>
      <Skeleton width="90%" height={14} style={{ marginBottom: 4 }} />
      <Skeleton width="80%" height={14} style={{ marginBottom: 4 }} />
      <Skeleton width="70%" height={14} />
    </View>
    <View style={styles.financeBox}>
      <Skeleton width={60} height={20} borderRadius={10} />
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Skeleton width={80} height={12} />
        <Skeleton width={100} height={20} />
      </View>
    </View>
  </View>
);

// --- State Management ---
type ScreenState = {
  refreshing: boolean;
  activeTab: 'activos' | 'finalizados';
  finalizados: Timer[];
  loadingActivos: boolean;
  loadingFinalizados: boolean;
  editModalVisible: boolean;
  detailModalVisible: boolean;
  selectedTimer: Timer | null;
  selectedServiceDetail: any | null;
  alertConfig: {
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    confirmText?: string;
  };
};

type Action =
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: 'activos' | 'finalizados' }
  | { type: 'SET_FINALIZADOS'; payload: Timer[] }
  | { type: 'SET_LOADING_ACTIVOS'; payload: boolean }
  | { type: 'SET_LOADING_FINALIZADOS'; payload: boolean }
  | { type: 'SET_EDIT_MODAL'; visible: boolean; timer?: Timer }
  | { type: 'SET_DETAIL_MODAL'; visible: boolean; service?: any }
  | { type: 'SET_ALERT'; payload: Partial<ScreenState['alertConfig']> }
  | { type: 'CLOSE_ALERT' };

const initialState: ScreenState = {
  refreshing: false,
  activeTab: 'activos',
  finalizados: [],
  loadingActivos: false,
  loadingFinalizados: false,
  editModalVisible: false,
  detailModalVisible: false,
  selectedTimer: null,
  selectedServiceDetail: null,
  alertConfig: { visible: false, title: "", message: "", type: "info", showCancel: true },
};

function reducer(state: ScreenState, action: Action): ScreenState {
  switch (action.type) {
    case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
    case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.payload };
    case 'SET_FINALIZADOS': return { ...state, finalizados: action.payload };
    case 'SET_LOADING_ACTIVOS': return { ...state, loadingActivos: action.payload };
    case 'SET_LOADING_FINALIZADOS': return { ...state, loadingFinalizados: action.payload };
    case 'SET_EDIT_MODAL': return { ...state, editModalVisible: action.visible, selectedTimer: action.timer || null };
    case 'SET_DETAIL_MODAL': return { ...state, detailModalVisible: action.visible, selectedServiceDetail: action.service || null };
    case 'SET_ALERT': return { ...state, alertConfig: { ...state.alertConfig, ...action.payload } };
    case 'CLOSE_ALERT': return { ...state, alertConfig: { ...state.alertConfig, visible: false } };
    default: return state;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 20, paddingBottom: 100 },
  card: { flex: 1, borderRadius: 24, padding: 16, borderWidth: 1, marginBottom: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  roomBadge: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  roomName: { fontSize: 18, fontWeight: "900" },
  serviceCode: { fontSize: 11, fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: "900" },
  timerHero: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12 },
  timerLabel: { fontSize: 10, fontWeight: "700" },
  timerValue: { fontSize: 24, fontWeight: "900" },
  financeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  totalLabel: { fontSize: 12, fontWeight: "700" },
  totalPrice: { fontSize: 20, fontWeight: "900" },
  actionsBox: { flexDirection: 'row', gap: 10, marginTop: 15 },
  editActionBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  finishActionBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  detailsList: { gap: 8, marginBottom: 16, paddingHorizontal: 4 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 12, flex: 1 },
  bold: { fontWeight: '800' },
  timerTotalLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  paymentMethodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(156, 163, 175, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  paymentMethodText: { fontSize: 10, fontWeight: '800' },

  // Detail Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  detailModal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%', borderTopWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitleText: { fontSize: 24, fontWeight: '900' },
  modalSubText: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(156, 163, 175, 0.1)', justifyContent: 'center', alignItems: 'center' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  gridItem: { width: '47%', padding: 12, borderRadius: 16, backgroundColor: 'rgba(156, 163, 175, 0.05)', justifyContent: 'center' },
  gridLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  gridValue: { fontSize: 13, fontWeight: '700' },
  summarySection: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, fontWeight: '600' },
  summaryVal: { fontSize: 14, fontWeight: '700' },
  totalLabelFinal: { fontSize: 14, fontWeight: '900' },
  totalValFinal: { fontSize: 22, fontWeight: '900' },
  modalCloseBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalCloseBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
export default function ServiciosActivosScreen() {
  const { accentColor, isDark } = useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const { timers, loading: loadingTimers, refreshTimers, serverOffset } = useTimer();
  const dataRef = useRef<string>("");
  const isFocused = useRef(true);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { refreshing, activeTab, finalizados, loadingActivos, loadingFinalizados, editModalVisible, selectedTimer, alertConfig } = state;

  const theme = {
    bg: isDark ? "#000000" : "#F8FAFC",
    card: isDark ? "#111827" : "#FFFFFF",
    text: isDark ? "#F9FAFB" : "#0F172A",
    textMuted: isDark ? "#9CA3AF" : "#64748B",
    border: isDark ? "#1F2937" : "#E2E8F0",
    accent: accentColor,
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",
  };

  const activeServicios = useMemo(() => {
    return timers.filter(t => {
      if (t.tipoTransaccion !== 'servicio') return false;
      if (!t.isActive) return false;
      const remaining = calculateRemainingTime(t, serverOffset);
      if (remaining <= 0) return false;
      return true;
    });
  }, [timers, serverOffset]);

  const fetchFinalizados = useCallback(async (isManual = false) => {
    dispatch({ type: 'SET_LOADING_FINALIZADOS', payload: true });
    try {
      const statusRes = await apiClient("/cashregister/status").catch((e) => { console.error("❌ Error fetch status caja:", e); return null; });
      const openCajaId = statusRes?.data?.cajaInfo?.id_caja || statusRes?.data?.openCaja?.id_caja;

      console.log("ℹ️ [Servicios] Buscando finalizados. Caja detectada:", openCajaId);

      const endpoint = openCajaId
        ? `/servicios?all=true&caja_id=${openCajaId}&limit=50`
        : `/servicios?all=true&limit=50`;

      const res = await apiClient(endpoint);
      console.log("ℹ️ [Servicios] Resultado API:", res.success, "cant:", res.data?.length);

      if (res.success && Array.isArray(res.data)) {
        const serialized = JSON.stringify(res.data);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;

        const mapped: Timer[] = res.data.map((s: any) => ({
          id: String(s.id_servicio),
          servicioId: s.id_servicio,
          roomId: s.habitacion_id,
          roomName: s.habitacion_numero || `Habitación ${s.habitacion_id}`,
          duration: safeNumber(s.tiempo),
          remainingTime: 0,
          isActive: false,
          isPaused: false,
          startTime: new Date(s.fecha_crea),
          servicioCode: s.codigo,
          clienteNombre: s.cliente_nombre,
          anfitrionas: s.anfitrionas_nombres,
          total: safeNumber(s.total),
          metodo_pago: s.metodo_pago,
          waiter_name: s.usuario_nick || "Admin",
          created_at: s.fecha_crea,
          habitacion_comision: safeNumber(s.habitacion_comision),
          precio_habitacion: safeNumber(s.precio_habitacion),
          precio_servicio: safeNumber(s.precio_servicio),
          iva: safeNumber(s.iva),
          pago_estado: s.pago_estado,
          estado: s.estado,
        }));
        dispatch({ type: 'SET_FINALIZADOS', payload: mapped });
        if (isManual) Toast.show({ type: hasChanges ? "success" : "info", text1: hasChanges ? "Éxito" : "Sin cambios" });
      }
    } catch (error) {
      console.error("❌ ERROR en fetchFinalizados:", error);
      if (isManual) Toast.show({ type: "error", text1: "Error", text2: "No se pudo actualizar" });
    } finally {
      dispatch({ type: 'SET_LOADING_FINALIZADOS', payload: false });
    }
  }, []);

  useEffect(() => {
    if (activeTab === "finalizados") fetchFinalizados();
  }, [activeTab, fetchFinalizados]);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      if (activeTab === "finalizados") {
        fetchFinalizados();
      } else {
        dispatch({ type: 'SET_LOADING_ACTIVOS', payload: true });
        refreshTimers().finally(() => dispatch({ type: 'SET_LOADING_ACTIVOS', payload: false }));
      }
      return () => {
        isFocused.current = false;
      };
    }, [activeTab, fetchFinalizados, refreshTimers])
  );

  const prevOverdueCount = useRef(0);
  const prevTimersLength = useRef(timers.length);

  // Cuando un timer es removido (ej. al finalizar), actualizamos la vista de finalizados en background
  useEffect(() => {
    if (timers.length < prevTimersLength.current) {
      fetchFinalizados();
    }
    prevTimersLength.current = timers.length;
  }, [timers.length, fetchFinalizados]);

  // Cuando un timer está overdue (tiempo agotado), actualizamos finalizados
  useEffect(() => {
    const currentOverdueCount = timers.filter(t => {
      if (t.tipoTransaccion !== 'servicio') return false;
      const remaining = calculateRemainingTime(t, serverOffset);
      return remaining <= 0;
    }).length;

    if (currentOverdueCount > prevOverdueCount.current && activeTab === 'activos') {
      fetchFinalizados();
    }
    prevOverdueCount.current = currentOverdueCount;
  }, [timers, serverOffset, activeTab, fetchFinalizados]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refresh_sales", (data?: any) => {
      console.log("ℹ [Servicios] Refresh event received.", data);
      // Actualizamos listas silenciosamente
      refreshTimers();
      fetchFinalizados();
    });

    const subClose = DeviceEventEmitter.addListener("timer_alert_closed", () => {
      // Si el GlobalTimerAlert se cierra, refrescamos también.
      refreshTimers();
      fetchFinalizados();
    });

    return () => {
      sub.remove();
      subClose.remove();
    };
  }, [refreshTimers, fetchFinalizados]);

  const onRefresh = useCallback(async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    if (activeTab === "activos") await refreshTimers();
    else await fetchFinalizados(true);
    dispatch({ type: 'SET_REFRESHING', payload: false });
  }, [activeTab, refreshTimers, fetchFinalizados]);

  const onFinalizar = useCallback((timer: Timer) => {
    dispatch({
      type: 'SET_ALERT', payload: {
        visible: true,
        title: "Finalizar Servicio",
        message: "¿Seguro que deseas finalizar el servicio?",
        type: "danger",
        onConfirm: async () => {
          try {
            const res = await apiClient(`/servicios/${timer.servicioId}`, { method: "PATCH", body: JSON.stringify({ estado: 1 }) });
            if (res.success) {
              dispatch({ type: 'CLOSE_ALERT' });
              Toast.show({ type: "success", text1: "Servicio Finalizado", text2: "El servicio ha finalizado con éxito." });
              refreshTimers();
              fetchFinalizados();
            } else {
              dispatch({ type: 'CLOSE_ALERT' });
              Toast.show({ type: "error", text1: "Error", text2: res.message || "No se pudo finalizar" });
            }
          } catch (e) {
            dispatch({ type: 'CLOSE_ALERT' });
            Toast.show({ type: "error", text1: "Error", text2: "Error de conexión" });
          }
        }
      }
    });
  }, [refreshTimers, fetchFinalizados]);

  const onEditar = useCallback((timer: Timer) => {
    dispatch({ type: 'SET_EDIT_MODAL', visible: true, timer });
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <ServiceCard
      item={item}
      activeTab={activeTab}
      serverOffset={serverOffset}
      onFinalizar={onFinalizar}
      onEditar={onEditar}
      onPress={(t) => dispatch({ type: 'SET_DETAIL_MODAL', visible: true, service: t })}
      theme={theme}
    />
  ), [activeTab, serverOffset, onFinalizar, onEditar, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <PremiumHeader
        title="Servicios"
        onBack={() => router.replace("/cajero")}
        showAddButton
        onAdd={() => router.push("/cajero/nuevo-servicio")}
        tabs={[
          { id: "activos", label: "Activos" },
          { id: "finalizados", label: "Finalizados" },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId: string) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId as any })}
      />

      {activeTab === "activos" ? (
        (loadingTimers || loadingActivos) ? (
          <FlatList
            data={[1, 2, 3, 4]}
            renderItem={() => <ServiceSkeleton theme={theme} />}
            keyExtractor={(item) => `skeleton-${item}`}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 16, marginHorizontal: 16 } : undefined}
            contentContainerStyle={[styles.list, numColumns > 1 && { paddingHorizontal: 0 }]}
          />
        ) : (
          <FlatList
            data={activeServicios}
            renderItem={renderItem}
            keyExtractor={(item) => `active-${item.id}`}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 16, marginHorizontal: 16 } : undefined}
            contentContainerStyle={[styles.list, numColumns > 1 && { paddingHorizontal: 0 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.textMuted, marginTop: 40 }}>No hay servicios activos</Text>}
          />
        )
      ) : (
        loadingFinalizados ? (
          <FlatList
            data={[1, 2, 3, 4]}
            renderItem={() => <ServiceSkeleton theme={theme} />}
            keyExtractor={(item) => `skeleton-fin-${item}`}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 16, marginHorizontal: 16 } : undefined}
            contentContainerStyle={[styles.list, numColumns > 1 && { paddingHorizontal: 0 }]}
          />
        ) : (
          <FlatList
            data={finalizados}
            renderItem={renderItem}
            keyExtractor={(item) => `finalizado-${item.id}`}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? { gap: 16, marginHorizontal: 16 } : undefined}
            contentContainerStyle={[styles.list, numColumns > 1 && { paddingHorizontal: 0 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.textMuted, marginTop: 40 }}>No hay servicios finalizados</Text>}
          />
        )
      )}

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel || (() => dispatch({ type: 'CLOSE_ALERT' }))}
        showCancel={alertConfig.showCancel}
        confirmText={alertConfig.confirmText || "Confirmar"}
      />

      {selectedTimer && (
        <EditServiceModal
          visible={editModalVisible}
          onClose={() => dispatch({ type: 'SET_EDIT_MODAL', visible: false })}
          onSuccess={() => { dispatch({ type: 'SET_EDIT_MODAL', visible: false }); refreshTimers(); fetchFinalizados(); }}
          timer={selectedTimer}
        />
      )}

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={state.detailModalVisible}
        onRequestClose={() => dispatch({ type: 'SET_DETAIL_MODAL', visible: false })}
      >
        <View style={state.detailModalVisible ? styles.modalOverlay : { display: 'none' }}>
          <View style={[styles.detailModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {state.selectedServiceDetail && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitleText, { color: theme.text }]}>Detalles de Servicio</Text>
                    <Text style={[styles.modalSubText, { color: theme.textMuted }]}>Código: {state.selectedServiceDetail.servicioCode}</Text>
                  </View>
                  <Pressable onPress={() => dispatch({ type: 'SET_DETAIL_MODAL', visible: false })} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={theme.textMuted} />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  <View style={styles.detailsGrid}>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: theme.textMuted }]}>FECHA</Text>
                      <Text style={[styles.gridValue, { color: theme.text }]}>
                        {new Date(state.selectedServiceDetail.created_at).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: theme.textMuted }]}>HORA</Text>
                      <Text style={[styles.gridValue, { color: theme.text }]}>
                        {new Date(state.selectedServiceDetail.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: theme.textMuted }]}>CLIENTE</Text>
                      <Text style={[styles.gridValue, { color: theme.text }]}>{state.selectedServiceDetail.clienteNombre || "Sin cliente"}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: theme.textMuted }]}>TIEMPO</Text>
                      <Text style={[styles.gridValue, { color: theme.text }]}>{state.selectedServiceDetail.duration} min</Text>
                    </View>
                  </View>

                  <View style={styles.detailsGrid}>
                    <View style={[styles.gridItem, { width: '100%' }]}>
                      <Text style={[styles.gridLabel, { color: theme.textMuted }]}>ANFITRIONA(S) ASIGNADA(S)</Text>
                      <Text style={[styles.gridValue, { color: theme.text }]}>{state.selectedServiceDetail.anfitrionas}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '100%' }]}>
                      <Text style={[styles.gridLabel, { color: theme.textMuted }]}>HABITACIÓN</Text>
                      <Text style={[styles.gridValue, { color: theme.text }]}>{state.selectedServiceDetail.roomName}</Text>
                    </View>

                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: theme.textMuted }]}>MÉTODO DE PAGO</Text>
                      <Text style={[styles.gridValue, { color: theme.text }]}>
                        {state.selectedServiceDetail.metodo_pago ? state.selectedServiceDetail.metodo_pago.toUpperCase() : "EFECTIVO"}
                      </Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={[styles.gridLabel, { color: theme.textMuted }]}>ATENDIDO POR</Text>
                      <Text style={[styles.gridValue, { color: theme.text }]}>{state.selectedServiceDetail.waiter_name}</Text>
                    </View>
                  </View>

                  <View style={[styles.summarySection, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: theme.border }]}>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Precio Habitación</Text>
                      <Text style={[styles.summaryVal, { color: theme.text }]}>${(state.selectedServiceDetail.precio_habitacion || 0).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.summaryRow, { marginTop: 4 }]}>
                      <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Precio del Servicio</Text>
                      <Text style={[styles.summaryVal, { color: theme.text }]}>${(state.selectedServiceDetail.precio_servicio || 0).toLocaleString()}</Text>
                    </View>
                    {(state.selectedServiceDetail.iva || 0) > 0 && (
                      <View style={[styles.summaryRow, { marginTop: 4 }]}>
                        <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>IVA (Gestión Tarjeta)</Text>
                        <Text style={[styles.summaryVal, { color: theme.text }]}>${(state.selectedServiceDetail.iva || 0).toLocaleString()}</Text>
                      </View>
                    )}

                    <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }]}>
                      <Text style={[styles.totalLabelFinal, { color: theme.text }]}>TOTAL COBRADO</Text>
                      <Text style={[styles.totalValFinal, { color: theme.accent }]}>${(state.selectedServiceDetail.total || 0).toLocaleString()}</Text>
                    </View>

                    <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }]}>
                      <Text style={[styles.totalLabelFinal, { color: theme.text }]}>ESTADO COMISIONES</Text>
                      <Text style={[styles.totalValFinal, { color: state.selectedServiceDetail.pago_estado === 0 ? theme.success : theme.danger, fontSize: 16 }]}>
                        {state.selectedServiceDetail.pago_estado === 0 ? 'LIQUIDADAS / PAGADAS ✓' : 'PENDIENTES DE PAGO ⚠'}
                      </Text>
                    </View>

                    {state.selectedServiceDetail.anfitrionas && (
                      <View style={[styles.summaryRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }]}>
                        <Text style={[styles.totalLabelFinal, { color: theme.text }]}>COMISIÓN P/ ANFITRIONA</Text>
                        <Text style={[styles.totalValFinal, { color: theme.success, fontSize: 18 }]}>
                          ${Math.floor(state.selectedServiceDetail.precio_servicio / (String(state.selectedServiceDetail.anfitrionas).split(', ').length || 1)).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                <Pressable
                  style={[styles.modalCloseBtn, { backgroundColor: theme.accent }]}
                  onPress={() => dispatch({ type: 'SET_DETAIL_MODAL', visible: false })}
                >
                  <Text style={styles.modalCloseBtnText}>Cerrar Detalles</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}


