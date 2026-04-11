import { Ionicons } from "@expo/vector-icons";
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { MotiView } from "moti";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image,
} from "react-native";
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumFAB } from '@/components/ui/PremiumFAB';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { apiClient, BASE_URL } from '@/api/client';
import {
  PaymentMethod,
  PaymentMethodSelect,
} from '@/components/cajero/forms/PaymentMethodSelect';
import { TipCheckbox } from '@/components/cajero/forms/TipCheckbox';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { Skeleton } from '@/components/ui/Skeleton';
import { Timer, useTimer } from '@/context/TimerContext';
import { useAccentColor } from '@/hooks/useAccentColor';
import { calculateRemainingTime, parseDateSafe } from '@/utils/timeUtils';

// Cast para evitar errores de tipos en React 19 con FlashList
const FlashList = ShopifyFlashList as any;

type CuentasState = {
  loading: boolean;
  refreshing: boolean;
  cuentas: any[];
  resumen: any;
  selectedCuenta: any;
  loadingDetail: boolean;
  modalVisible: boolean;
  actionSheetVisible: boolean;
  activeCuenta: any;
  activeTab: "historial" | "pendientes";
  search: string;
  cobroModalVisible: boolean;
  cobroMetodoPago: PaymentMethod;
  cobroEnableTip: boolean;
  cobroSubmitting: boolean;
  alertConfig: {
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    onCancel?: () => void;
  };
};

type CuentasAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_DATA"; payload: any }
  | { type: "SET_ACTIVE_TAB"; payload: "historial" | "pendientes" }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_LOADING_DETAIL"; payload: boolean }
  | { type: "SET_SELECTED_CUENTA"; payload: any }
  | { type: "SET_ACTION_SHEET"; visible: boolean; cuenta?: any }
  | { type: "SET_COBRO_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_COBRO_METODO_PAGO"; payload: PaymentMethod }
  | { type: "SET_COBRO_ENABLE_TIP"; payload: boolean }
  | { type: "SET_COBRO_SUBMITTING"; payload: boolean }
  | { type: "SET_ALERT_VISIBLE"; payload: boolean }
  | { type: "SET_ALERT"; payload: CuentasState["alertConfig"] };

const statusColors: Record<number, string> = {
  0: "#10B981", // Cobrado
  1: "#fa2828ff", // Pendiente / Activo
  2: "#F59E0B", // Solicitud de anulacion
  3: "#6B7280", // Anulado
  4: "#FB923C", // Anulada parcial / saldo pendiente
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

const CuentaTimer = React.memo(
  ({
    timer,
    serverOffset,
    accentColor,
  }: {
    timer: Timer;
    serverOffset: number;
    accentColor: string;
  }) => {
    const [remaining, setRemaining] = React.useState(() =>
      calculateRemainingTime(timer, serverOffset),
    );

    React.useEffect(() => {
      // Actualizar inmediatamente al montar
      setRemaining(calculateRemainingTime(timer, serverOffset));
      // Tick cada segundo
      const interval = setInterval(() => {
        setRemaining(calculateRemainingTime(timer, serverOffset));
      }, 1000);
      return () => clearInterval(interval);
    }, [timer, serverOffset]);

    const isOverdue = remaining <= 0;
    const m = Math.floor(Math.abs(remaining) / 60);
    const s = Math.abs(remaining) % 60;
    const formatted = `${remaining < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;

    return (
      <Text
        style={{
          fontWeight: "900",
          color: isOverdue ? "#EF4444" : accentColor,
          fontSize: 24,
        }}
      >
        {isOverdue ? "AGOTADO" : formatted}
      </Text>
    );
  },
);
CuentaTimer.displayName = "CuentaTimer";

const initialCuentasState = (
  tab: "historial" | "pendientes",
): CuentasState => ({
  loading: true,
  refreshing: false,
  cuentas: [],
  resumen: null,
  selectedCuenta: null,
  loadingDetail: false,
  modalVisible: false,
  actionSheetVisible: false,
  activeCuenta: null,
  activeTab: tab,
  search: "",
  cobroModalVisible: false,
  cobroMetodoPago: "efectivo",
  cobroEnableTip: false,
  cobroSubmitting: false,
  alertConfig: { visible: false, title: "", message: "", type: "info" },
});

function cuentasReducer(
  state: CuentasState,
  action: CuentasAction,
): CuentasState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_REFRESHING":
      return { ...state, refreshing: action.payload };
    case "SET_DATA":
      return { ...state, ...action.payload };
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_MODAL_VISIBLE":
      return { ...state, modalVisible: action.payload };
    case "SET_LOADING_DETAIL":
      return { ...state, loadingDetail: action.payload };
    case "SET_SELECTED_CUENTA":
      return { ...state, selectedCuenta: action.payload };
    case "SET_ACTION_SHEET":
      return {
        ...state,
        actionSheetVisible: action.visible,
        activeCuenta: action.cuenta || null,
      };
    case "SET_COBRO_MODAL_VISIBLE":
      return { ...state, cobroModalVisible: action.payload };
    case "SET_COBRO_METODO_PAGO":
      return { ...state, cobroMetodoPago: action.payload };
    case "SET_COBRO_ENABLE_TIP":
      return { ...state, cobroEnableTip: action.payload };
    case "SET_COBRO_SUBMITTING":
      return { ...state, cobroSubmitting: action.payload };
    case "SET_ALERT_VISIBLE":
      return {
        ...state,
        alertConfig: { ...state.alertConfig, visible: action.payload },
      };
    case "SET_ALERT":
      return { ...state, alertConfig: action.payload };
    default:
      return state;
  }
}

const showToast = (
  title: string,
  message: string,
  type: "success" | "error" = "error",
) => {
  Toast.show({ type, text1: title, text2: message, visibilityTime: 4000 });
};

const formatMontoInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-CL").format(Number(digits));
};

const parseMontoInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};

export default function CuentasScreen() {
  const { accentColor, gradientColors, isDark } = useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const dataRef = useRef<string>("");
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;

  const [state, dispatch] = useReducer(
    cuentasReducer,
    initialCuentasState(
      (params.tab as any) === "pendientes" ? "pendientes" : "historial",
    ),
  );
  const [anulacionModalVisible, setAnulacionModalVisible] = React.useState(false);
  const [anulacionCuenta, setAnulacionCuenta] = React.useState<any>(null);
  const [anulacionMotivo, setAnulacionMotivo] = React.useState("");
  const [anulacionMonto, setAnulacionMonto] = React.useState("");
  const [anulacionSubmitting, setAnulacionSubmitting] = React.useState(false);
  const { timers, serverOffset, refreshTimers } = useTimer();
  const {
    loading,
    refreshing,
    cuentas,
    resumen,
    selectedCuenta,
    loadingDetail,
    modalVisible,
    actionSheetVisible,
    activeCuenta,
    activeTab,
    alertConfig,
    search,
    cobroModalVisible,
    cobroMetodoPago,
    cobroEnableTip,
    cobroSubmitting,
  } = state;

  const cobroClienteNombreCompleto = useMemo(() => {
    const nombre = String(selectedCuenta?.cliente_nombre || "").trim();
    const apellido = String(selectedCuenta?.cliente_apellido || "").trim();
    return [nombre, apellido].filter(Boolean).join(" ").trim() || "Sin registrar";
  }, [selectedCuenta?.cliente_apellido, selectedCuenta?.cliente_nombre]);

  const cobroClienteSaldo = Number(selectedCuenta?.cliente_saldo || 0);
  const showPrepagoCobro = !!selectedCuenta?.cliente_id && cobroClienteSaldo > 0;

  const bg = isDark ? "#000000" : "#F3F4F6";
  const cardBg = isDark ? "#111111" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? `${accentColor}40` : "rgba(0,0,0,0.05)";

  const fetchCuentas = useCallback(
    async (isManual = false) => {
      try {
        if (isManual && !refreshing)
          dispatch({ type: "SET_LOADING", payload: true });

        const timestamp = Date.now();
        const [resCuentas, resResumen] = await Promise.all([
          apiClient(`/cuentas?limit=50&_t=${timestamp}`),
          apiClient(`/cuentas?tipo=resumen&_t=${timestamp}`),
        ]);

        const actualCuentas = Array.isArray(resCuentas.data)
          ? resCuentas.data
          : Array.isArray(resCuentas)
            ? resCuentas
            : [];
        const actualResumen =
          resResumen.data ||
          (resResumen.total_por_cobrar !== undefined ? resResumen : null);

        const newData = { cuentas: actualCuentas, resumen: actualResumen };
        const serialized = JSON.stringify(newData);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;

        dispatch({
          type: "SET_DATA",
          payload: {
            cuentas: actualCuentas,
            resumen: actualResumen,
          },
        });

        if (isManual) {
          showToast(
            hasChanges ? "Éxito" : "Información",
            hasChanges ? "Datos actualizados" : "Sin cambios",
            hasChanges ? "success" : ("info" as any),
          );
        }
      } catch (error) {
        console.error("Error fetching cuentas:", error);
        if (isManual) showToast("Error", "No se pudo actualizar");
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
        dispatch({ type: "SET_REFRESHING", payload: false });
      }
    },
    [refreshing],
  );

  const cobroTotals = useMemo(() => {
    if (!selectedCuenta) return { subtotal: 0, tip: 0, total: 0 };
    const subtotal = selectedCuenta.total || 0;
    const tip = cobroEnableTip ? Math.round(subtotal * 0.1) : 0;
    return { subtotal, tip, total: subtotal + tip };
  }, [selectedCuenta, cobroEnableTip]);

  useEffect(() => {
    if (cobroModalVisible && !showPrepagoCobro && cobroMetodoPago === "prepago") {
      dispatch({ type: "SET_COBRO_METODO_PAGO", payload: "efectivo" });
    }
  }, [cobroMetodoPago, cobroModalVisible, showPrepagoCobro]);

  useFocusEffect(
    useCallback(() => {
      fetchCuentas();
      refreshTimers?.();
    }, [fetchCuentas, refreshTimers]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refresh_cuentas", () => {
      fetchCuentas();
    });
    return () => sub.remove();
  }, [fetchCuentas]);

  const onRefresh = useCallback(() => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    Promise.all([
      fetchCuentas(true),
      refreshTimers?.()
    ]);
  }, [fetchCuentas, refreshTimers]);

  const handleCobrarCuenta = useCallback((cuenta: any) => {
    dispatch({ type: "SET_ACTION_SHEET", visible: false });
    dispatch({ type: "SET_SELECTED_CUENTA", payload: cuenta });
    dispatch({ type: "SET_COBRO_MODAL_VISIBLE", payload: true });
    dispatch({ type: "SET_COBRO_METODO_PAGO", payload: "efectivo" });
    dispatch({ type: "SET_COBRO_ENABLE_TIP", payload: false });
  }, []);

  const fetchCuentaCompleta = useCallback(async (cuentaId: string | number) => {
    const timestamp = Date.now();
    const res = await apiClient(`/cuentas/${cuentaId}?_t=${timestamp}`);
    if (!res || res.error) {
      throw new Error(res?.message || "No se pudo obtener el detalle completo de la cuenta");
    }
    return res;
  }, []);

  const registrarVentaDesdeCuenta = async (cuenta: any) => {
    const ventaPayload = {
      origen: "cuenta",
      skip_client_prepago: true,
      cliente_id: cuenta?.cliente_id != null ? String(cuenta.cliente_id) : null,
      pedido_id: cuenta?.pedido_id != null ? String(cuenta.pedido_id) : null,
      metodo_pago: cobroMetodoPago,
      propina: cobroTotals.tip,
      sub_total: Number(cuenta?.sub_total ?? 0),
      total: Number(cobroTotals.total ?? cuenta?.total ?? 0),
      total_comision: Number(cuenta?.total_comision ?? 0),
      codigo: cuenta?.codigo,
      detalles:
        cuenta?.detalles?.map((d: any) => ({
          producto_id: String(d.producto_id ?? d.id_producto),
          precio: Number(d.precio ?? 0),
          cantidad: Number(d.cantidad ?? 1),
          sub_total: Number(d.sub_total ?? d.subtotal ?? 0),
          comision: Number(d.comision ?? 0),
          hostess_id: d.hostess_id != null ? String(d.hostess_id) : null,
        })) || [],
      usuarios: cuenta?.usuarios?.map((u: any) => String(u.usuario_id ?? u.id_usuario ?? u)) || [],
    };

    return await apiClient("/sales", {
      method: "POST",
      body: JSON.stringify(ventaPayload),
    });
  };

  const handleConfirmarCobro = async () => {
    if (!selectedCuenta) return;

    if (cobroMetodoPago === 'prepago') {
      const saldo = Number(selectedCuenta.cliente_saldo || 0);
      if (saldo < cobroTotals.total) {
        showToast("Saldo Insuficiente", "El saldo del cliente es menor al total de la cuenta", "error");
        return;
      }
    }

    dispatch({ type: "SET_COBRO_SUBMITTING", payload: true });
    try {
      const payload = {
        cuenta_id: selectedCuenta.id_cuenta,
        metodo_pago: cobroMetodoPago,
        propina: cobroTotals.tip,
        total_cobrado: cobroTotals.total,
        habitacion_id: selectedCuenta.habitacion_id || null,
      };

      const res = await apiClient(
        `/cuentas/${selectedCuenta.id_cuenta}/cobrar`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      if (res.success) {
        const cuentaCompleta = await fetchCuentaCompleta(selectedCuenta.id_cuenta);
        const ventaRes = await registrarVentaDesdeCuenta(cuentaCompleta);
        if (!ventaRes.success) {
          showToast(
            "Error",
            ventaRes.message || "La cuenta se cobro, pero no se pudo registrar la venta",
            "error"
          );
          return;
        }
        dispatch({ type: "SET_COBRO_MODAL_VISIBLE", payload: false });
        showToast("Éxito", "Cuenta cobrada correctamente", "success");
        fetchCuentas();
      } else {
        showToast("Error", res.message || "Error al cobrar");
      }
    } catch {
      showToast("Error", "Error de conexión al procesar el cobro");
    } finally {
      dispatch({ type: "SET_COBRO_SUBMITTING", payload: false });
    }
  };

  const handleFinalizarTemporizador = useCallback((cuenta: any) => {
    dispatch({
      type: "SET_ALERT",
      payload: {
        visible: true,
        title: "Finalizar temporizador",
        message: `Se finalizara el temporizador de la cuenta ${cuenta?.codigo}.`,
        type: "warning",
        onConfirm: async () => {
          try {
            dispatch({ type: "SET_ALERT_VISIBLE", payload: false });
            dispatch({ type: "SET_ACTION_SHEET", visible: false });
            const res = await apiClient(`/cuentas/${cuenta.id_cuenta}/stop`, {
              method: "PATCH",
            });
            if (res.success) {
              showToast("Exito", "Temporizador finalizado", "success");
              refreshTimers?.();
              fetchCuentas();
            } else {
              showToast("Error", res.message || "No se pudo finalizar el temporizador");
            }
          } catch {
            showToast("Error", "Error al finalizar el temporizador");
          }
        },
        onCancel: () => dispatch({ type: "SET_ALERT_VISIBLE", payload: false }),
      },
    });
  }, [fetchCuentas, refreshTimers]);

  const handleSolicitarAnulacion = useCallback((cuenta: any) => {
    dispatch({ type: "SET_ACTION_SHEET", visible: false });
    setAnulacionCuenta(cuenta);
    setAnulacionMotivo("");
    setAnulacionMonto(formatMontoInput(String(Number(cuenta?.total || 0))));
    setAnulacionModalVisible(true);
  }, []);

  const handleEnviarSolicitudAnulacion = useCallback(async () => {
    if (!anulacionCuenta) return;

    const motivo = anulacionMotivo.trim();
    const monto = parseMontoInput(anulacionMonto);
    if (!motivo) {
      showToast("Motivo requerido", "Debes ingresar el motivo de la anulacion");
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      showToast("Monto invalido", "Debes ingresar un monto mayor a 0");
      return;
    }
    if (monto > Number(anulacionCuenta.total || 0)) {
      showToast("Monto invalido", "El monto no puede ser mayor al total de la cuenta");
      return;
    }

    try {
      setAnulacionSubmitting(true);
      const res = await apiClient("/cuentas/anulacion", {
        method: "POST",
        body: JSON.stringify({
          cuentaId: anulacionCuenta.id_cuenta,
          clienteNombre: anulacionCuenta.cliente_nombre || "",
          motivo,
          monto,
        }),
      });

      if (res.success) {
        setAnulacionModalVisible(false);
        setAnulacionCuenta(null);
        setAnulacionMotivo("");
        setAnulacionMonto("");
        showToast("Exito", "La anulacion fue solicitada por WhatsApp", "success");
        fetchCuentas();
      } else {
        showToast("Error", res.message || "No se pudo solicitar la anulacion");
      }
    } catch {
      showToast("Error", "Error al solicitar la anulacion");
    } finally {
      setAnulacionSubmitting(false);
    }
  }, [anulacionCuenta, anulacionMotivo, anulacionMonto, fetchCuentas]);

  const handleVerDetalles = async (id: string) => {
    dispatch({ type: "SET_ACTION_SHEET", visible: false });
    dispatch({ type: "SET_LOADING_DETAIL", payload: true });
    dispatch({ type: "SET_MODAL_VISIBLE", payload: true });
    try {
      const timestamp = Date.now();
      const res = await apiClient(`/cuentas/${id}?_t=${timestamp}`);
      if (res && !res.error) {
        dispatch({ type: "SET_SELECTED_CUENTA", payload: res });
      } else {
        showToast("Error", "No se pudo obtener el detalle de la cuenta");
        dispatch({ type: "SET_MODAL_VISIBLE", payload: false });
      }
    } catch {
      showToast("Error", "Error de conexión al cargar detalles");
      dispatch({ type: "SET_MODAL_VISIBLE", payload: false });
    } finally {
      dispatch({ type: "SET_LOADING_DETAIL", payload: false });
    }
  };

  const DetailSkeleton = () => (
    <View style={{ padding: 20 }}>
      {/* Header Skeleton */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 25,
        }}
      >
        <View>
          <Skeleton width={180} height={28} style={{ marginBottom: 10 }} />
          <Skeleton width={120} height={18} />
        </View>
        <Skeleton width={44} height={44} borderRadius={22} />
      </View>

      {/* Grid Info Skeleton */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
        <Skeleton style={{ flex: 1 }} height={65} borderRadius={18} />
        <Skeleton style={{ flex: 1 }} height={65} borderRadius={18} />
      </View>

      {/* Hostess Badges Skeleton */}
      <Skeleton width={140} height={20} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 25 }}>
        <Skeleton width={90} height={32} borderRadius={16} />
        <Skeleton width={90} height={32} borderRadius={16} />
      </View>

      {/* Table Skeleton */}
      <Skeleton
        width="100%"
        height={180}
        borderRadius={24}
        style={{ marginBottom: 25 }}
      />

      {/* Footer Summary Skeleton */}
      <View style={{ gap: 15 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Skeleton width={100} height={18} />
          <Skeleton width={80} height={18} />
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Skeleton width={120} height={26} />
          <Skeleton width={140} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );

  const CuentasSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient
        colors={gradientColors as any}
        style={[
          styles.header,
          {
            paddingTop: insets.top + (isTablet ? 20 : 10),
            paddingBottom: 25,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <Skeleton width={150} height={30} />
          <Skeleton width={44} height={44} borderRadius={22} />
        </View>
        <Skeleton width="60%" height={24} />
      </LinearGradient>
      <View style={{ padding: isTablet ? 12 : 16 }}>
        <Skeleton height={120} borderRadius={24} style={{ marginBottom: 20 }} />
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
          <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                width: isTablet ? "48.5%" : "100%",
                padding: 16,
                borderRadius: 20,
                marginBottom: 14,
                backgroundColor: cardBg,
                borderWidth: 1,
                borderColor,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <Skeleton width={100} height={20} />
                <Skeleton width={80} height={20} borderRadius={10} />
              </View>
              <Skeleton width="100%" height={60} borderRadius={12} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );

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
              dispatch({
                type: "SET_ACTION_SHEET",
                visible: true,
                cuenta: item,
              })
            }
            style={({ pressed }) => [{
              flex: 1, borderRadius: 24, padding: 16, borderWidth: 1,
              marginBottom: 16, marginHorizontal: 8,
              backgroundColor: cardBg,
              borderColor: isOverdue ? '#EF4444' : borderColor,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            }]}
          >
            {/* Header */}
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

            {/* Details List */}
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

            {/* Timer Hero */}
            {hasTimer && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12,
                backgroundColor: isOverdue ? '#EF444415' : `${accentColor}08`,
              }}>
                <Ionicons name="time" size={24} color={isOverdue ? '#EF4444' : accentColor} />
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

            {/* Finance Box */}
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

            {/* Actions Box */}
            {isPending && (
              <View style={{ gap: 10, marginTop: 15 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {hasTimer && (
                    <Pressable
                      style={({ pressed }) => [{
                        flex: 1, height: 44, borderRadius: 12,
                        justifyContent: 'center', alignItems: 'center',
                        flexDirection: 'row', gap: 6,
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.14)' : '#FFF7ED',
                        borderWidth: 1, borderColor: '#F59E0B55',
                        opacity: pressed ? 0.7 : 1,
                      }]}
                      onPress={() => handleFinalizarTemporizador(item)}
                    >
                      <Ionicons name="stop-circle-outline" size={16} color="#F59E0B" />
                      <Text style={{ color: '#F59E0B', fontWeight: '900', fontSize: 12 }}>FINALIZAR</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={({ pressed }) => [{
                      flex: 1, height: 44, borderRadius: 12,
                      justifyContent: 'center', alignItems: 'center',
                      flexDirection: 'row', gap: 6,
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2',
                      borderWidth: 1, borderColor: '#EF444455',
                      opacity: pressed ? 0.7 : 1,
                    }]}
                    onPress={() => handleSolicitarAnulacion(item)}
                  >
                    <Ionicons name="ban-outline" size={16} color="#EF4444" />
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
      timers,
      serverOffset,
      accentColor,
      isDark,
      router,
    ],
  );



  const filteredCuentas = useMemo(() => {
    let list = activeTab === "historial" ? cuentas : cuentas.filter((c) => Number(c.estado) === 1);
    if (search.trim()) {
        const query = search.toLowerCase();
        list = list.filter(c => 
            (c.codigo && c.codigo.toLowerCase().includes(query)) ||
            (c.cliente_nombre && c.cliente_nombre.toLowerCase().includes(query)) ||
            (c.habitacion_nombre && c.habitacion_nombre.toLowerCase().includes(query))
        );
    }
    return list;
  }, [cuentas, activeTab, search]);

  if (loading && !refreshing && cuentas.length === 0)
    return <CuentasSkeleton />;

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
                    onChangeText={(t) => dispatch({ type: "SET_SEARCH", payload: t })}
                />
                {search.length > 0 && (
                    <Pressable onPress={() => dispatch({ type: "SET_SEARCH", payload: "" })}>
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
                <View style={[styles.summaryPill, { backgroundColor: '#10B98110' }]}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
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
                  onPress={() => dispatch({ type: "SET_ACTIVE_TAB", payload: "historial" })}
                >
                  <Text style={[styles.tabText, activeTab === "historial" ? { color: "#FFF" } : { color: textSecondary }]}>Todas</Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, activeTab === "pendientes" && { backgroundColor: accentColor }]}
                  onPress={() => dispatch({ type: "SET_ACTIVE_TAB", payload: "pendientes" })}
                >
                  <View style={styles.tabWithBadge}>
                    <Text style={[styles.tabText, activeTab === "pendientes" ? { color: "#FFF" } : { color: textSecondary }]}>Pendientes</Text>
                    {cuentas.filter((c) => Number(c.estado) === 1).length > 0 && (
                      <View style={[styles.tabBadge, activeTab === 'pendientes' ? { backgroundColor: '#FFF' } : { backgroundColor: accentColor }]}>
                        <Text style={[styles.tabBadgeText, activeTab === 'pendientes' ? { color: accentColor } : { color: '#FFF' }]}>
                          {cuentas.filter((c) => Number(c.estado) === 1).length}
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

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() =>
          dispatch({ type: "SET_MODAL_VISIBLE", payload: false })
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.detailModal,
              { backgroundColor: cardBg, borderColor },
            ]}
          >
            {loadingDetail ? (
              <DetailSkeleton />
            ) : (
              selectedCuenta && (
                <>
                    <View style={styles.modalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalTitleText, { color: textPrimary }]}>
                          Detalle de Cuenta
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColors[Number(selectedCuenta.estado)] || '#6B7280' }} />
                          <Text style={[styles.modalSubText, { color: textSecondary, fontWeight: '800' }]}>
                            {statusLabels[Number(selectedCuenta.estado)] || "Desconocido"} • #{selectedCuenta.codigo}
                          </Text>
                        </View>
                      </View>
                      <Pressable 
                        onPress={() => dispatch({ type: "SET_MODAL_VISIBLE", payload: false })}
                        style={{ padding: 8 }}
                      >
                        <Ionicons name="close-circle" size={32} color={textSecondary} />
                      </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                      <View style={[styles.infoGrid, { marginTop: 10 }]}>
                        <View style={styles.gridItem}>
                          <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <Ionicons name="person" size={16} color={accentColor} />
                            <Text style={[styles.gridValue, { color: textPrimary, fontSize: 15, fontWeight: '800' }]}>
                              {selectedCuenta.cliente_nombre || "Sin registrar"}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.gridItem}>
                          <Text style={[styles.gridLabel, { color: textSecondary }]}>FECHA Y HORA</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <Ionicons name="calendar" size={16} color={accentColor} />
                            <Text style={[styles.gridValue, { color: textPrimary, fontWeight: '700' }]}>
                              {selectedCuenta.fecha_crea ? (() => {
                                const d = parseDateSafe(selectedCuenta.fecha_crea);
                                return d.toLocaleString("es-ES", {
                                  day: "2-digit", month: "2-digit", year: "numeric",
                                  hour: "2-digit", minute: "2-digit", hour12: true
                                }).replace(/,/g, '');
                              })() : "-"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.gridItem}>
                          <Text style={[styles.gridLabel, { color: textSecondary }]}>HABITACIÓN / SECTOR</Text>
                          <Text style={[styles.gridValue, { color: textPrimary }]}>
                            {selectedCuenta.habitacion_numero || "Barra / General"}
                          </Text>
                        </View>

                        <View style={styles.gridItem}>
                          <Text style={[styles.gridLabel, { color: textSecondary }]}>REGISTRADO POR</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            {selectedCuenta.foto_cajero ? (
                              <Image 
                                source={{ uri: `${BASE_URL}/img/users/${selectedCuenta.foto_cajero}` }} 
                                style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB' }}
                              />
                            ) : (
                              <Ionicons name="person-circle" size={24} color={textSecondary} />
                            )}
                            <Text style={[styles.gridValue, { color: textPrimary }]}>
                              {selectedCuenta.nombre_cajero || "Sistema"}
                            </Text>
                          </View>
                        </View>

                        {selectedCuenta.nombre_cobrador && (
                          <View style={styles.gridItem}>
                            <Text style={[styles.gridLabel, { color: "#10B981" }]}>COBRADO POR</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              {selectedCuenta.foto_cobrador ? (
                                <Image 
                                  source={{ uri: `${BASE_URL}/img/users/${selectedCuenta.foto_cobrador}` }} 
                                  style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', borderWidth: 1, borderColor: '#10B981' }}
                                />
                              ) : (
                                <Ionicons name="person-circle" size={24} color="#10B981" />
                              )}
                              <Text style={[styles.gridValue, { color: "#10B981", fontWeight: '800' }]}>
                                {selectedCuenta.nombre_cobrador}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {(() => {
                        const roomHistory = Array.isArray(selectedCuenta.habitaciones_historial_data)
                          ? selectedCuenta.habitaciones_historial_data
                          : [];
                        const totalRoomTime = Number(selectedCuenta.tiempo_total ?? selectedCuenta.tiempo ?? 0);
                        const activeRoomTime = Number(selectedCuenta.tiempo_activo ?? 0);

                        if (totalRoomTime <= 0 && roomHistory.length === 0) return null;

                        return (
                          <View style={{ marginTop: 22, paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                              Historial de Habitacion
                            </Text>

                            <View
                              style={{
                                backgroundColor: isDark ? "#171717" : "#F8FAFC",
                                borderRadius: 22,
                                padding: 16,
                                borderWidth: 1,
                                borderColor,
                                marginBottom: 14,
                              }}
                            >
                              <Text style={[styles.gridLabel, { color: textSecondary }]}>TIEMPO TOTAL REGISTRADO</Text>
                              <Text style={[styles.gridValue, { color: textPrimary, fontWeight: '900', marginTop: 4 }]}>
                                {totalRoomTime} min
                              </Text>
                              {activeRoomTime > 0 && (
                                <Text style={{ color: accentColor, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                                  Timer activo: {activeRoomTime} min
                                </Text>
                              )}
                            </View>

                            {roomHistory.length > 0 && (
                              <View style={{ gap: 10 }}>
                                {roomHistory.map((entry: any, index: number) => {
                                  const assignedMinutes = Number(entry.assignedMinutes || 0);
                                  const consumedMinutes = Number(entry.consumedMinutes || 0);
                                  const remainingMinutes = Math.max(
                                    0,
                                    Number(entry.remainingMinutes ?? assignedMinutes - consumedMinutes)
                                  );

                                  return (
                                    <View
                                      key={`${entry.roomId || 'room'}-${entry.startedAt || index}-${index}`}
                                      style={{
                                        backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                                        borderRadius: 20,
                                        padding: 14,
                                        borderWidth: 1,
                                        borderColor,
                                      }}
                                    >
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 14 }}>
                                          {entry.roomName || 'Habitacion'}
                                        </Text>
                                        <Text style={{ color: entry.isActive ? accentColor : textSecondary, fontWeight: '800', fontSize: 12 }}>
                                          {entry.isActive ? 'Activo' : 'Finalizado'}
                                        </Text>
                                      </View>

                                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                        <View style={{ flex: 1, backgroundColor: isDark ? '#262626' : '#F8FAFC', borderRadius: 14, padding: 10 }}>
                                          <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '900' }}>ASIGNADO</Text>
                                          <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '900', marginTop: 4 }}>
                                            {assignedMinutes} min
                                          </Text>
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: isDark ? '#2A2114' : '#FFF7ED', borderRadius: 14, padding: 10 }}>
                                          <Text style={{ color: isDark ? '#FBBF24' : '#C2410C', fontSize: 10, fontWeight: '900' }}>CONSUMIDO</Text>
                                          <Text style={{ color: isDark ? '#FBBF24' : '#C2410C', fontSize: 15, fontWeight: '900', marginTop: 4 }}>
                                            {consumedMinutes} min
                                          </Text>
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: isDark ? '#13261D' : '#ECFDF5', borderRadius: 14, padding: 10 }}>
                                          <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '900' }}>RESTANTE</Text>
                                          <Text style={{ color: '#10B981', fontSize: 15, fontWeight: '900', marginTop: 4 }}>
                                            {remainingMinutes} min
                                          </Text>
                                        </View>
                                      </View>

                                      <Text style={{ color: textSecondary, fontSize: 12 }}>
                                        Inicio: {entry.startedAt ? parseDateSafe(entry.startedAt).toLocaleString("es-ES", {
                                          day: "2-digit", month: "2-digit", year: "numeric",
                                          hour: "2-digit", minute: "2-digit", hour12: true
                                        }).replace(/,/g, '') : "-"}
                                      </Text>
                                      <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                                        Fin: {entry.endedAt ? parseDateSafe(entry.endedAt).toLocaleString("es-ES", {
                                          day: "2-digit", month: "2-digit", year: "numeric",
                                          hour: "2-digit", minute: "2-digit", hour12: true
                                        }).replace(/,/g, '') : "En curso"}
                                      </Text>
                                      {entry.carriedFromPrevious && (
                                        <Text style={{ color: accentColor, fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                                          Tiempo agregado tras cambio de habitacion
                                        </Text>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })()}

                      {(() => {
                        const resumen = selectedCuenta.resumen_financiero || {};
                        const solicitudes = Array.isArray(selectedCuenta.solicitudes_anulacion)
                          ? selectedCuenta.solicitudes_anulacion
                          : [];
                        const totalOriginal = Number(resumen.total_original ?? selectedCuenta.total ?? 0);
                        const totalActual = Number(resumen.total_actual ?? selectedCuenta.total ?? 0);
                        const totalAnulado = Number(resumen.total_anulado_aprobado ?? 0);
                        const totalPendiente = Number(resumen.total_anulacion_pendiente ?? 0);

                        return (
                          <View style={{ marginTop: 22, paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                              Resumen financiero
                            </Text>

                            <View style={{ gap: 10 }}>
                              <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1, backgroundColor: isDark ? '#1A1A1A' : '#F8FAFC', borderRadius: 20, padding: 14, borderWidth: 1, borderColor }}>
                                  <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '900' }}>TOTAL ORIGINAL</Text>
                                  <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '900', marginTop: 6 }}>
                                    ${totalOriginal.toLocaleString('es-CL')}
                                  </Text>
                                </View>

                                <View style={{ flex: 1, backgroundColor: isDark ? '#221417' : '#FFF1F2', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: isDark ? '#3F1D24' : '#FECDD3' }}>
                                  <Text style={{ color: '#E11D48', fontSize: 11, fontWeight: '900' }}>ANULADO APROBADO</Text>
                                  <Text style={{ color: '#E11D48', fontSize: 20, fontWeight: '900', marginTop: 6 }}>
                                    ${totalAnulado.toLocaleString('es-CL')}
                                  </Text>
                                  {totalPendiente > 0 && (
                                    <Text style={{ color: isDark ? '#FBBF24' : '#B45309', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                                      Pendiente: ${totalPendiente.toLocaleString('es-CL')}
                                    </Text>
                                  )}
                                </View>
                              </View>

                              <View style={{ backgroundColor: isDark ? '#13261D' : '#ECFDF5', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: isDark ? '#1F5139' : '#A7F3D0' }}>
                                <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '900' }}>TOTAL ACTUAL A COBRAR</Text>
                                <Text style={{ color: '#10B981', fontSize: 24, fontWeight: '900', marginTop: 6 }}>
                                  ${totalActual.toLocaleString('es-CL')}
                                </Text>
                              </View>
                            </View>

                            {solicitudes.length > 0 && (
                              <View style={{ marginTop: 14, gap: 10 }}>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: textSecondary }}>
                                  Historial de anulacion
                                </Text>
                                {solicitudes.map((sol: any, index: number) => {
                                  const estado = String(sol.estado || '').toLowerCase();
                                  const chipBg =
                                    estado === 'aprobado'
                                      ? (isDark ? '#13261D' : '#ECFDF5')
                                      : estado === 'rechazado'
                                        ? (isDark ? '#221417' : '#FFF1F2')
                                        : (isDark ? '#2A2114' : '#FFF7ED');
                                  const chipColor =
                                    estado === 'aprobado'
                                      ? '#10B981'
                                      : estado === 'rechazado'
                                        ? '#E11D48'
                                        : '#D97706';

                                  return (
                                    <View
                                      key={sol.id || index}
                                      style={{
                                        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                                        borderRadius: 20,
                                        padding: 14,
                                        borderWidth: 1,
                                        borderColor,
                                      }}
                                    >
                                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={{ color: textPrimary, fontWeight: '900', fontSize: 16 }}>
                                          ${Number(sol.monto || 0).toLocaleString('es-CL')}
                                        </Text>
                                        <View style={{ backgroundColor: chipBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                                          <Text style={{ color: chipColor, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>
                                            {estado || 'pendiente'}
                                          </Text>
                                        </View>
                                      </View>

                                      <Text style={{ color: textSecondary, fontSize: 12 }}>
                                        Solicitada: {sol.fecha_crea ? parseDateSafe(sol.fecha_crea).toLocaleString("es-ES", {
                                          day: "2-digit", month: "2-digit", year: "numeric",
                                          hour: "2-digit", minute: "2-digit", hour12: true
                                        }).replace(/,/g, '') : "-"}
                                      </Text>
                                      {!!sol.fecha_mod && estado !== 'pendiente' && (
                                        <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                                          Resuelta: {parseDateSafe(sol.fecha_mod).toLocaleString("es-ES", {
                                            day: "2-digit", month: "2-digit", year: "numeric",
                                            hour: "2-digit", minute: "2-digit", hour12: true
                                          }).replace(/,/g, '')}
                                        </Text>
                                      )}
                                      {!!sol.motivo && (
                                        <Text style={{ color: textPrimary, fontSize: 13, marginTop: 8, lineHeight: 18 }}>
                                          {sol.motivo}
                                        </Text>
                                      )}
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })()}

                      <View style={{ marginTop: 25, paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: textSecondary, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                          Detalle de Consumo
                        </Text>
                        
                        {(() => {
                          const details = selectedCuenta.detalles || [];
                          const grouped = details.reduce((acc: any[], current: any) => {
                            const key = `${current.producto}-${current.hostess_nick || 'SIN ANFITRIONA'}-${current.added_by || 'S'}`;
                            const existingIndex = acc.findIndex(item => item.groupKey === key);
                            if (existingIndex > -1) {
                              acc[existingIndex].cantidad += current.cantidad;
                              acc[existingIndex].sub_total += current.sub_total;
                              acc[existingIndex].comision += (current.comision || 0);
                            } else {
                              acc.push({ ...current, groupKey: key });
                            }
                            return acc;
                          }, []);

                          if (grouped.length === 0) {
                            return (
                              <View style={{ padding: 40, alignItems: 'center', backgroundColor: isDark ? '#111' : '#F5F5F5', borderRadius: 24, borderStyle: 'dashed', borderWidth: 1, borderColor }}>
                                <Ionicons name="cart-outline" size={32} color={textSecondary} />
                                <Text style={{ color: textSecondary, fontWeight: '700', marginTop: 10 }}>Sin consumos</Text>
                              </View>
                            );
                          }

                          return (
                            <View style={{ gap: 14 }}>
                              {grouped.map((det: any, index: number) => (
                                <View 
                                  key={index}
                                  style={{
                                    backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
                                    borderRadius: 24,
                                    padding: 18,
                                    borderWidth: 1,
                                    borderColor: borderColor,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 6 },
                                    shadowOpacity: isDark ? 0.4 : 0.08,
                                    shadowRadius: 12,
                                    elevation: 4,
                                  }}
                                >
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ backgroundColor: accentColor + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: accentColor + '20' }}>
                                      <Text style={{ fontSize: 13, fontWeight: '900', color: accentColor }}>
                                        CANT: {det.cantidad}
                                      </Text>
                                    </View>
                                    {det.added_by && (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isDark ? '#262626' : '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 }}>
                                        {det.added_by_foto ? (
                                          <Image 
                                            source={{ uri: `${BASE_URL}/img/users/${det.added_by_foto}` }} 
                                            style={{ width: 22, height: 22, borderRadius: 11 }}
                                          />
                                        ) : (
                                          <Ionicons name="person-circle" size={18} color={accentColor} />
                                        )}
                                        <Text style={{ fontSize: 12, color: textPrimary, fontWeight: '800' }}>
                                          Vía: {det.added_by}
                                        </Text>
                                      </View>
                                    )}
                                  </View>

                                  <Text style={{ fontSize: 19, fontWeight: '900', color: textPrimary, marginBottom: 15, letterSpacing: -0.5 }}>
                                    {det.producto}
                                  </Text>

                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 15, borderTopWidth: 1, borderTopColor: borderColor + '40' }}>
                                    <View style={{ gap: 6 }}>
                                      <Text style={{ fontSize: 10, fontWeight: '900', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Anfitriona</Text>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {det.hostess_foto ? (
                                          <Image 
                                            source={{ uri: `${BASE_URL}/img/users/${det.hostess_foto}` }} 
                                            style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#E5E7EB' }}
                                          />
                                        ) : (
                                          <Ionicons name="woman" size={18} color={accentColor} />
                                        )}
                                        <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>
                                          {det.hostess_nick || "SIN ANFITRIONA"}
                                        </Text>
                                      </View>
                                    </View>

                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                      <Text style={{ fontSize: 10, fontWeight: '900', color: "#F43F5E", textTransform: 'uppercase' }}>Comisión</Text>
                                      <Text style={{ fontSize: 16, fontWeight: '900', color: "#F43F5E" }}>
                                        ${Number(det.comision || 0).toLocaleString('es-CL')}
                                      </Text>
                                    </View>

                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                      <Text style={{ fontSize: 10, fontWeight: '900', color: "#10B981", textTransform: 'uppercase' }}>Subtotal</Text>
                                      <Text style={{ fontSize: 22, fontWeight: '900', color: "#10B981" }}>
                                        ${Number(det.sub_total || 0).toLocaleString('es-CL')}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              ))}
                            </View>
                          );
                        })()}
                      </View>
                    </ScrollView>

                    <View style={[styles.summarySection, { borderTopWidth: 1, borderTopColor: borderColor + '40', paddingTop: 15 }]}>
                      {/* Subtotal Productos */}
                      <View style={[styles.summaryRow, { marginBottom: 6 }]}>
                        <Text style={[styles.summaryLabel, { color: textSecondary, fontSize: 13 }]}>Subtotal Consumos</Text>
                        <Text style={[styles.summaryValue, { color: textPrimary, fontWeight: '700' }]}>
                          ${(selectedCuenta.sub_total || selectedCuenta.total || 0).toLocaleString('es-CL')}
                        </Text>
                      </View>

                      {/* Propina (solo si existe y es > 0) */}
                      {(selectedCuenta.propina > 0) && (
                        <View style={[styles.summaryRow, { marginBottom: 12 }]}>
                          <Text style={[styles.summaryLabel, { color: textSecondary, fontSize: 13 }]}>Atención / Propina (+)</Text>
                          <Text style={[styles.summaryValue, { color: "#10B981", fontWeight: '700' }]}>
                            ${Number(selectedCuenta.propina).toLocaleString('es-CL')}
                          </Text>
                        </View>
                      )}

                      {Number(selectedCuenta?.resumen_financiero?.total_original ?? 0) > Number(selectedCuenta?.total || 0) && (
                        <View style={[styles.summaryRow, { marginBottom: 10 }]}>
                          <Text style={[styles.summaryLabel, { color: textSecondary, fontSize: 13 }]}>Total original</Text>
                          <Text style={[styles.summaryValue, { color: textPrimary, fontWeight: '700' }]}>
                            ${Number(selectedCuenta?.resumen_financiero?.total_original || 0).toLocaleString('es-CL')}
                          </Text>
                        </View>
                      )}

                      {Number(selectedCuenta?.resumen_financiero?.total_anulado_aprobado || 0) > 0 && (
                        <View style={[styles.summaryRow, { marginBottom: 10 }]}>
                          <Text style={[styles.summaryLabel, { color: "#E11D48", fontSize: 13 }]}>Anulado aprobado</Text>
                          <Text style={[styles.summaryValue, { color: "#E11D48", fontWeight: '700' }]}>
                            ${Number(selectedCuenta?.resumen_financiero?.total_anulado_aprobado || 0).toLocaleString('es-CL')}
                          </Text>
                        </View>
                      )}

                      {/* Total Final Destacado */}
                      <View
                        style={[
                          styles.summaryRow,
                          {
                            marginTop: 4,
                            borderTopWidth: 1,
                            borderTopColor: borderColor,
                            paddingTop: 12,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.totalLabelFinal,
                            { color: textPrimary, fontSize: 18 }
                          ]}
                        >
                          TOTAL ACTUAL
                        </Text>
                        <Text
                          style={[styles.totalValFinal, { color: accentColor, fontSize: 24, fontWeight: '900' }]}
                        >
                          ${(Number(selectedCuenta.total || 0)).toLocaleString('es-CL')}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={[
                        styles.modalCloseBtn,
                        { backgroundColor: accentColor, marginTop: 20 },
                      ]}
                      onPress={() =>
                        dispatch({ type: "SET_MODAL_VISIBLE", payload: false })
                      }
                    >
                      <Text style={styles.modalCloseBtnText}>
                        Cerrar Detalles
                      </Text>
                    </Pressable>
                </>
              )
            )}
          </View>
        </View>
      </Modal>

      {/* Cobro Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cobroModalVisible}
        onRequestClose={() =>
          dispatch({ type: "SET_COBRO_MODAL_VISIBLE", payload: false })
        }
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.detailModal,
              {
                backgroundColor: cardBg,
                borderColor,
                height: "auto",
                maxHeight: "80%",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitleText, { color: textPrimary }]}>
                  Cobrar Cuenta
                </Text>
                <Text style={[styles.modalSubText, { color: textSecondary }]}>
                  Resumen de pago para {selectedCuenta?.codigo}
                </Text>
                <Text style={[styles.modalSubText, { color: textPrimary, marginTop: 4, fontWeight: "800" }]}>
                  Cliente: {cobroClienteNombreCompleto}
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  dispatch({ type: "SET_COBRO_MODAL_VISIBLE", payload: false })
                }
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View
                style={[
                  styles.infoBannerCobro,
                  {
                    backgroundColor: isDark ? "#111827" : "#F9FAFB",
                    borderColor,
                  },
                ]}
              >
                <View style={styles.summaryRowCobro}>
                  <Text
                    style={[styles.summaryLabelCobro, { color: textSecondary }]}
                  >
                    Subtotal Cuenta
                  </Text>
                  <Text
                    style={[styles.summaryValCobro, { color: textPrimary }]}
                  >
                    ${cobroTotals.subtotal.toLocaleString()}
                  </Text>
                </View>

                <TipCheckbox
                  enabled={cobroEnableTip}
                  onToggle={(val) =>
                    dispatch({ type: "SET_COBRO_ENABLE_TIP", payload: val })
                  }
                  tipAmount={cobroTotals.tip}
                />

                <View
                  style={[
                    styles.dividerCobro,
                    { backgroundColor: borderColor },
                  ]}
                />

                <View style={styles.summaryRowCobro}>
                  <Text
                    style={[styles.totalLabelCobro, { color: textPrimary }]}
                  >
                    TOTAL A COBRAR
                  </Text>
                  <Text style={[styles.totalValCobro, { color: accentColor }]}>
                    ${cobroTotals.total.toLocaleString()}
                  </Text>
                </View>
              </View>

              {showPrepagoCobro && (
                <View style={{ marginBottom: 15, padding: 12, backgroundColor: `${accentColor}10`, borderRadius: 12, borderWidth: 1, borderColor: `${accentColor}30` }}>
                  <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Saldo Prepago Cliente</Text>
                  <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '900', marginTop: 2 }}>
                    ${cobroClienteSaldo.toLocaleString('es-CL')}
                  </Text>
                </View>
              )}

              <PaymentMethodSelect
                selectedMethod={cobroMetodoPago}
                showPrepago={showPrepagoCobro}
                onSelect={(method) =>
                  dispatch({ type: "SET_COBRO_METODO_PAGO", payload: method })
                }
              />

              <Pressable
                style={[
                  styles.cobrarSubmitBtn,
                  { backgroundColor: accentColor },
                  cobroSubmitting && { opacity: 0.7 },
                ]}
                onPress={handleConfirmarCobro}
                disabled={cobroSubmitting}
              >
                {cobroSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="cash-outline"
                      size={20}
                      color="#FFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.cobrarSubmitBtnText}>
                      Confirmar Cobro
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.cobrarCancelBtn,
                  { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderWidth: 1, borderColor: accentColor },
                ]}
                onPress={() =>
                  dispatch({ type: "SET_COBRO_MODAL_VISIBLE", payload: false })
                }
                disabled={cobroSubmitting}
              >
                <Text
                  style={[styles.cobrarCancelBtnText, { color: textPrimary }]}
                >
                  Cerrar
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Action Sheet Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={actionSheetVisible}
        onRequestClose={() =>
          dispatch({ type: "SET_ACTION_SHEET", visible: false })
        }
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => dispatch({ type: "SET_ACTION_SHEET", visible: false })}
        >
          <View style={[styles.actionSheet, { backgroundColor: cardBg }]}>
            <View style={styles.actionSheetHeader}>
              <View style={styles.actionSheetHandle} />
              <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>
                Opciones de Cuenta
              </Text>
              <Text style={[styles.actionSheetSub, { color: textSecondary }]}>
                Código: {activeCuenta?.codigo}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.actionItem,
                pressed && styles.actionItemPressed,
              ]}
              onPress={() => handleVerDetalles(activeCuenta?.id_cuenta)}
            >
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: `${accentColor}15` },
                ]}
              >
                <Ionicons name="eye-outline" size={22} color={accentColor} />
              </View>
              <Text style={[styles.actionText, { color: textPrimary }]}>
                Ver Detalles / Recibo
              </Text>
            </Pressable>
            {Number(activeCuenta?.estado) === 1 && (
              <>
                {timers.find(
                  (timer) =>
                    timer.tipoTransaccion === "cuenta" &&
                    String(timer.servicioId) === String(activeCuenta?.id_cuenta),
                ) && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionItem,
                      pressed && styles.actionItemPressed,
                    ]}
                    onPress={() => handleFinalizarTemporizador(activeCuenta)}
                  >
                    <View
                      style={[
                        styles.actionIconBox,
                        { backgroundColor: "rgba(245, 158, 11, 0.15)" },
                      ]}
                    >
                      <Ionicons name="stop-circle-outline" size={22} color="#F59E0B" />
                    </View>
                    <Text style={[styles.actionText, { color: "#F59E0B" }]}>
                      Finalizar Temporizador
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.actionItem,
                    pressed && styles.actionItemPressed,
                  ]}
                  onPress={() => handleSolicitarAnulacion(activeCuenta)}
                >
                  <View
                    style={[
                      styles.actionIconBox,
                      { backgroundColor: "rgba(239, 68, 68, 0.15)" },
                    ]}
                  >
                    <Ionicons name="ban-outline" size={22} color="#EF4444" />
                  </View>
                  <Text style={[styles.actionText, { color: "#EF4444" }]}>
                    Solicitar Anulacion
                  </Text>
                </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                ]}
                onPress={() => handleCobrarCuenta(activeCuenta)}
              >
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: `${accentColor}15` },
                  ]}
                >
                  <Ionicons name="cash-outline" size={22} color={accentColor} />
                </View>
                <Text style={[styles.actionText, { color: accentColor }]}>
                  Cobrar Cuenta
                </Text>
              </Pressable>
              </>
            )}
            {Number(activeCuenta?.estado) === 4 && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                ]}
                onPress={() => handleCobrarCuenta(activeCuenta)}
              >
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: `${accentColor}15` },
                  ]}
                >
                  <Ionicons name="cash-outline" size={22} color={accentColor} />
                </View>
                <Text style={[styles.actionText, { color: accentColor }]}>
                  Cobrar saldo
                </Text>
              </Pressable>
            )}
            <Pressable
              style={[
                styles.actionCancelBtn,
                { backgroundColor: isDark ? "#1F2937" : "#F3F4F6", borderWidth: 1, borderColor: accentColor },
              ]}
              onPress={() =>
                dispatch({ type: "SET_ACTION_SHEET", visible: false })
              }
            >
              <Text style={[styles.actionCancelText, { color: textPrimary }]}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={
          alertConfig.onCancel ||
          (() => dispatch({ type: "SET_ALERT_VISIBLE", payload: false }))
        }
        showCancel={true}
        confirmText="Confirmar"
        cancelText="Cancelar"
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={anulacionModalVisible}
        onRequestClose={() => {
          if (!anulacionSubmitting) {
            setAnulacionModalVisible(false);
            setAnulacionCuenta(null);
            setAnulacionMotivo("");
            setAnulacionMonto("");
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.detailModal,
              {
                backgroundColor: cardBg,
                borderColor,
                height: "auto",
                maxHeight: "80%",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitleText, { color: textPrimary }]}>
                  Solicitar anulacion
                </Text>
                <Text style={[styles.modalSubText, { color: textSecondary }]}>
                  Cuenta {anulacionCuenta?.codigo}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (!anulacionSubmitting) {
                    setAnulacionModalVisible(false);
                    setAnulacionCuenta(null);
                    setAnulacionMotivo("");
                    setAnulacionMonto("");
                  }
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View
                style={[
                  styles.infoBannerCobro,
                  {
                    backgroundColor: isDark ? "#111827" : "#F9FAFB",
                    borderColor,
                  },
                ]}
              >
                <View style={styles.summaryRowCobro}>
                  <Text style={[styles.summaryLabelCobro, { color: textSecondary }]}>
                    Cliente
                  </Text>
                  <Text style={[styles.summaryValCobro, { color: textPrimary, fontSize: 16 }]}>
                    {anulacionCuenta?.cliente_nombre || "Sin registrar"}
                  </Text>
                </View>
                <View style={[styles.summaryRowCobro, { marginTop: 10 }]}>
                  <Text style={[styles.summaryLabelCobro, { color: textSecondary }]}>
                    Monto total de la cuenta
                  </Text>
                  <Text style={[styles.summaryValCobro, { color: accentColor }]}>
                    ${Number(anulacionCuenta?.total || 0).toLocaleString("es-CL")}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 18, gap: 10 }}>
                <Text style={{ color: textPrimary, fontWeight: "800", fontSize: 14 }}>
                  Monto a solicitar
                </Text>
                <TextInput
                  value={anulacionMonto}
                  onChangeText={(value) => setAnulacionMonto(formatMontoInput(value))}
                  placeholder="Ingresa el monto"
                  placeholderTextColor={textSecondary}
                  keyboardType="number-pad"
                  editable={!anulacionSubmitting}
                  style={{
                    height: 52,
                    borderRadius: 18,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor,
                    backgroundColor: isDark ? "#111111" : "#FFFFFF",
                    color: textPrimary,
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                />
                <Text style={{ color: textSecondary, fontSize: 12 }}>
                  Total de referencia: ${Number(anulacionCuenta?.total || 0).toLocaleString("es-CL")}
                </Text>
              </View>

              <View style={{ marginTop: 18, gap: 10 }}>
                <Text style={{ color: textPrimary, fontWeight: "800", fontSize: 14 }}>
                  Motivo de anulacion
                </Text>
                <TextInput
                  value={anulacionMotivo}
                  onChangeText={setAnulacionMotivo}
                  placeholder="Escribe el motivo de la solicitud"
                  placeholderTextColor={textSecondary}
                  multiline
                  textAlignVertical="top"
                  editable={!anulacionSubmitting}
                  style={{
                    minHeight: 120,
                    borderRadius: 18,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderWidth: 1,
                    borderColor,
                    backgroundColor: isDark ? "#111111" : "#FFFFFF",
                    color: textPrimary,
                    fontSize: 15,
                  }}
                />
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Pressable
                onPress={() => {
                  if (!anulacionSubmitting) {
                    setAnulacionModalVisible(false);
                    setAnulacionCuenta(null);
                    setAnulacionMotivo("");
                    setAnulacionMonto("");
                  }
                }}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "transparent",
                  borderWidth: 1.5,
                  borderColor: accentColor,
                }}
              >
                <Text style={{ color: textPrimary, fontWeight: "800" }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleEnviarSolicitudAnulacion}
                disabled={anulacionSubmitting}
                style={{
                  flex: 1,
                  height: 52,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: accentColor,
                  opacity: anulacionSubmitting ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>
                  {anulacionSubmitting ? "Enviando..." : "Enviar solicitud"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
    borderRadius: 22,
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

  // Tabs
  tabContainer: {
    flexDirection: "row",
    marginTop: 20,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  tabText: { fontSize: 14, fontWeight: "700" },
  tabWithBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: { color: "#E11D48", fontSize: 11, fontWeight: "900" },



  // Cards Premium
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
    borderRadius: 12,
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
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardActionBtnCobrarText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  // Legacy aliases (used elsewhere)
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
    borderRadius: 10,
    gap: 6,
    minWidth: 90,
    justifyContent: "center",
  },
  addBtn: { backgroundColor: "#3B82F6" },
  addBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  finishBtn: {},
  finishBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  subInfoRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },

  // Empty
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

  // Modal
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
    borderRadius: 22,
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
    borderRadius: 16,
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
  totalValFinal: { fontSize: 24, fontWeight: "900", color: "#E11D48" },
  modalCloseBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  modalCloseBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  // Action Sheet
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
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionCancelText: { fontSize: 16, fontWeight: "800" },

  // Cobro Modal New Styles
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
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  cobrarSubmitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  cobrarCancelBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  cobrarCancelBtnText: { fontSize: 16, fontWeight: "800" },
  backBtnRight: {
      flexDirection: 'row', 
      alignItems: 'center', 
      height: 38, 
      borderRadius: 12, 
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 12,
      gap: 6
  },
  backTextRight: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },

});


