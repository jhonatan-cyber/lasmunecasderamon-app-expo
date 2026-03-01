import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  useColorScheme,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { apiClient } from "../../../api/client";
import { PremiumAlert } from "../../../components/PremiumAlert";
import { PremiumHeader } from "../../../components/PremiumHeader";
import { EditServiceModal } from "../../../components/cajero/forms/EditServiceModal";
import {
  calculateRemainingTime,
  Timer,
  useTimer,
} from "../../../context/TimerContext";

// --- Helper for safe number conversion ---
const safeNumber = (val: any) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
  return 0;
};

// --- ServiceCard Component ---
const ServiceCard = memo(({ item, activeTab, serverOffset, onFinalizar, onEditar, theme }: {
  item: Timer & { waiter_name?: string; habitacion_comision?: number; created_at?: string; estado?: number };
  activeTab: string;
  serverOffset: number;
  onFinalizar: (t: Timer) => void;
  onEditar?: (t: Timer) => void;
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
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: isOverdue ? theme.danger : theme.border }]}>
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
    </View>
  );
});

// --- State Management ---
type ScreenState = {
  refreshing: boolean;
  activeTab: 'activos' | 'finalizados';
  finalizados: Timer[];
  loadingFinalizados: boolean;
  editModalVisible: boolean;
  selectedTimer: Timer | null;
  alertConfig: {
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
  };
};

type Action =
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_ACTIVE_TAB'; payload: 'activos' | 'finalizados' }
  | { type: 'SET_FINALIZADOS'; payload: Timer[] }
  | { type: 'SET_LOADING_FINALIZADOS'; payload: boolean }
  | { type: 'SET_EDIT_MODAL'; visible: boolean; timer?: Timer }
  | { type: 'SET_ALERT'; payload: Partial<ScreenState['alertConfig']> }
  | { type: 'CLOSE_ALERT' };

const initialState: ScreenState = {
  refreshing: false,
  activeTab: 'activos',
  finalizados: [],
  loadingFinalizados: false,
  editModalVisible: false,
  selectedTimer: null,
  alertConfig: { visible: false, title: "", message: "", type: "info" },
};

function reducer(state: ScreenState, action: Action): ScreenState {
  switch (action.type) {
    case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
    case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.payload };
    case 'SET_FINALIZADOS': return { ...state, finalizados: action.payload };
    case 'SET_LOADING_FINALIZADOS': return { ...state, loadingFinalizados: action.payload };
    case 'SET_EDIT_MODAL': return { ...state, editModalVisible: action.visible, selectedTimer: action.timer || null };
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
});
export default function ServiciosActivosScreen() {
  const isDark = (useColorScheme() ?? "dark") === "dark";
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const { timers, loading: loadingTimers, refreshTimers, serverOffset } = useTimer();
  const dataRef = useRef<string>("");

  const [state, dispatch] = useReducer(reducer, initialState);
  const { refreshing, activeTab, finalizados, loadingFinalizados, editModalVisible, selectedTimer, alertConfig } = state;

  const theme = {
    bg: isDark ? "#000000" : "#F8FAFC",
    card: isDark ? "#111827" : "#FFFFFF",
    text: isDark ? "#F9FAFB" : "#0F172A",
    textMuted: isDark ? "#9CA3AF" : "#64748B",
    border: isDark ? "#1F2937" : "#E2E8F0",
    accent: "#8B5CF6",
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
      const cajaRes = await apiClient("/cashregister/status");
      let cajaId = null;
      if (cajaRes.success && cajaRes.data?.hasOpenCaja) {
        cajaId = cajaRes.data?.cajaInfo?.id_caja || cajaRes.data?.openCaja?.id_caja || cajaRes.data?.caja?.id_caja;
      } else if (cajaRes.data?.id_caja) {
        cajaId = cajaRes.data.id_caja;
      } else if (cajaRes.id_caja) {
        cajaId = cajaRes.id_caja;
      }

      if (!cajaId) {
        dispatch({ type: 'SET_FINALIZADOS', payload: [] });
        if (isManual) Toast.show({ type: "info", text1: "Información", text2: "No hay caja abierta" });
        return;
      }

      const res = await apiClient(`/servicios?all=true&caja_id=${cajaId}`);
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
          estado: s.estado,
        }));
        dispatch({ type: 'SET_FINALIZADOS', payload: mapped });
        if (isManual) Toast.show({ type: hasChanges ? "success" : "info", text1: hasChanges ? "Éxito" : "Sin cambios" });
      }
    } catch (error) {
      console.error(error);
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
      if (activeTab === "finalizados") {
        fetchFinalizados();
      } else {
        refreshTimers();
      }
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
          dispatch({ type: 'CLOSE_ALERT' });
          try {
            const res = await apiClient(`/servicios/${timer.servicioId}`, { method: "PATCH", body: JSON.stringify({ estado: 1 }) });
            if (res.success) {
              Toast.show({ type: "success", text1: "Éxito", text2: "Servicio finalizado" });
              refreshTimers();
              fetchFinalizados();
            } else {
              Toast.show({ type: "error", text1: "Error", text2: res.message || "No se pudo finalizar" });
            }
          } catch (e) {
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

      {loadingTimers || (activeTab === "finalizados" && loadingFinalizados) ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={activeTab === 'activos' ? activeServicios : finalizados}
          renderItem={renderItem}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 16, marginHorizontal: 16 } : undefined}
          contentContainerStyle={[styles.list, numColumns > 1 && { paddingHorizontal: 0 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.textMuted, marginTop: 40 }}>No hay servicios</Text>}
        />
      )}

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => dispatch({ type: 'CLOSE_ALERT' })}
        showCancel
      />

      {selectedTimer && (
        <EditServiceModal
          visible={editModalVisible}
          onClose={() => dispatch({ type: 'SET_EDIT_MODAL', visible: false })}
          onSuccess={() => { dispatch({ type: 'SET_EDIT_MODAL', visible: false }); refreshTimers(); fetchFinalizados(); }}
          timer={selectedTimer}
        />
      )}
    </View>
  );
}


