import { Ionicons } from "@expo/vector-icons";
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { MotiView } from 'moti';
import {
  DeviceEventEmitter,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiClient, BASE_URL } from '@/api/client';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { EditServiceModal } from '@/components/cajero/forms/EditServiceModal';
import {
  Timer,
  useTimer,
} from '@/context/TimerContext';
import { calculateRemainingTime, parseDateSafe } from '@/utils/timeUtils';
import { useAccentColor } from '@/hooks/useAccentColor';

const FlashList = ShopifyFlashList as any;

// --- Helper for safe number conversion ---

const safeNumber = (val: any) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") {
    const normalized = val.trim().replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
    const fallback = parseFloat(val.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(fallback) ? fallback : 0;
  }
  const parsed = Number(val);
  if (Number.isFinite(parsed)) return parsed;
  return 0;
};

const formatServiceDetail = (raw: any) => {
  // El precio_servicio del backend es el valor original del input (no multiplicado)
  const precioServicio = safeNumber(raw?.precio_servicio ?? raw?.precioServicio ?? 0);
  const precioHabitacion = safeNumber(raw?.precio_habitacion ?? raw?.precioHabitacion ?? 0);
  const iva = safeNumber(raw?.iva ?? 0);
  const anfitrionasIdsRaw = Array.isArray(raw?.anfitrionas_ids)
    ? raw.anfitrionas_ids
    : typeof raw?.anfitrionas_ids === "string"
      ? raw.anfitrionas_ids.split(",").map((id: string) => id.trim()).filter(Boolean)
      : [];
  const anfitrionasNombres = typeof raw?.anfitrionas === "string"
    ? raw.anfitrionas.split(",").map((name: string) => name.trim()).filter(Boolean)
    : [];
  const totalUsuarios = Math.max(
    1,
    safeNumber(raw?.total_usuarios ?? raw?.totalUsuarios ?? 0),
    anfitrionasIdsRaw.length,
    anfitrionasNombres.length
  );

  const habitacionComision = safeNumber(raw?.habitacion_comision ?? 0);
  const tieneComisionHabitacion = habitacionComision > 0;

  // Si la habitación tiene comisión fija, se divide entre las anfitrionas
  // Si no, cada anfitriona recibe el precio del input
  const comisionIndividual = tieneComisionHabitacion
    ? Math.floor(habitacionComision / totalUsuarios)
    : precioServicio;
  const totalComision = tieneComisionHabitacion
    ? habitacionComision
    : precioServicio * totalUsuarios;
  
  const roomName = raw?.roomName || raw?.habitacion_nombre || raw?.habitacion_numero || raw?.habitacion || "Servicio de barra";
  const fechaServicio = parseDateSafe(raw?.fecha_crea || raw?.created_at || raw?.startTime);

  return {
    ...raw,
    roomName,
    precio_servicio: precioServicio,
    precio_habitacion: precioHabitacion,
    iva,
    total: safeNumber(raw?.total ?? raw?.monto ?? (precioServicio + precioHabitacion + iva)),
    total_usuarios: totalUsuarios,
    habitacion_comision: habitacionComision,
    comision_individual: comisionIndividual,
    total_comision: totalComision,
    created_at: fechaServicio.toISOString(),
    fecha_crea: fechaServicio.toISOString(),
    waiter_name: raw?.waiter_name || raw?.usuario_nick || `${raw?.creator_nombre || ""} ${raw?.creator_apellido || ""}`.trim() || "Admin",
    waiter_foto: raw?.waiter_foto || raw?.creator_foto,
    solicitante_name: raw?.solicitante_name || raw?.solicitante || "Servicio de barra",
    solicitante_foto: raw?.solicitante_foto || null,
  };
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
    // Actualizar inmediatamente al cambiar el item o el offset
    setRemaining(calculateRemainingTime(item, serverOffset));
    
    // Si no está activo o está pausado, no corremos el intervalo
    if (activeTab === "finalizados" || item.isPaused || item.estado === 3) return;

    const interval = setInterval(() => {
      setRemaining(calculateRemainingTime(item, serverOffset));
    }, 1000);

    return () => clearInterval(interval);
  }, [item, serverOffset, item.isPaused, item.estado, activeTab]);

  const formatTime = (secs: number) => {
    const absSecs = Math.max(0, Math.abs(secs));
    const m = Math.floor(absSecs / 60);
    const s = absSecs % 60;
    return `${secs < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;
  };

  const isCritical = remaining < 60 && remaining > 0;
  const isOverdue = remaining <= 0;
  const total = safeNumber(item.total);

  let statusText = activeTab === "finalizados" ? "FINALIZADO" : isOverdue ? "TIEMPO AGOTADO" : "EN PROCESO";
  let statusColor = isOverdue ? theme.danger : theme.success;

  if (item.estado === 0) { statusText = "ANULADO"; statusColor = theme.danger; }
  else if (item.estado === 3) { statusText = "PAUSADO"; statusColor = theme.warning; }
  else if (item.estado === 4) { statusText = "SOLICITUD ANUL."; statusColor = theme.info; }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = parseDateSafe(dateStr);
    return date.toLocaleString("es-ES", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit", 
      minute: "2-digit",
      hour12: true
    }).replace(/,/g, '');
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 500 }}
    >
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
              <Text style={[styles.roomName, { color: theme.text }]}>{item.roomName || "Servicio de barra"}</Text>
              <Text style={[styles.serviceCode, { color: theme.textMuted }]}>Codigo : #{item.servicioCode || "S/N"}</Text>
              <Text style={[styles.serviceCode, { color: theme.textMuted, fontSize: 10, marginTop: 2 }]}>{formatDateTime(item.created_at)}</Text>
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
              {(item.clienteNombre && item.clienteNombre !== 'Sin cliente') ? item.clienteNombre : "Sin cliente registrado"}
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
                  {item.pago_estado === 0 ? 'PAGADO \u2713' : 'POR PAGAR \u26A0'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {activeTab === "activos" && (
          <View style={styles.actionsBox}>
            {Number(item.habitacion_comision || 0) > 0 ? (
              <Pressable
                style={[styles.editActionBtn, { backgroundColor: theme.warning }]}
                onPress={() => onEditar && onEditar(item)}
                accessibilityLabel="Editar servicio"
                accessibilityRole="button"
              >
                <Ionicons name="create" size={16} color="#FFF" />
                <Text style={styles.btnText}>EDITAR</Text>
              </Pressable>
            ) : null}
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
    </MotiView>
  );
});
ServiceCard.displayName = "ServiceCard";

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
  list: { padding: 12, paddingBottom: 100 },
  card: { flex: 1, borderRadius: 24, padding: 16, borderWidth: 1, marginBottom: 16, marginHorizontal: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  roomBadge: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  roomName: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
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
  modalTitleText: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  modalSubText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(156, 163, 175, 0.1)', justifyContent: 'center', alignItems: 'center' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  gridItem: { width: '47%', padding: 14, borderRadius: 18, backgroundColor: 'rgba(156, 163, 175, 0.05)', justifyContent: 'center' },
  gridLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
  gridValue: { fontSize: 15, fontWeight: '700' },
  infoVal: { fontSize: 13, fontWeight: '700' },
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
  summarySection: { padding: 24, borderRadius: 28, borderWidth: 1, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  summaryLabel: { fontSize: 15, fontWeight: '600' },
  summaryVal: { fontSize: 16, fontWeight: '700' },
  totalLabelFinal: { fontSize: 16, fontWeight: '900' },
  totalValFinal: { fontSize: 26, fontWeight: '900' },
  modalCloseBtn: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalCloseBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  hostessBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  hostessBadgeText: { fontSize: 13, fontWeight: '800' },
  avatarMini: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(156, 163, 175, 0.2)' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  avatarSquare: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(156, 163, 175, 0.2)' },
  fab: { 
    position: 'absolute', 
    bottom: 30, 
    right: 20, 
    flexDirection: 'row',
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 9999,
    elevation: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 10,
    gap: 8
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1
  },
});

export default function ServiciosActivosScreen() {
  const { accentColor, isDark } = useAccentColor();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const { timers, refreshTimers, serverOffset } = useTimer();
  const isFocused = useRef(true);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { refreshing, activeTab, finalizados, loadingActivos, loadingFinalizados, editModalVisible, selectedTimer, alertConfig, selectedServiceDetail, detailModalVisible } = state;

  const theme = useMemo(() => ({
    bg: isDark ? "#000000" : "#F8FAFC",
    card: isDark ? "#111111" : "#FFFFFF",
    text: isDark ? "#F9FAFB" : "#0F172A",
    textMuted: isDark ? "#9CA3AF" : "#64748B",
    border: isDark ? `${accentColor}40` : "#E2E8F0",
    accent: accentColor,
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",
  }), [isDark, accentColor]);

  const activeServicios = useMemo(() => {
    const servicios = timers.filter(t => t.tipoTransaccion === 'servicio');
    // Si hay un temporal activo (es_temporal=true), ocultar el original al que reemplaza
    const temporalOriginalIds = new Set(
      servicios
        .filter(t => t.es_temporal && t.servicio_original_id)
        .map(t => String(t.servicio_original_id))
    );
    return servicios.filter(t => {
      // Mostrar temporales siempre
      if (t.es_temporal) return true;
      // Ocultar originales que tienen un temporal activo
      if (temporalOriginalIds.has(String(t.servicioId))) return false;
      return true;
    });
  }, [timers]);

  const fetchFinalizados = useCallback(async (isManual = false) => {
    dispatch({ type: 'SET_LOADING_FINALIZADOS', payload: true });
    try {
      // Traer todos los finalizados con paginación
      let allData: any[] = [];
      let page = 1;
      const limit = 200;
      let hasMore = true;

      while (hasMore) {
        const res = await apiClient(`/servicios?all=true&limit=${limit}&page=${page}`);
        const raw = Array.isArray((res as any)?.data?.data)
          ? (res as any).data.data
          : Array.isArray((res as any)?.data)
            ? (res as any).data
            : [];

        if (!res.success || raw.length === 0) { hasMore = false; break; }

        allData = [...allData, ...raw];
        const total = (res as any)?.data?.total || 0;
        hasMore = allData.length < total && raw.length === limit;
        page++;
      }

      const rawFinalizados = allData;

      if (Array.isArray(rawFinalizados) && rawFinalizados.length >= 0) {
        const mapped = rawFinalizados.map((sAny: any) => {
          const habitacionComision = safeNumber(sAny.habitacion_comision || 0);
          const comisionIndividual = safeNumber(sAny.comision_individual || 0);
          const totalUsuarios = Math.max(1, safeNumber(sAny.total_usuarios || 1));
          
          // Si hay comisión de habitación, esa es la comisión total
          // Si no, se usa la comisión individual por las anfitrionas
          const totalComision = habitacionComision > 0 
            ? habitacionComision 
            : comisionIndividual * totalUsuarios;
          
          return {
            id: String(sAny.id || sAny.id_servicio),
            servicioId: String(sAny.id || sAny.id_servicio),
            roomId: String(sAny.id_habitacion || sAny.roomId || sAny.habitacion_id || 'barra'),
            roomName: sAny.habitacion_nombre || sAny.habitacion_numero || "Servicio de barra",
            duration: safeNumber(sAny.tiempo || 0),
            remainingTime: 0,
            isActive: false,
            isPaused: false,
            startTime: parseDateSafe(sAny.fecha_crea),
            servicioCode: sAny.codigo,
            clienteNombre: sAny.cliente_nombre,
            tipoTransaccion: "servicio" as const,
            anfitrionas: sAny.anfitrionas_nombres,
            anfitrionas_fotos: sAny.anfitrionas_fotos ? sAny.anfitrionas_fotos.split(',') : [],
            total: safeNumber(sAny.total || 0),
            monto: safeNumber(sAny.monto || 0),
            metodo_pago: sAny.metodo_pago,
            waiter_name: sAny.waiter_name || `${sAny.creator_nombre || ""} ${sAny.creator_apellido || ""}`.trim() || sAny.creator_nick,
            waiter_foto: sAny.waiter_foto || sAny.creator_foto,
            solicitante_name: sAny.solicitante_name,
            solicitante_foto: sAny.solicitante_foto,
            created_at: parseDateSafe(sAny.fecha_crea).toISOString(),
            fecha_crea: parseDateSafe(sAny.fecha_crea).toISOString(),
            estado: sAny.estado,
            pago_estado: sAny.pago_estado,
            anfitrionas_ids: sAny.anfitrionas_ids,
            comision_individual: habitacionComision > 0
              ? Math.floor(totalComision / totalUsuarios)
              : comisionIndividual,
            total_usuarios: totalUsuarios,
            total_comision: totalComision,
            habitacion_comision: habitacionComision,
            precio_habitacion: safeNumber(sAny.precio_habitacion || 0),
            precio_servicio: safeNumber(sAny.precio_servicio || 0),
            iva: safeNumber(sAny.iva || 0),
            sub_total: safeNumber(sAny.sub_total || 0),
          };
        });
        dispatch({ type: 'SET_FINALIZADOS', payload: mapped });
        if (isManual) Toast.show({ type: "success", text1: "Actualizado" });
      }
    } catch (error) {
      console.error("fetchFinalizados error:", error);
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

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refresh_sales", () => {
      refreshTimers();
      if (activeTab === "finalizados") fetchFinalizados();
    });
    return () => sub.remove();
  }, [refreshTimers, fetchFinalizados, activeTab]);

  const onRefresh = useCallback(async () => {
    dispatch({ type: 'SET_REFRESHING', payload: true });
    if (activeTab === "activos") await refreshTimers();
    else await fetchFinalizados(true);
    dispatch({ type: 'SET_REFRESHING', payload: false });
  }, [activeTab, refreshTimers, fetchFinalizados]);

  const showToast = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      visibilityTime: 4000
    });
  };

  const onFinalizar = useCallback((timer: Timer) => {
    dispatch({
      type: 'SET_ALERT', payload: {
        visible: true,
        title: "Finalizar Servicio",
        message: "¿Seguro que deseas finalizar el servicio?",
        type: "danger",
        onConfirm: async () => {
          try {
            if (!timer.servicioId || timer.servicioId === 'NaN' || timer.servicioId === '0') {
              showToast("Error", "ID de servicio inválido", "error");
              dispatch({ type: 'CLOSE_ALERT' });
              return;
            }
            const res = await apiClient(`/servicios/${timer.servicioId}`, { method: "PATCH", body: JSON.stringify({ estado: 1 }) });
            dispatch({ type: 'CLOSE_ALERT' });
            if (res.success) {
              Toast.show({ type: "success", text1: "Servicio Finalizado" });
              refreshTimers();
              fetchFinalizados();
            } else {
              Toast.show({ type: "error", text1: "Error", text2: res.message });
            }
          } catch (err: any) {
            dispatch({ type: 'CLOSE_ALERT' });
            Toast.show({ type: "error", text1: "Error", text2: err.message || "Error al finalizar" });
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
      onPress={(t) => dispatch({ type: 'SET_DETAIL_MODAL', visible: true, service: formatServiceDetail(t) })}
      theme={theme}
    />
  ), [activeTab, serverOffset, onFinalizar, onEditar, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <PremiumHeader
        title="Servicios"
        rightComponent={
          <Pressable
            onPress={() => router.replace("/cajero")}
            style={styles.backBtnRight}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.backTextRight}>Atrás</Text>
          </Pressable>
        }
        tabs={[
          { id: "activos", label: "Activos" },
          { id: "finalizados", label: "Finalizados" },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId: string) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId as any })}
      />

      <View style={{ flex: 1 }}>
        <FlashList
          data={activeTab === "activos" ? activeServicios : finalizados}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id}
          numColumns={numColumns}
          estimatedItemSize={200}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} colors={[accentColor]} />
          }
          ListEmptyComponent={
            !(loadingActivos || loadingFinalizados) ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
                <Ionicons name="documents-outline" size={48} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, marginTop: 10 }}>No hay servicios que mostrar</Text>
              </View>
            ) : null
          }
        />
      </View>

      {!editModalVisible && !detailModalVisible && !alertConfig.visible && (
        <Pressable
          style={[styles.fab, { backgroundColor: accentColor, bottom: Math.max(80, insets.bottom + 65) }]}
          onPress={() => router.push('/cajero/nuevo-servicio')}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
          <Text style={styles.fabText}>NUEVO SERVICIO</Text>
        </Pressable>
      )}

      <EditServiceModal
        visible={editModalVisible}
        timer={selectedTimer}
        onClose={() => dispatch({ type: 'SET_EDIT_MODAL', visible: false })}
        onSuccess={() => {
          refreshTimers();
          fetchFinalizados();
        }}
      />

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm || (() => dispatch({ type: 'CLOSE_ALERT' }))}
        onCancel={() => dispatch({ type: 'CLOSE_ALERT' })}
      />

      {/* Detalle Modal Simple */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitleText, { color: theme.text }]}>Detalle del Servicio</Text>
                <Text style={[styles.modalSubText, { color: theme.textMuted }]}>#{selectedServiceDetail?.servicioCode || "S/N"}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => dispatch({ type: 'SET_DETAIL_MODAL', visible: false })}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailsGrid}>
                <View style={[styles.gridItem, { width: '100%', flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>HABITACIÓN</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]} numberOfLines={1}>{selectedServiceDetail?.roomName || 'S/N'}</Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>TIEMPO</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>{selectedServiceDetail?.duration} min</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gridLabel, { color: theme.textMuted }]}>CLIENTE</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]} numberOfLines={1}>
                      {(selectedServiceDetail?.clienteNombre && selectedServiceDetail.clienteNombre !== 'Sin cliente') 
                        ? selectedServiceDetail.clienteNombre 
                        : (selectedServiceDetail?.cliente_nombre && selectedServiceDetail.cliente_nombre !== 'Sin cliente')
                          ? selectedServiceDetail.cliente_nombre
                          : 'Sin cliente registrado'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.gridItem, { width: '100%' }]}>
                  <Text style={[styles.gridLabel, { color: theme.textMuted }]}>ANFITRIONAS</Text>
                  <View style={styles.badgeContainer}>
                    {selectedServiceDetail?.anfitrionas?.split(', ').map((name: string, idx: number) => {
                      const colors = ['#F59E0B', '#A855F7', '#3B82F6', '#EC4899', '#06B6D4', '#10B981'];
                      const color = colors[idx % colors.length];
                      const foto = selectedServiceDetail?.anfitrionas_fotos?.[idx];
                      return (
                        <View key={`${name}-${idx}`} style={[styles.hostessBadge, { backgroundColor: color + '15', borderColor: color + '40' }]}>
                          {foto && (
                            <Image 
                              source={{ uri: foto.startsWith('http') ? foto : `${BASE_URL}/img/users/${foto}` }} 
                              style={styles.avatarMini} 
                            />
                          )}
                          <Text style={[styles.hostessBadgeText, { color }]}>{name.trim().toUpperCase()}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: theme.textMuted }]}>PROCESADO POR</Text>
                  <View style={styles.userRow}>
                    {selectedServiceDetail?.waiter_foto ? (
                      <Image 
                        source={{ uri: selectedServiceDetail.waiter_foto.startsWith('http') ? selectedServiceDetail.waiter_foto : `${BASE_URL}/img/users/${selectedServiceDetail.waiter_foto}` }} 
                        style={styles.avatarSquare} 
                      />
                    ) : (
                      <View style={[styles.avatarSquare, { justifyContent: 'center', alignItems: 'center' }]}>
                         <Ionicons name="person" size={16} color={theme.textMuted} />
                      </View>
                    )}
                    <Text style={[styles.gridValue, { color: theme.text, flex: 1 }]}>{selectedServiceDetail?.waiter_name || "Admin"}</Text>
                  </View>
                </View>

                {(selectedServiceDetail?.solicitante_name && selectedServiceDetail.solicitante_name !== 'Cajero (Manual)') && (
                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: theme.textMuted }]}>SOLICITADO POR</Text>
                  <View style={styles.userRow}>
                    {selectedServiceDetail?.solicitante_foto ? (
                      <Image 
                        source={{ uri: selectedServiceDetail.solicitante_foto.startsWith('http') ? selectedServiceDetail.solicitante_foto : `${BASE_URL}/img/users/${selectedServiceDetail.solicitante_foto}` }} 
                        style={styles.avatarSquare} 
                      />
                    ) : (
                      <View style={[styles.avatarSquare, { justifyContent: 'center', alignItems: 'center' }]}>
                         <Ionicons name="hand-right" size={16} color={theme.textMuted} />
                      </View>
                    )}
                    <Text style={[styles.gridValue, { color: theme.text, flex: 1 }]}>{selectedServiceDetail.solicitante_name}</Text>
                  </View>
                </View>
                )}
                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: theme.textMuted }]}>METODO PAGO</Text>
                  <Text style={[styles.gridValue, { color: theme.text }]}>{selectedServiceDetail?.metodo_pago?.toUpperCase()}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: theme.textMuted }]}>FECHA / HORA</Text>
                  <Text style={[styles.gridValue, { color: theme.text }]}>
                    {selectedServiceDetail?.created_at ? parseDateSafe(selectedServiceDetail.created_at).toLocaleString("es-ES", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(/,/g, '') : "-"}
                  </Text>
                </View>
              </View>

              <View style={[styles.summarySection, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Precio Servicio</Text>
                  <Text style={[styles.summaryVal, { color: theme.text }]}>${(safeNumber(selectedServiceDetail?.precio_servicio) * safeNumber(selectedServiceDetail?.total_usuarios)).toLocaleString()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Precio Habitación</Text>
                  <Text style={[styles.summaryVal, { color: theme.text }]}>${safeNumber(selectedServiceDetail?.precio_habitacion).toLocaleString()}</Text>
                </View>
                {selectedServiceDetail?.iva > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>IVA (Tarjeta)</Text>
                    <Text style={[styles.summaryVal, { color: theme.text }]}>${safeNumber(selectedServiceDetail?.iva).toLocaleString()}</Text>
                  </View>
                )}
                
                <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }]}>
                   <Text style={[styles.totalLabelFinal, { color: theme.text }]}>TOTAL FINAL</Text>
                   <Text style={[styles.totalValFinal, { color: theme.accent }]}>${safeNumber(selectedServiceDetail?.total).toLocaleString()}</Text>
                </View>

                {/* Sección de Comisiones */}
                {selectedServiceDetail?.habitacion_comision > 0 ? (
                  // Si hay comisión de habitación, esa es la comisión total que se divide
                  <>
                    <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }]}>
                      <Text style={[styles.summaryLabel, { color: theme.success, fontWeight: 'bold' }]}>Comisión Habitación</Text>
                      <Text style={[styles.summaryVal, { color: theme.success, fontWeight: 'bold' }]}>
                        ${safeNumber(selectedServiceDetail?.total_comision).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: 13 }]}>Comisión p/Anfitriona ({selectedServiceDetail?.total_usuarios})</Text>
                      <Text style={[styles.summaryVal, { color: theme.text, fontSize: 14 }]}>
                        ${safeNumber(selectedServiceDetail?.comision_individual).toLocaleString()} c/u
                      </Text>
                    </View>
                    <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: theme.accent + '15', borderWidth: 1, borderColor: theme.accent + '30' }}>
                      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                        * La comisión de habitación se divide entre las {selectedServiceDetail?.total_usuarios} anfitrionas.
                      </Text>
                    </View>
                  </>
                ) : (
                  // Si no hay comisión de habitación, mostrar total comisión (precio servicio × anfitrionas)
                  <>
                    <View style={[styles.summaryRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }]}>
                      <Text style={[styles.summaryLabel, { color: theme.success, fontWeight: 'bold' }]}>Total Comisión</Text>
                      <Text style={[styles.summaryVal, { color: theme.success, fontWeight: 'bold' }]}>
                        ${safeNumber(selectedServiceDetail?.total_comision ?? (safeNumber(selectedServiceDetail?.comision_individual) * safeNumber(selectedServiceDetail?.total_usuarios))).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.textMuted, fontSize: 13 }]}>Comisión p/Anfitriona ({selectedServiceDetail?.total_usuarios})</Text>
                      <Text style={[styles.summaryVal, { color: theme.text, fontSize: 14 }]}>
                        ${safeNumber(selectedServiceDetail?.comision_individual).toLocaleString()} c/u
                      </Text>
                    </View>
                    <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: theme.accent + '15', borderWidth: 1, borderColor: theme.accent + '30' }}>
                      <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                        * La comisión total se divide entre las anfitrionas que participaron en el servicio.
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <Pressable 
                style={[styles.modalCloseBtn, { backgroundColor: theme.accent }]} 
                onPress={() => dispatch({ type: 'SET_DETAIL_MODAL', visible: false })}
              >
                <Text style={styles.modalCloseBtnText}>Cerrar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}


