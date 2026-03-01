import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useReducer, useRef } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { apiClient } from "../../../api/client";
import { PremiumAlert } from "../../../components/PremiumAlert";
import { PremiumHeader } from "../../../components/PremiumHeader";

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
    alertConfig: {
        visible: boolean;
        title: string;
        message: string;
        type: "info" | "success" | "warning" | "danger";
        onConfirm?: () => void;
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
    | { type: 'SET_ALERT'; payload: CuentasState['alertConfig'] };

const statusColors: Record<number, string> = {
    1: "#F59E0B", // Pendiente
    0: "#10B981", // Cobrado
};

const statusLabels: Record<number, string> = {
    1: "Pendiente",
    0: "Cobrado",
};

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
        case 'SET_ALERT': return { ...state, alertConfig: action.payload };
        default: return state;
    }
}

const showToast = (title: string, message: string, type: "success" | "error" = "error") => {
    Toast.show({ type, text1: title, text2: message, visibilityTime: 4000 });
};

export default function CuentasScreen() {
    const isDark = (useColorScheme() ?? "dark") === "dark";
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();
    const dataRef = useRef<string>("");

    const [state, dispatch] = useReducer(cuentasReducer, initialCuentasState((params.tab as any) === "pendientes" ? "pendientes" : "historial"));
    const {
        loading, refreshing, cuentas, resumen, selectedCuenta, loadingDetail,
        modalVisible, actionSheetVisible, activeCuenta, activeTab, alertConfig
    } = state;

    const bg = isDark ? "#000000" : "#F3F4F6";
    const cardBg = isDark ? "#1F2937" : "#FFFFFF";
    const textPrimary = isDark ? "#FFFFFF" : "#000000";
    const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
    const borderColor = isDark ? "#374151" : "#E5E7EB";

    const fetchCuentas = useCallback(async (isManual = false) => {
        try {
            const [resCuentas, resResumen] = await Promise.all([
                apiClient("/cuentas?limit=50"),
                apiClient("/cuentas?tipo=resumen")
            ]);

            const newData = { cuentas: resCuentas.data || [], resumen: resResumen.data };
            const serialized = JSON.stringify(newData);
            const hasChanges = dataRef.current !== serialized;
            dataRef.current = serialized;

            dispatch({ type: 'SET_DATA', payload: { cuentas: resCuentas.data || [], resumen: resResumen.data } });

            if (isManual) {
                showToast(hasChanges ? "Éxito" : "Información", hasChanges ? "Datos actualizados" : "Sin cambios", hasChanges ? "success" : "error");
            }
        } catch (error) {
            console.error("Error fetching cuentas:", error);
            if (isManual) showToast("Error", "No se pudo actualizar");
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'SET_REFRESHING', payload: false });
        }
    }, []);

    useEffect(() => {
        fetchCuentas();
    }, [fetchCuentas]);

    const onRefresh = useCallback(() => {
        dispatch({ type: 'SET_REFRESHING', payload: true });
        fetchCuentas(true);
    }, [fetchCuentas]);

    const handleCobrarCuenta = useCallback(async (cuenta: any) => {
        dispatch({ type: 'SET_ACTION_SHEET', visible: false });
        dispatch({
            type: 'SET_ALERT',
            payload: {
                visible: true,
                title: "Cobrar Cuenta",
                message: `¿Estás seguro de cobrar ${cuenta.codigo} por $${cuenta.total.toLocaleString()}?`,
                type: "warning",
                onConfirm: async () => {
                    dispatch({ type: 'SET_ALERT', payload: { ...alertConfig, visible: false } });
                    try {
                        const res = await apiClient(`/cuentas/${cuenta.id_cuenta}/cobrar`, { method: "POST" });
                        if (res.success) {
                            showToast("Éxito", "Cobrada correctamente", "success");
                            fetchCuentas();
                        } else showToast("Error", res.message || "Error al cobrar");
                    } catch (error) {
                        showToast("Error", "Error de conexión");
                    }
                }
            }
        });
    }, [fetchCuentas, alertConfig]);

    const renderCuentaCard = useCallback(({ item }: { item: any }) => {
        const productCount = item.detalles?.reduce((acc: number, d: any) => acc + d.cantidad, 0) || 0;
        const statusColor = statusColors[item.estado] || "#6B7280";

        return (
            <Pressable
                style={[styles.card, { backgroundColor: cardBg, borderColor, borderLeftColor: statusColor }]}
                onPress={() => dispatch({ type: 'SET_ACTION_SHEET', visible: true, cuenta: item })}
                accessibilityLabel={`Cuenta ${item.codigo}, cliente ${item.cliente_nombre || 'N/A'}`}
                accessibilityRole="button"
            >
                <View style={styles.cardMainRow}>
                    <View style={styles.cardLeftContent}>
                        <View style={styles.cardTopActions}>
                            <Text style={[styles.cardCode, { color: textPrimary }]}>{item.codigo}</Text>
                            <View style={[styles.statusBadgeSmall, { backgroundColor: `${statusColor}15` }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.statusTextSmall, { color: statusColor }]}>{statusLabels[item.estado]}</Text>
                            </View>
                        </View>
                        <View style={styles.cardDetailsList}>
                            <View style={styles.detailItemRow}>
                                <Ionicons name="person-outline" size={14} color={textSecondary} style={styles.rowIcon} />
                                <Text style={[styles.detailValue, { color: textPrimary }]}>{item.cliente_nombre || "Sin cliente"}</Text>
                            </View>
                            <View style={styles.detailItemRow}>
                                <Ionicons name="business-outline" size={14} color={textSecondary} style={styles.rowIcon} />
                                <Text style={[styles.detailValue, { color: textPrimary }]}>{item.habitacion_nombre || "Directo"}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.cardRightContent}>
                        {item.estado === 1 && (
                            <Pressable style={styles.finishBtn} onPress={() => handleCobrarCuenta(item)} accessibilityLabel="Cobrar" accessibilityRole="button">
                                <Ionicons name="cash-outline" size={16} color="#FFF" />
                                <Text style={styles.finishBtnText}>Cobrar</Text>
                            </Pressable>
                        )}
                        <Text style={[styles.cardTotalBig, { color: textPrimary }]}>${item.total.toLocaleString()}</Text>
                    </View>
                </View>
            </Pressable>
        );
    }, [cardBg, borderColor, textPrimary, textSecondary, handleCobrarCuenta]);

    if (loading) return <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center' }}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

    const filteredCuentas = activeTab === "historial" ? cuentas : cuentas.filter((c) => c.estado === 1);

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            <PremiumHeader
                title="Cuentas"
                onBack={() => router.replace("/cajero")}
                showAddButton
                onAdd={() => router.push("/cajero/nueva-cuenta")}
                tabs={[
                    { id: "historial", label: "Historial" },
                    { id: "pendientes", label: "Pendientes" },
                ]}
                activeTab={activeTab}
                onTabChange={(tabId: string) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId as any })}
            />

            <FlatList
                data={filteredCuentas}
                renderItem={renderCuentaCard}
                keyExtractor={(item) => item.id_cuenta.toString()}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
                ListHeaderComponent={resumen && (
                    <View style={[styles.resumenCard, { backgroundColor: "#8B5CF6" }]}>
                        <Text style={styles.resumenLabel}>TOTAL POR COBRAR</Text>
                        <Text style={styles.resumenValue}>${(resumen.total_por_cobrar || 0).toLocaleString()}</Text>
                    </View>
                )}
            />

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
                onCancel={() => dispatch({ type: 'SET_ALERT', payload: { ...alertConfig, visible: false } })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContainer: { padding: 16 },
    resumenCard: { padding: 20, borderRadius: 20, marginBottom: 16 },
    resumenLabel: { color: "#E0E7FF", fontSize: 12, fontWeight: "700" },
    resumenValue: { color: "#FFF", fontSize: 28, fontWeight: "900", marginTop: 4 },
    card: { padding: 16, borderRadius: 20, borderWidth: 1, borderLeftWidth: 6, marginBottom: 12 },
    cardMainRow: { flexDirection: "row", justifyContent: "space-between" },
    cardLeftContent: { flex: 1 },
    cardTopActions: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
    cardCode: { fontSize: 13, fontWeight: "800", opacity: 0.7 },
    statusBadgeSmall: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    statusTextSmall: { fontSize: 11, fontWeight: "800" },
    cardDetailsList: { gap: 4 },
    detailItemRow: { flexDirection: "row", alignItems: "center" },
    rowIcon: { marginRight: 8 },
    detailValue: { fontSize: 14, fontWeight: "600" },
    cardRightContent: { alignItems: "flex-end", justifyContent: "space-between" },
    finishBtn: { backgroundColor: "#8B5CF6", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, gap: 6, marginBottom: 8 },
    finishBtnText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
    cardTotalBig: { fontSize: 20, fontWeight: "900" },
});
