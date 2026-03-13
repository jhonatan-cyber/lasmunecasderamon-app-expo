import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
    ActivityIndicator,
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
import { PaymentMethod, PaymentMethodSelect } from "../../../components/cajero/forms/PaymentMethodSelect";
import { TipCheckbox } from "../../../components/cajero/forms/TipCheckbox";
import { PremiumAlert } from "../../../components/PremiumAlert";
import { Skeleton } from "../../../components/ui/Skeleton";
import { calculateRemainingTime, Timer, useTimer } from "../../../context/TimerContext";
import { useAccentColor } from "../../../hooks/useAccentColor";
import { rotateColor } from "../../../utils/colors";

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
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_REFRESHING'; payload: boolean }
    | { type: 'SET_DATA'; payload: any }
    | { type: 'SET_ACTIVE_TAB'; payload: "historial" | "pendientes" }
    | { type: 'SET_MODAL_VISIBLE'; payload: boolean }
    | { type: 'SET_LOADING_DETAIL'; payload: boolean }
    | { type: 'SET_SELECTED_CUENTA'; payload: any }
    | { type: 'SET_ACTION_SHEET'; visible: boolean; cuenta?: any }
    | { type: 'SET_COBRO_MODAL_VISIBLE'; payload: boolean }
    | { type: 'SET_COBRO_METODO_PAGO'; payload: PaymentMethod }
    | { type: 'SET_COBRO_ENABLE_TIP'; payload: boolean }
    | { type: 'SET_COBRO_SUBMITTING'; payload: boolean }
    | { type: 'SET_ALERT_VISIBLE'; payload: boolean }
    | { type: 'SET_ALERT'; payload: CuentasState['alertConfig'] };

const statusColors: Record<number, string> = {
    1: "#F59E0B", // Pendiente
    0: "#10B981", // Cobrado
};

const statusLabels: Record<number, string> = {
    1: "Pendiente",
    0: "Cobrado",
};

const CuentaTimer = React.memo(({ timer, serverOffset, accentColor }: { timer: Timer; serverOffset: number; accentColor: string }) => {
    const [remaining, setRemaining] = React.useState(() => calculateRemainingTime(timer, serverOffset));

    React.useEffect(() => {
        // Actualizar inmediatamente al montar
        setRemaining(calculateRemainingTime(timer, serverOffset));
        // Tick cada segundo
        const interval = setInterval(() => {
            setRemaining(calculateRemainingTime(timer, serverOffset));
        }, 1000);
        return () => clearInterval(interval);
    }, [timer.startTime, timer.duration, timer.isPaused, timer.remainingTime, serverOffset]);

    const isOverdue = remaining <= 0;
    const m = Math.floor(Math.abs(remaining) / 60);
    const s = Math.abs(remaining) % 60;
    const formatted = `${remaining < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;

    return (
        <Text style={{ fontWeight: '900', color: isOverdue ? '#EF4444' : accentColor, fontSize: 13, flex: 1 }}>
            {isOverdue ? 'TIEMPO AGOTADO' : formatted}
        </Text>
    );
});

const initialCuentasState = (tab: "historial" | "pendientes"): CuentasState => ({
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
    cobroModalVisible: false,
    cobroMetodoPago: 'efectivo',
    cobroEnableTip: false,
    cobroSubmitting: false,
    alertConfig: { visible: false, title: "", message: "", type: "info" },
});

function cuentasReducer(state: CuentasState, action: CuentasAction): CuentasState {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.payload };
        case 'SET_REFRESHING': return { ...state, refreshing: action.payload };
        case 'SET_DATA': return { ...state, ...action.payload };
        case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.payload };
        case 'SET_MODAL_VISIBLE': return { ...state, modalVisible: action.payload };
        case 'SET_LOADING_DETAIL': return { ...state, loadingDetail: action.payload };
        case 'SET_SELECTED_CUENTA': return { ...state, selectedCuenta: action.payload };
        case 'SET_ACTION_SHEET': return { ...state, actionSheetVisible: action.visible, activeCuenta: action.cuenta || null };
        case 'SET_COBRO_MODAL_VISIBLE': return { ...state, cobroModalVisible: action.payload };
        case 'SET_COBRO_METODO_PAGO': return { ...state, cobroMetodoPago: action.payload };
        case 'SET_COBRO_ENABLE_TIP': return { ...state, cobroEnableTip: action.payload };
        case 'SET_COBRO_SUBMITTING': return { ...state, cobroSubmitting: action.payload };
        case 'SET_ALERT_VISIBLE': return { ...state, alertConfig: { ...state.alertConfig, visible: action.payload } };
        case 'SET_ALERT': return { ...state, alertConfig: action.payload };
        default: return state;
    }
}

const showToast = (title: string, message: string, type: "success" | "error" = "error") => {
    Toast.show({ type, text1: title, text2: message, visibilityTime: 4000 });
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

    const [state, dispatch] = useReducer(cuentasReducer, initialCuentasState((params.tab as any) === "pendientes" ? "pendientes" : "historial"));
    const { timers, serverOffset, refreshTimers } = useTimer();
    const { accentBg, accentBorder } = useAccentColor();
    const {
        loading, refreshing, cuentas, resumen, selectedCuenta, loadingDetail,
        modalVisible, actionSheetVisible, activeCuenta, activeTab, alertConfig,
        cobroModalVisible, cobroMetodoPago, cobroEnableTip, cobroSubmitting
    } = state;

    const bg = isDark ? '#0F0D2E' : '#F3F4F6';
    const cardBg = isDark ? '#1E1B4B' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    const fetchCuentas = useCallback(async (isManual = false) => {
        try {
            if (isManual && !refreshing) dispatch({ type: 'SET_LOADING', payload: true });

            const timestamp = Date.now();
            const [resCuentas, resResumen] = await Promise.all([
                apiClient(`/cuentas?limit=50&_t=${timestamp}`),
                apiClient(`/cuentas?tipo=resumen&_t=${timestamp}`)
            ]);

            const actualCuentas = Array.isArray(resCuentas.data) ? resCuentas.data : (Array.isArray(resCuentas) ? resCuentas : []);
            const actualResumen = resResumen.data || (resResumen.total_por_cobrar !== undefined ? resResumen : null);

            const newData = { cuentas: actualCuentas, resumen: actualResumen };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            dispatch({
                type: 'SET_DATA', payload: {
                    cuentas: actualCuentas,
                    resumen: actualResumen
                }
            });

            if (isManual) {
                showToast(hasChanges ? "Éxito" : "Información", hasChanges ? "Datos actualizados" : "Sin cambios", hasChanges ? "success" : "info" as any);
            }
        } catch (error) {
            console.error("Error fetching cuentas:", error);
            if (isManual) showToast("Error", "No se pudo actualizar");
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, [refreshing]);

    const cobroTotals = useMemo(() => {
        if (!selectedCuenta) return { subtotal: 0, tip: 0, total: 0 };
        const subtotal = selectedCuenta.total || 0;
        const tip = cobroEnableTip ? Math.round(subtotal * 0.1) : 0;
        return { subtotal, tip, total: subtotal + tip };
    }, [selectedCuenta, cobroEnableTip]);

    // Listado consolidado de anfitrionas (general + por productos)
    const allHostesses = useMemo(() => {
        if (!selectedCuenta) return [];
        const seen = new Set();
        const list: any[] = [];

        // 1. Agregar las generales de la cuenta
        if (selectedCuenta.usuarios) {
            selectedCuenta.usuarios.forEach((u: any) => {
                const nick = u.nick || u.usuario_nombre;
                if (nick && !seen.has(nick)) {
                    seen.add(nick);
                    list.push({ nick });
                }
            });
        }

        // 2. Agregar las asignadas a productos individuales (si faltan)
        if (selectedCuenta.detalles) {
            selectedCuenta.detalles.forEach((d: any) => {
                const nick = d.hostess_nick;
                if (nick && !seen.has(nick)) {
                    seen.add(nick);
                    list.push({ nick });
                }
            });
        }

        return list;
    }, [selectedCuenta]);

    useFocusEffect(
        useCallback(() => {
            fetchCuentas();
            refreshTimers?.();
        }, [fetchCuentas, refreshTimers])
    );

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('refresh_cuentas', () => {
            fetchCuentas();
        });
        return () => sub.remove();
    }, [fetchCuentas]);

    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchCuentas(true);
    }, [fetchCuentas]);

    const handleCobrarCuenta = useCallback((cuenta: any) => {
        dispatch({ type: 'SET_ACTION_SHEET', visible: false });
        dispatch({ type: 'SET_SELECTED_CUENTA', payload: cuenta });
        dispatch({ type: 'SET_COBRO_MODAL_VISIBLE', payload: true });
        dispatch({ type: 'SET_COBRO_METODO_PAGO', payload: 'efectivo' });
        dispatch({ type: 'SET_COBRO_ENABLE_TIP', payload: false });
    }, []);

    const handleConfirmarCobro = async () => {
        if (!selectedCuenta) return;

        dispatch({ type: 'SET_COBRO_SUBMITTING', payload: true });
        try {
            const payload = {
                cuenta_id: selectedCuenta.id_cuenta,
                metodo_pago: cobroMetodoPago,
                propina: cobroTotals.tip,
                total_cobrado: cobroTotals.total,
                habitacion_id: selectedCuenta.habitacion_id || null
            };

            const res = await apiClient(`/cuentas/${selectedCuenta.id_cuenta}/cobrar`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res.success) {
                showToast("Éxito", "Cuenta cobrada correctamente", "success");
                dispatch({ type: 'SET_COBRO_MODAL_VISIBLE', payload: false });
                fetchCuentas();
            } else {
                showToast("Error", res.message || "Error al cobrar");
            }
        } catch (error) {
            showToast("Error", "Error de conexión al procesar el cobro");
        } finally {
            dispatch({ type: 'SET_COBRO_SUBMITTING', payload: false });
        }
    };

    const handleVerDetalles = async (id: number) => {
        dispatch({ type: 'SET_ACTION_SHEET', visible: false });
        dispatch({ type: 'SET_LOADING_DETAIL', payload: true });
        dispatch({ type: 'SET_MODAL_VISIBLE', payload: true });
        try {
            const timestamp = Date.now();
            const res = await apiClient(`/cuentas/${id}?_t=${timestamp}`);
            if (res && !res.error) {
                dispatch({ type: 'SET_SELECTED_CUENTA', payload: res });
            } else {
                showToast("Error", "No se pudo obtener el detalle de la cuenta");
                dispatch({ type: 'SET_MODAL_VISIBLE', payload: false });
            }
        } catch (error) {
            showToast("Error", "Error de conexión al cargar detalles");
            dispatch({ type: 'SET_MODAL_VISIBLE', payload: false });
        } finally {
            dispatch({ type: 'SET_LOADING_DETAIL', payload: false });
        }
    };

    const DetailSkeleton = () => (
        <View style={{ padding: 20 }}>
            {/* Header Skeleton */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 25 }}>
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
            <Skeleton width="100%" height={180} borderRadius={24} style={{ marginBottom: 25 }} />

            {/* Footer Summary Skeleton */}
            <View style={{ gap: 15 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Skeleton width={100} height={18} />
                    <Skeleton width={80} height={18} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
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
                style={[styles.header, {
                    paddingTop: insets.top + (isTablet ? 20 : 10),
                    paddingBottom: 25,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32
                }]}
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

    const renderCuentaCard = useCallback(({ item }: { item: any }) => {
        const productCount = item.total_detalles || (item.detalles ? item.detalles.reduce((acc: number, d: any) => acc + d.cantidad, 0) : 0);

        // Dinamismo: Rotar el color basado en el ID para que no todos sean iguales
        const itemAccent = rotateColor(accentColor, (item.id_cuenta % 10) * 36);
        const statusColor = item.estado === 1 ? itemAccent : (statusColors[item.estado] || "#6B7280");

        const isPending = item.estado === 1;
        const hasTimer = isPending && item.tiempo > 0 && item.habitacion_id;
        const timer = hasTimer ? timers.find(t =>
            t.tipoTransaccion === 'cuenta' &&
            String(t.servicioId) === String(item.id_cuenta)
        ) : null;
        const hora = new Date(item.fecha_crea).toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit' });

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: cardBg, borderColor },
                    pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
                ]}
                onPress={() => dispatch({ type: 'SET_ACTION_SHEET', visible: true, cuenta: item })}
            >
                {/* Accent bar top */}
                <View style={[styles.cardAccentBar, { backgroundColor: statusColor }]} />

                {/* Header row */}
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.cardCode, { color: textPrimary }]}>{item.codigo}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusChipText, { color: statusColor }]}>
                            {statusLabels[item.estado] || 'Desconocido'}
                        </Text>
                    </View>
                </View>

                {/* Info grid */}
                <View style={styles.cardInfoGrid}>
                    <View style={styles.cardInfoCell}>
                        <View style={[styles.cardInfoIconBox, { backgroundColor: accentBg }]}>
                            <Ionicons name="person" size={13} color={accentColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardInfoLabel, { color: textSecondary }]}>CLIENTE</Text>
                            <Text style={[styles.cardInfoValue, { color: textPrimary }]} numberOfLines={1}>
                                {item.cliente_nombre || 'Sin cliente'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.cardInfoCell}>
                        <View style={[styles.cardInfoIconBox, { backgroundColor: '#10B98112' }]}>
                            <Ionicons name="business" size={13} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardInfoLabel, { color: textSecondary }]}>HABITACIÓN</Text>
                            <Text style={[styles.cardInfoValue, { color: textPrimary }]} numberOfLines={1}>
                                {item.habitacion_nombre || item.habitacion_numero || 'Barra / General'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Timer row (if active) */}
                {hasTimer && (
                    <View style={[styles.cardTimerRow, { backgroundColor: timer ? accentBg : `${textSecondary}08`, borderColor: timer ? accentBorder : borderColor }]}>
                        <Ionicons name="stopwatch" size={14} color={timer ? accentColor : textSecondary} />
                        {timer ? (
                            <CuentaTimer timer={timer} serverOffset={serverOffset} accentColor={accentColor} />
                        ) : (
                            <Text style={[styles.cardTimerSync, { color: textSecondary, flex: 1 }]}>Sincronizando...</Text>
                        )}
                        <Text style={[styles.cardTimerTotal, { color: textSecondary }]}>
                            / {item.tiempo} min
                        </Text>
                    </View>
                )}

                {/* Footer row */}
                <View style={styles.cardFooter}>
                    <View>
                        <Text style={[styles.cardTotalBig, { color: textPrimary }]}>
                            ${item.total.toLocaleString()}
                        </Text>
                        <Text style={[styles.cardSubCount, { color: textSecondary }]}>
                            {productCount} producto{productCount !== 1 ? 's' : ''}  ·  {hora}
                        </Text>
                    </View>
                    {isPending && (
                        <View style={styles.cardActions}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.cardActionBtn,
                                    styles.cardActionBtnAdd,
                                    { backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` },
                                    pressed && { opacity: 0.75 }
                                ]}
                                onPress={() => router.push({ pathname: '/cajero/agregar-cuenta', params: { cuenta: JSON.stringify(item) } })}
                            >
                                <Ionicons name="add" size={15} color={accentColor} />
                                <Text style={[styles.cardActionBtnAddText, { color: accentColor }]}>Agregar</Text>
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.cardActionBtn,
                                    styles.cardActionBtnCobrar,
                                    { backgroundColor: accentColor, shadowColor: accentColor },
                                    pressed && { opacity: 0.75 }
                                ]}
                                onPress={() => handleCobrarCuenta(item)}
                            >
                                <Ionicons name="cash-outline" size={14} color="#FFF" />
                                <Text style={styles.cardActionBtnCobrarText}>Cobrar</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </Pressable>
        );
    }, [cardBg, borderColor, textPrimary, textSecondary, handleCobrarCuenta, timers, serverOffset]);

    if (loading && !refreshing && cuentas.length === 0) return <CuentasSkeleton />;

    const filteredCuentas = activeTab === "historial" ? cuentas : cuentas.filter((c) => c.estado === 1);

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'dark' : 'light'} />
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
                <View style={styles.headerTop}>
                    <Pressable onPress={() => router.replace("/cajero/(tabs)" as any)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={isTablet ? 30 : 24} color={isDark ? "#111827" : "#FFFFFF"} />
                    </Pressable>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginLeft: 10 }}>
                        <View>
                            <Text style={[styles.headerTitle, { color: isDark ? "#111827" : "#FFFFFF" }, isTablet && { fontSize: 28 }]}>
                                Cuentas
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: isDark ? "#6B7280" : "rgba(255,255,255,0.8)" }, isTablet && { fontSize: 17 }]}>
                                Historial y Cobros
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            <Pressable
                                onPress={() => router.push("/cajero/nueva-cuenta")}
                                style={[
                                    styles.plusBtn,
                                    { backgroundColor: isDark ? '#111827' : accentColor, shadowColor: accentColor }
                                ]}
                            >
                                <Ionicons name="add" size={isTablet ? 24 : 20} color="#FFFFFF" />
                                <Text style={[styles.plusBtnText, isTablet && { fontSize: 18 }]}>Nuevo</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
                <View style={[styles.tabContainer, {
                    borderColor: isDark ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                    backgroundColor: isDark ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.1)',
                    height: isTablet ? 56 : 48
                }]}>
                    <Pressable
                        style={[styles.tab, activeTab === "historial" && { backgroundColor: accentColor }]}
                        onPress={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'historial' })}
                    >
                        <Text style={[styles.tabText, isTablet && { fontSize: 16 }, activeTab === "historial" ? { color: "#FFF" } : { color: isDark ? "#6B7280" : "rgba(255,255,255,0.7)" }]}>
                            Todas
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tab, activeTab === "pendientes" && { backgroundColor: accentColor }]}
                        onPress={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: 'pendientes' })}
                    >
                        <View style={styles.tabWithBadge}>
                            <Text style={[styles.tabText, isTablet && { fontSize: 16 }, activeTab === "pendientes" ? { color: "#FFF" } : { color: isDark ? "#6B7280" : "rgba(255,255,255,0.7)" }]}>
                                Pendientes
                            </Text>
                            {cuentas.filter((c) => c.estado === 1).length > 0 && (
                                <View style={styles.tabBadge}>
                                    <Text style={styles.tabBadgeText}>
                                        {cuentas.filter((c) => c.estado === 1).length}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Pressable>
                </View>
            </LinearGradient>

            <FlatList
                key={numColumns}
                data={filteredCuentas}
                extraData={timers}
                renderItem={renderCuentaCard}
                numColumns={numColumns}
                columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
                contentContainerStyle={[styles.listContainer, isTablet && { paddingHorizontal: 12 }]}
                keyExtractor={(item, index) => item.id_cuenta ? item.id_cuenta.toString() : index.toString()}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
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
                ListHeaderComponent={resumen && resumen.total_por_cobrar > 0 ? (
                    <View style={[styles.resumenCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : accentColor, shadowColor: accentColor, borderColor: accentBorder, borderWidth: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <LinearGradient colors={[`${accentColor}40`, `${accentColor}10`]} style={styles.resumenIconBox}>
                                <Ionicons name="wallet-outline" size={32} color={isDark ? accentColor : "#FFF"} />
                            </LinearGradient>
                            <View style={{ marginLeft: 16 }}>
                                <Text style={[styles.resumenLabel, { color: isDark ? textSecondary : 'rgba(255,255,255,0.8)' }]}>TOTAL POR COBRAR</Text>
                                <Text style={[styles.resumenValue, { color: isDark ? '#FFF' : '#FFF' }]}>${(resumen.total_por_cobrar || 0).toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>
                ) : null}
            />

            {/* Detail Modal */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => dispatch({ type: 'SET_MODAL_VISIBLE', payload: false })}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor }]}>
                        {loadingDetail ? (
                            <DetailSkeleton />
                        ) : (
                            selectedCuenta && (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View>
                                            <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle de Cuenta</Text>
                                            <Text style={[styles.modalSubText, { color: textSecondary }]}>Código: {selectedCuenta.codigo}</Text>
                                        </View>
                                        <Pressable onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', payload: false })} style={styles.closeBtn}>
                                            <Ionicons name="close" size={24} color={textSecondary} />
                                        </Pressable>
                                    </View>
                                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                        <View style={styles.detailsGrid}>
                                            <View style={styles.gridItem}>
                                                <Text style={[styles.gridLabel, { color: textSecondary }]}>FECHA DE CUENTA</Text>
                                                <Text style={[styles.gridValue, { color: textPrimary }]}>{new Date(selectedCuenta.fecha_crea).toLocaleDateString("es-CL")}</Text>
                                            </View>
                                            <View style={styles.gridItem}>
                                                <Text style={[styles.gridLabel, { color: textSecondary }]}>CLIENTE</Text>
                                                <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedCuenta.cliente_nombre || "Sin cliente registrado"}</Text>
                                            </View>
                                            <View style={styles.gridItem}>
                                                <Text style={[styles.gridLabel, { color: textSecondary }]}>HABITACIÓN</Text>
                                                <Text style={[styles.gridValue, { color: textPrimary }]}>{selectedCuenta.habitacion_numero || "SALÓN"}</Text>
                                            </View>
                                            <View style={styles.gridItem}>
                                                <Text style={[styles.gridLabel, { color: textSecondary }]}>TOTAL COMISIÓN</Text>
                                                <Text style={[styles.gridValue, { color: accentColor }]}>${(selectedCuenta.total_comision || 0).toLocaleString()}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.hostessSection}>
                                            <Text style={[styles.sectionTitle, { color: textSecondary }]}>ANFITRIONA(S) ASIGNADA(S)</Text>
                                            <View style={styles.hostessBadges}>
                                                {allHostesses.length > 0 ? (
                                                    allHostesses.map((u: any, idx: number) => (
                                                        <View key={idx} style={[styles.hostessBadgeDetail, { backgroundColor: `${accentColor}15` }]}>
                                                            <Text style={[styles.hostessTextDetail, { color: accentColor }]}>{u.nick || "Anfitriona"}</Text>
                                                        </View>
                                                    ))
                                                ) : (
                                                    <View style={[styles.hostessBadgeDetail, { backgroundColor: "#37415120" }]}>
                                                        <Text style={[styles.hostessTextDetail, { color: textSecondary }]}>Venta directa en barra</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <View style={[styles.tableContainer, { backgroundColor: isDark ? "#111827" : "#F9FAFB", borderColor }]}>
                                            <View style={[styles.tableHeaderRow, { borderBottomColor: borderColor }]}>
                                                <Text style={[styles.tableHead, { flex: 1.3, color: textSecondary }]}>Producto</Text>
                                                <Text style={[styles.tableHead, { flex: 1.1, color: textSecondary }]}>Anfitriona</Text>
                                                <Text style={[styles.tableHead, { flex: 0.5, color: textSecondary, textAlign: "center" }]}>Cant.</Text>
                                                <Text style={[styles.tableHead, { flex: 0.8, color: textSecondary, textAlign: "right" }]}>Com.</Text>
                                                <Text style={[styles.tableHead, { flex: 1.0, color: textSecondary, textAlign: "right" }]}>Precio</Text>
                                                <Text style={[styles.tableHead, { flex: 1.0, color: textSecondary, textAlign: "right" }]}>Total</Text>
                                            </View>
                                            {selectedCuenta.detalles && selectedCuenta.detalles.map((det: any, idx: number) => (
                                                <View key={idx} style={[styles.tableRow, { borderBottomColor: idx === selectedCuenta.detalles.length - 1 ? "transparent" : borderColor }]}>
                                                    <Text style={[styles.productName, { flex: 1.3, color: textPrimary }]} numberOfLines={1}>{det.producto}</Text>
                                                    <Text style={{ flex: 1.1, fontSize: 13, fontWeight: "600", color: accentColor }} numberOfLines={1}>
                                                        {det.hostess_nick || "-"}
                                                    </Text>
                                                    <Text style={[styles.productQty, { flex: 0.5, color: textPrimary, textAlign: "center" }]}>{det.cantidad}</Text>
                                                    <Text style={{ flex: 0.8, fontSize: 14, color: "#10B981", fontWeight: "700", textAlign: "right" }}>
                                                        ${(det.comision || 0).toLocaleString()}
                                                    </Text>
                                                    <Text style={[styles.productPrice, { flex: 1.0, color: textPrimary, textAlign: "right" }]}>${det.precio.toLocaleString()}</Text>
                                                    <Text style={[styles.productSubtotal, { flex: 1.0, color: textPrimary, textAlign: "right" }]}>${det.sub_total.toLocaleString()}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        <View style={styles.summarySection}>
                                            <View style={[styles.summaryRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: borderColor, paddingTop: 12 }]}>
                                                <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>TOTAL</Text>
                                                <Text style={[styles.totalValFinal, { color: accentColor }]}>${selectedCuenta.total.toLocaleString()}</Text>
                                            </View>
                                        </View>
                                    </ScrollView>
                                    <Pressable style={[styles.modalCloseBtn, { backgroundColor: accentColor }]} onPress={() => dispatch({ type: 'SET_MODAL_VISIBLE', payload: false })}>
                                        <Text style={styles.modalCloseBtnText}>Cerrar Detalles</Text>
                                    </Pressable>
                                </>
                            )
                        )}
                    </View>
                </View>
            </Modal>

            {/* Cobro Modal */}
            <Modal animationType="slide" transparent={true} visible={cobroModalVisible} onRequestClose={() => dispatch({ type: 'SET_COBRO_MODAL_VISIBLE', payload: false })}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor, height: 'auto', maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitleText, { color: textPrimary }]}>Cobrar Cuenta</Text>
                                <Text style={[styles.modalSubText, { color: textSecondary }]}>Resumen de pago para {selectedCuenta?.codigo}</Text>
                            </View>
                            <Pressable onPress={() => dispatch({ type: 'SET_COBRO_MODAL_VISIBLE', payload: false })} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={textSecondary} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            <View style={[styles.infoBannerCobro, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor }]}>
                                <View style={styles.summaryRowCobro}>
                                    <Text style={[styles.summaryLabelCobro, { color: textSecondary }]}>Subtotal Cuenta</Text>
                                    <Text style={[styles.summaryValCobro, { color: textPrimary }]}>${(cobroTotals.subtotal).toLocaleString()}</Text>
                                </View>

                                <TipCheckbox
                                    enabled={cobroEnableTip}
                                    onToggle={(val) => dispatch({ type: 'SET_COBRO_ENABLE_TIP', payload: val })}
                                    tipAmount={cobroTotals.tip}
                                />

                                <View style={[styles.dividerCobro, { backgroundColor: borderColor }]} />

                                <View style={styles.summaryRowCobro}>
                                    <Text style={[styles.totalLabelCobro, { color: textPrimary }]}>TOTAL A COBRAR</Text>
                                    <Text style={[styles.totalValCobro, { color: accentColor }]}>${(cobroTotals.total).toLocaleString()}</Text>
                                </View>
                            </View>

                            <PaymentMethodSelect
                                selectedMethod={cobroMetodoPago}
                                onSelect={(method) => dispatch({ type: 'SET_COBRO_METODO_PAGO', payload: method })}
                            />

                            <Pressable
                                style={[styles.cobrarSubmitBtn, { backgroundColor: accentColor }, cobroSubmitting && { opacity: 0.7 }]}
                                onPress={handleConfirmarCobro}
                                disabled={cobroSubmitting}
                            >
                                {cobroSubmitting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="cash-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                        <Text style={styles.cobrarSubmitBtnText}>Confirmar Cobro</Text>
                                    </>
                                )}
                            </Pressable>

                            <Pressable
                                style={[styles.cobrarCancelBtn, { backgroundColor: isDark ? "#374151" : "#F3F4F6" }]}
                                onPress={() => dispatch({ type: 'SET_COBRO_MODAL_VISIBLE', payload: false })}
                                disabled={cobroSubmitting}
                            >
                                <Text style={[styles.cobrarCancelBtnText, { color: textPrimary }]}>Cerrar</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Action Sheet Modal */}
            <Modal animationType="fade" transparent={true} visible={actionSheetVisible} onRequestClose={() => dispatch({ type: 'SET_ACTION_SHEET', visible: false })}>
                <Pressable style={styles.modalOverlay} onPress={() => dispatch({ type: 'SET_ACTION_SHEET', visible: false })}>
                    <View style={[styles.actionSheet, { backgroundColor: cardBg }]}>
                        <View style={styles.actionSheetHeader}>
                            <View style={styles.actionSheetHandle} />
                            <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>Opciones de Cuenta</Text>
                            <Text style={[styles.actionSheetSub, { color: textSecondary }]}>Código: {activeCuenta?.codigo}</Text>
                        </View>
                        <Pressable style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]} onPress={() => handleVerDetalles(activeCuenta?.id_cuenta)}>
                            <View style={[styles.actionIconBox, { backgroundColor: `${accentColor}15` }]}>
                                <Ionicons name="eye-outline" size={22} color={accentColor} />
                            </View>
                            <Text style={[styles.actionText, { color: textPrimary }]}>Ver Detalles / Recibo</Text>
                        </Pressable>
                        {activeCuenta?.estado === 1 && (
                            <Pressable style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]} onPress={() => handleCobrarCuenta(activeCuenta)}>
                                <View style={[styles.actionIconBox, { backgroundColor: `${accentColor}15` }]}>
                                    <Ionicons name="cash-outline" size={22} color={accentColor} />
                                </View>
                                <Text style={[styles.actionText, { color: accentColor }]}>Cobrar Cuenta</Text>
                            </Pressable>
                        )}
                        <Pressable style={[styles.actionCancelBtn, { backgroundColor: isDark ? "#374151" : "#F3F4F6" }]} onPress={() => dispatch({ type: 'SET_ACTION_SHEET', visible: false })}>
                            <Text style={[styles.actionCancelText, { color: textPrimary }]}>Cancelar</Text>
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
                onCancel={alertConfig.onCancel || (() => dispatch({ type: 'SET_ALERT_VISIBLE', payload: false }))}
                showCancel={true}
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(155,155,155,0.1)' },
    plusBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, height: 48, borderRadius: 24, backgroundColor: "#E11D48", justifyContent: "center", elevation: 2, shadowColor: "#E11D48", shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, gap: 4 },
    plusBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
    headerTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, fontWeight: "600", opacity: 0.8 },
    listContainer: { padding: 16, paddingBottom: 100 },

    // Tabs
    tabContainer: { flexDirection: 'row', marginTop: 20, borderRadius: 16, padding: 4, borderWidth: 1 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    tabText: { fontSize: 14, fontWeight: '700' },
    tabWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
    tabBadgeText: { color: '#E11D48', fontSize: 11, fontWeight: '900' },

    // Resumen
    resumenCard: { padding: 24, borderRadius: 32, marginBottom: 20, elevation: 10, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    resumenLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 1 },
    resumenValue: { fontSize: 36, fontWeight: "900", marginTop: 4 },
    resumenIconBox: { width: 64, height: 64, borderRadius: 20, justifyContent: "center", alignItems: "center" },

    // Cards Premium
    card: {
        flex: 1, borderRadius: 24, overflow: 'hidden', marginBottom: 14,
        borderWidth: 1,
        elevation: 6, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }
    },
    cardAccentBar: { height: 4, width: '100%' },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10
    },
    cardCode: { fontSize: 16, fontWeight: '900', letterSpacing: 0.8 },
    statusChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusChipText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
    cardInfoGrid: {
        flexDirection: 'row', paddingHorizontal: 12,
        paddingBottom: 12, gap: 8
    },
    cardInfoCell: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: 10, borderRadius: 14, backgroundColor: 'rgba(128,128,128,0.05)'
    },
    cardInfoIconBox: {
        width: 30, height: 30, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center'
    },
    cardInfoLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    cardInfoValue: { fontSize: 13, fontWeight: '700', marginTop: 1 },
    cardTimerRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginHorizontal: 12, marginBottom: 12,
        padding: 10, borderRadius: 12, borderWidth: 1
    },
    cardTimerSync: { fontSize: 12, fontWeight: '600', flex: 1 },
    cardTimerTotal: { fontSize: 11, fontWeight: '600', marginLeft: 'auto' },
    cardFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4
    },
    cardTotalBig: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    cardSubCount: { fontSize: 11, fontWeight: '600', marginTop: 2, opacity: 0.7 },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardActionBtn: {
        height: 38, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        flexDirection: 'row', gap: 5
    },
    cardActionBtnAdd: {
        paddingHorizontal: 12, backgroundColor: '#3B82F610', borderWidth: 1, borderColor: '#3B82F630'
    },
    cardActionBtnAddText: { color: '#3B82F6', fontSize: 13, fontWeight: '800' },
    cardActionBtnCobrar: {
        paddingHorizontal: 16, backgroundColor: '#10B981',
        elevation: 2, shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
    },
    cardActionBtnCobrarText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    // Legacy aliases (used elsewhere)
    cardMainRow: { flexDirection: "row", justifyContent: "space-between" },
    cardLeftContent: { flex: 1.2 },
    cardTopActions: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    statusBadgeSmall: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusTextSmall: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
    cardDetailsList: { gap: 6 },
    detailItemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    rowIcon: { width: 16, textAlign: "center" },
    detailValue: { fontSize: 14, fontWeight: "600" },
    cardRightContent: { flex: 0.8, alignItems: "flex-end", justifyContent: "space-between", borderLeftWidth: 1, borderLeftColor: "rgba(0,0,0,0.03)", paddingLeft: 12 },
    actionButtonsCol: { flexDirection: "column", alignItems: "flex-end", gap: 8, marginTop: -4 },
    actionButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6, minWidth: 90, justifyContent: "center" },
    addBtn: { backgroundColor: "#3B82F6" },
    addBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
    finishBtn: { backgroundColor: "#10B981" },
    finishBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
    subInfoRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },

    // Empty
    emptyCard: { borderRadius: 32, padding: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, marginTop: 40, borderStyle: "dashed" },
    emptyText: { fontSize: 18, fontWeight: "800", marginTop: 16, marginBottom: 4 },
    emptySub: { fontSize: 14, fontWeight: "500", textAlign: "center", opacity: 0.7 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    detailModal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, borderWidth: 1, borderBottomWidth: 0, height: "85%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    modalTitleText: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
    modalSubText: { fontSize: 14, fontWeight: "600", marginTop: 2 },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(128,128,128,0.1)", justifyContent: "center", alignItems: "center" },
    detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 24, paddingVertical: 10 },
    gridItem: { width: "47%", marginBottom: 12 },
    gridLabel: { fontSize: 11, fontWeight: "800", marginBottom: 4, letterSpacing: 0.5 },
    gridValue: { fontSize: 15, fontWeight: "700" },
    hostessSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontWeight: "800", marginBottom: 10, letterSpacing: 0.5 },
    hostessBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    hostessBadgeDetail: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    hostessTextDetail: { fontSize: 13, fontWeight: "800", color: "#E11D48" },
    tableContainer: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
    tableHeaderRow: { flexDirection: "row", padding: 12, borderBottomWidth: 1, backgroundColor: "rgba(0,0,0,0.02)" },
    tableHead: { fontSize: 12, fontWeight: "800" },
    tableRow: { flexDirection: "row", padding: 14, borderBottomWidth: 1, alignItems: "center" },
    productName: { fontSize: 14, fontWeight: "800" },
    productQty: { fontSize: 14, fontWeight: "600" },
    productPrice: { fontSize: 14, fontWeight: "600" },
    productSubtotal: { fontSize: 14, fontWeight: "900" },
    summarySection: { padding: 10 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    totalLabelFinal: { fontSize: 18, fontWeight: "900" },
    totalValFinal: { fontSize: 24, fontWeight: "900", color: "#E11D48" },
    modalCloseBtn: { height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginTop: 10, marginBottom: 20 },
    modalCloseBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

    // Action Sheet
    actionSheet: { padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    actionSheetHeader: { alignItems: "center", marginBottom: 24 },
    actionSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", marginBottom: 16 },
    actionSheetTitle: { fontSize: 20, fontWeight: "900", marginBottom: 4 },
    actionSheetSub: { fontSize: 14, fontWeight: "500" },
    actionItem: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 12 },
    actionItemPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
    actionIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: 16 },
    actionText: { fontSize: 16, fontWeight: "700" },
    actionCancelBtn: { marginTop: 8, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },
    actionCancelText: { fontSize: 16, fontWeight: "800" },

    // Cobro Modal New Styles
    infoBannerCobro: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
    summaryRowCobro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    summaryLabelCobro: { fontSize: 14, fontWeight: '600' },
    summaryValCobro: { fontSize: 16, fontWeight: '800' },
    dividerCobro: { height: 1, marginVertical: 12 },
    totalLabelCobro: { fontSize: 18, fontWeight: '900' },
    totalValCobro: { fontSize: 24, fontWeight: '900', color: '#10B981' },
    cobrarSubmitBtn: { height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    cobrarSubmitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    cobrarCancelBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
    cobrarCancelBtnText: { fontSize: 16, fontWeight: '800' },
});
