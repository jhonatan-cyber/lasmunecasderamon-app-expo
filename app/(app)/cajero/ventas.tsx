import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import {
  calculateRemainingTime,
  useTimer,
} from "../../../context/TimerContext";
import { useAccentColor } from "../../../hooks/useAccentColor";
import { rotateColor } from "../../../utils/colors";

// Utils for status colors and labels
const statusColors: Record<number, string> = {
  1: "#10B981", // Pagada -> Verde (estándar de éxito)
  2: "#3B82F6", // En Proceso -> Azul
  3: "#EF4444", // Anulada -> Rojo
  4: "#F59E0B", // Por Anular -> Ambar
};

const statusLabels: Record<number, string> = {
  1: "Completado",
  2: "En proceso",
  3: "Pdte. Anulación",
  0: "Anulado",
};

const payMethodIcons: Record<string, any> = {
  efectivo: "cash-outline",
  tarjeta: "card-outline",
  transferencia: "swap-horizontal-outline",
};

import { Skeleton } from "../../../components/ui/Skeleton";

// Persistencia de estado de carga para evitar skeleton en re-navegación
let initialVentasLoaded = false;

export default function VentasScreen() {
  const { accentColor, gradientColors, isDark } = useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(!initialVentasLoaded);
  const [refreshing, setRefreshing] = useState(false);
  const [ventas, setVentas] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const dataRef = useRef<string>("");
  const isFocused = useRef(true);
  const lastNotifiedId = useRef<number | null>(null);

  const [selectedVenta, setSelectedVenta] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Action Sheet state
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [activeVenta, setActiveVenta] = useState<any>(null);

  const { timers, serverOffset, refreshTimers } = useTimer();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<"historial" | "proceso">(
    (params.tab as any) === "proceso" ? "proceso" : "historial",
  );
  const [, setTick] = useState(0);

  // Alert state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
    confirmText?: string;
  }>({ visible: false, title: "", message: "", type: "info", showCancel: true });

  const showToast = (
    title: string,
    message: string,
    type: "success" | "error" = "error",
  ) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      visibilityTime: 4000,
    });
  };

  const bg = isDark ? "#000000" : "#F3F4F6";
  const cardBg = isDark ? "#1F2937" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#000000";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? "#374151" : "#E5E7EB";

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

  const VentaCardSkeleton = () => (
    <View
      style={{
        width: isTablet ? "48.5%" : "100%",
        padding: 16,
        borderRadius: 24,
        marginBottom: 14,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
        <Skeleton width={120} height={20} />
        <Skeleton width={80} height={20} borderRadius={12} />
      </View>
      <View style={{ gap: 8, marginBottom: 15 }}>
        <Skeleton width="90%" height={14} />
        <Skeleton width="70%" height={14} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View style={{ gap: 4 }}>
          <Skeleton width={60} height={12} />
          <Skeleton width={100} height={24} />
        </View>
        <Skeleton width={100} height={40} borderRadius={12} />
      </View>
    </View>
  );

  const VentasSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient
        colors={gradientColors as any}
        style={[styles.header, { paddingTop: insets.top + (isTablet ? 20 : 10), paddingBottom: 25, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }]}
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
        <Skeleton height={isTablet ? 180 : 140} borderRadius={24} style={{ marginBottom: 20 }} />
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

  const fetchVentas = useCallback(async (isManual = false) => {
    try {
      if (!isManual && !initialVentasLoaded) setLoading(true);
      if (isManual) setLoadingSales(true);
      const timestamp = Date.now();
      const [resSales, resResumen] = await Promise.all([
        apiClient(`/sales?limit=50&_t=${timestamp}`).catch(() => ({
          success: false,
          data: [],
        })),
        apiClient(`/sales?tipo=resumen&_t=${timestamp}`).catch(() => ({
          success: false,
          data: null,
        })),
      ]);

      const newData = { sales: resSales.data, resumen: resResumen.data };
      const serialized = JSON.stringify(newData);
      const hasChanges = dataRef.current !== serialized;
      dataRef.current = serialized;

      if (resSales.success) {
        setVentas(resSales.data || []);
      }
      if (resResumen.success) {
        setResumen(resResumen.data);
      }

      if (isManual) {
        Toast.show({
          type: hasChanges ? "success" : "info",
          text1: hasChanges ? "Éxito" : "Información",
          text2: hasChanges ? "Datos actualizados" : "Sin cambios en los datos",
          visibilityTime: 3000,
        });
      }
      setAlertConfig(prev => ({ ...prev, visible: false }));
    } catch (error) {
      console.error("Error fetching ventas:", error);
      if (isManual) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No se pudo actualizar",
          visibilityTime: 3000,
        });
      }
    } finally {
      initialVentasLoaded = true;
      setLoading(false);
      setLoadingSales(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      fetchVentas();
      refreshTimers();
      return () => { isFocused.current = false; };
    }, [fetchVentas, refreshTimers])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("refresh_sales", (data?: any) => {
      console.log("[DEBUG] Event refresh_sales received, updating list...", data);

      // Si es automático, mostrar el modal de aviso
      if (data?.automatic && data?.roomName) {
        // Evitar duplicados para el mismo ID de servicio en esta pantalla
        if (data.servicioId && lastNotifiedId.current === data.servicioId) {
          console.log("[DEBUG] Duplicate event ignored in Ventas for ID:", data.servicioId);
          return;
        }
        lastNotifiedId.current = data.servicioId || null;

        // Mostrar el modal (Avisar al usuario)
        setAlertConfig({
          visible: true,
          title: "Tiempo Agotado",
          message: `El tiempo de la habitación ${data.roomName} ha terminado. La habitación ha sido liberada.`,
          type: "success",
          showCancel: false,
          confirmText: "Aceptar",
          onConfirm: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            fetchVentas();
            refreshTimers();
          }
        });
      } else {
        fetchVentas();
        refreshTimers();
      }
    });
    return () => subscription.remove();
  }, [fetchVentas, refreshTimers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVentas(true);
    refreshTimers();
  };

  const handleOpenActionSheet = (venta: any) => {
    setActiveVenta(venta);
    setActionSheetVisible(true);
  };

  const handleVerDetalles = async (id: number) => {
    setActionSheetVisible(false);
    setLoadingDetail(true);
    setModalVisible(true);
    try {
      const res = await apiClient(`/ventas/${id}`);
      if (res && !res.error) {
        setSelectedVenta(res);
      } else {
        showToast("Error", "No se pudo obtener el detalle de la venta");
        setModalVisible(false);
      }
    } catch (error) {
      showToast("Error", "Error de conexión al cargar detalles");
      setModalVisible(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleFinalizarVenta = async (venta: any) => {
    setAlertConfig({
      visible: true,
      title: "Finalizar Venta",
      message:
        "¿Estás seguro de que deseas finalizar esta venta? Esto liberará la habitación y detendrá el temporizador.",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await apiClient(`/ventas/${venta.id_venta}`, {
            method: "PUT",
            body: JSON.stringify({ estado: 1 }), // 1 = Completado/Finalizado
          });

          if (res.success || (res && !res.error)) {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            Toast.show({ type: "success", text1: "Venta Finalizada", text2: "La venta ha finalizado con éxito." });
            fetchVentas();
            refreshTimers();
          } else {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            showToast(
              "Error",
              res.message || res.error || "No se pudo finalizar la venta",
            );
          }
        } catch (error) {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          showToast("Error", "Error al procesar la finalización de la venta");
        }
      },
    });
  };

  const handleAnularVenta = async () => {
    if (!activeVenta) return;
    setActionSheetVisible(false);

    try {
      const res = await apiClient(
        `/ventas/${activeVenta.id_venta}/solicitar-anulacion`,
        {
          method: "POST",
          body: JSON.stringify({
            estado: 3,
            motivo: "Solicitado desde el Módulo de Ventas (App)",
          }),
        },
      );

      if (res.success || !res.error) {
        showToast(
          "Solicitud Enviada",
          "La anulación ha sido solicitada al administrador por WhatsApp.",
          "success",
        );
        fetchVentas();
      } else {
        showToast(
          "Error",
          res.message || res.error || "No se pudo solicitar la anulación",
        );
      }
    } catch (error) {
      showToast("Error", "Error al procesar la solicitud de anulación");
    }
  };

  const renderVentaCard = ({ item }: { item: any }) => {
    const productCount = item.detalles
      ? item.detalles.reduce((acc: number, d: any) => acc + d.cantidad, 0)
      : 0;
    // Generar un color dinámico basado en el ID para variedad, pero manteniendo el status color si es importante
    // O mejor aún: usar una rotación del color de acento según la posición/ID
    const itemAccent = rotateColor(accentColor, (item.id_venta % 10) * 36);
    const statusColor = item.estado === 2 ? itemAccent : (statusColors[item.estado] || "#6B7280");

    // Check if this sale has an active timer (matching room or service ID)
    const activeTimer = timers.find(
      (t) =>
        (t.servicioId && t.servicioId === item.id_venta) ||
        (t.roomId && t.roomId === item.habitacion_id && item.estado === 2),
    );

    const remaining = activeTimer
      ? calculateRemainingTime(activeTimer, serverOffset)
      : 0;
    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor,
            borderLeftColor: statusColor,
          },
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => handleOpenActionSheet(item)}
      >
        <View style={styles.cardMainRow}>
          {/* Left Info Section */}
          <View style={styles.cardLeftContent}>
            <View style={styles.cardTopActions}>
              <Text style={[styles.cardCode, { color: textPrimary }]}>
                {item.codigo}
              </Text>
              <View
                style={[
                  styles.statusBadgeSmall,
                  { backgroundColor: `${statusColor}15` },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.statusTextSmall, { color: statusColor }]}>
                  {statusLabels[item.estado] || "Desconocido"}
                </Text>
              </View>
            </View>

            <View style={styles.cardDetailsList}>
              <View style={styles.detailItemRow}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={textSecondary}
                  style={styles.rowIcon}
                />
                <Text style={[styles.detailValue, { color: textPrimary }]}>
                  {item.cliente_nombre || "Sin cliente registrado"}
                </Text>
              </View>

              <View style={styles.detailItemRow}>
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={textSecondary}
                  style={styles.rowIcon}
                />
                <Text style={[styles.detailValue, { color: textPrimary }]}>
                  {item.habitacion_nombre || "Barra / General"}
                </Text>
              </View>

              <View style={styles.detailItemRow}>
                <Ionicons
                  name="people-outline"
                  size={14}
                  color={textSecondary}
                  style={styles.rowIcon}
                />
                {item.usuarios_nicks ? (
                  <View
                    style={[
                      styles.hostessPill,
                      { backgroundColor: `${accentColor}15` },
                    ]}
                  >
                    <Text
                      style={[styles.hostessText, { color: accentColor }]}
                      numberOfLines={1}
                    >
                      {item.usuarios_nicks}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.detailValue,
                      { color: textSecondary, fontStyle: "italic" },
                    ]}
                  >
                    Venta en barra
                  </Text>
                )}
              </View>

              <View style={styles.detailItemRow}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={textSecondary}
                  style={styles.rowIcon}
                />
                <Text
                  style={[
                    styles.detailValue,
                    { color: textSecondary, fontSize: 12 },
                  ]}
                >
                  {new Date(item.fecha_crea).toLocaleString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>

            {activeTimer && (
              <View
                style={[
                  styles.timerPill,
                  {
                    backgroundColor: remaining < 60 ? "#EF444420" : `${accentColor}20`,
                    borderColor: remaining < 60 ? "#EF444440" : `${accentColor}40`,
                  },
                ]}
              >
                <Ionicons
                  name="time"
                  size={16}
                  color={remaining < 60 ? "#EF4444" : accentColor}
                />
                <View>
                  <Text style={[styles.timerLabel, { color: textSecondary }]}>
                    RESTANTE
                  </Text>
                  <Text
                    style={[
                      styles.timerValue,
                      { color: remaining < 60 ? "#EF4444" : textPrimary },
                    ]}
                  >
                    {formatTime(remaining)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Right Info Section */}
          <View style={styles.cardRightContent}>
            {item.estado === 2 && (
              <Pressable
                style={({ pressed }) => [
                  styles.finishBtn,
                  { backgroundColor: accentColor },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleFinalizarVenta(item)}
              >
                <Ionicons name="stop-circle" size={16} color="#FFF" />
                <Text style={styles.finishBtnText}>Finalizar</Text>
              </Pressable>
            )}

            <View style={styles.methodBadgeContainer}>
              <Ionicons
                name={payMethodIcons[item.metodo_pago] || "wallet-outline"}
                size={14}
                color={textSecondary}
              />
              <Text style={[styles.methodText, { color: textSecondary }]}>
                {item.metodo_pago?.toUpperCase() || "N/A"}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.cardTotalBig, { color: textPrimary }]}>
                ${item.total.toLocaleString()}
              </Text>
              <View style={styles.subInfoRow}>
                <Text style={[styles.cardSubCount, { color: textSecondary }]}>
                  {productCount} items
                </Text>
                {item.propina > 0 && (
                  <>
                    <Text style={{ color: textSecondary, marginHorizontal: 4 }}>
                      •
                    </Text>
                    <Text style={styles.cardPropinaGreen}>
                      +${item.propina.toLocaleString()}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) return <VentasSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? 'dark' : 'light'} />
      {/* Header con gradiente igual al Dashboard */}
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
          <Pressable
            onPress={() => router.replace("/cajero/(tabs)" as any)}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={isTablet ? 30 : 24} color={isDark ? "#111827" : "#FFFFFF"} />
          </Pressable>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginLeft: 10,
            }}
          >
            <View>
              <Text style={[styles.headerTitle, { color: isDark ? "#111827" : "#FFFFFF" }, isTablet && { fontSize: 28 }]}>
                Ventas
              </Text>
              <Text style={[styles.headerSubtitle, { color: isDark ? "#6B7280" : "rgba(255,255,255,0.8)" }, isTablet && { fontSize: 17 }]}>
                Historial de transacciones
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() =>
                  router.push(
                    activeTab === "historial"
                      ? "/cajero/nueva-venta"
                      : "/cajero/nuevo-servicio",
                  )
                }
                style={[
                  styles.plusBtn,
                  { backgroundColor: isDark ? '#111827' : accentColor, shadowColor: accentColor }
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  activeTab === "historial" ? "Nueva Venta" : "Nuevo Servicio"
                }
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
            style={[
              styles.tab,
              activeTab === "historial" && { backgroundColor: accentColor },
            ]}
            onPress={() => {
              if (activeTab !== "historial") {
                setLoadingSales(true);
                setTimeout(() => setLoadingSales(false), 400);
              }
              setActiveTab("historial");
            }}
          >
            <Text
              style={[
                styles.tabText,
                isTablet && { fontSize: 16 },
                activeTab === "historial"
                  ? { color: "#FFF" }
                  : { color: isDark ? "#6B7280" : "rgba(255,255,255,0.7)" },
              ]}
            >
              Listado de Ventas
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === "proceso" && { backgroundColor: accentColor },
            ]}
            onPress={() => {
              if (activeTab !== "proceso") {
                setLoadingSales(true);
                setTimeout(() => setLoadingSales(false), 400);
              }
              setActiveTab("proceso");
            }}
          >
            <View style={styles.tabWithBadge}>
              <Text
                style={[
                  styles.tabText,
                  isTablet && { fontSize: 16 },
                  activeTab === "proceso"
                    ? { color: "#FFF" }
                    : { color: isDark ? "#6B7280" : "rgba(255,255,255,0.7)" },
                ]}
              >
                Ventas con Habitación
              </Text>
              {timers.filter((t) => t.tipoTransaccion === "venta").length >
                0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {timers.filter((t) => t.tipoTransaccion === "venta").length}
                    </Text>
                  </View>
                )}
            </View>
          </Pressable>
        </View>
      </LinearGradient>
      {/* Main Content */}
      <FlatList
        data={
          loadingSales
            ? [1, 2, 3, 4]
            : (activeTab === "historial"
              ? ventas
              : ventas.filter(
                (v) =>
                  v.estado === 2 ||
                  timers.some(
                    (t) =>
                      t.tipoTransaccion === "venta" &&
                      (t.servicioId === v.id_venta ||
                        (t.roomId === v.habitacion_id && v.estado === 2)),
                  ),
              ))
        }
        renderItem={loadingSales ? VentaCardSkeleton : renderVentaCard}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
        contentContainerStyle={[styles.listContainer, isTablet && { paddingHorizontal: 12 }]}
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
              No hay ventas registradas
            </Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>
              Las ventas aparecerán conforme se procesen los pagos.
            </Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
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
              selectedVenta && (
                <>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text
                        style={[styles.modalTitleText, { color: textPrimary }]}
                      >
                        Detalle de Venta
                      </Text>
                      <Text
                        style={[styles.modalSubText, { color: textSecondary }]}
                      >
                        Código: {selectedVenta.codigo}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setModalVisible(false)}
                      style={styles.closeBtn}
                    >
                      <Ionicons name="close" size={24} color={textSecondary} />
                    </Pressable>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    {/* Top Info Grid */}
                    <View style={styles.detailsGrid}>
                      <View style={styles.gridItem}>
                        <Text
                          style={[styles.gridLabel, { color: textSecondary }]}
                        >
                          FECHA DE VENTA
                        </Text>
                        <Text
                          style={[styles.gridValue, { color: textPrimary }]}
                        >
                          {new Date(
                            selectedVenta.fecha_crea,
                          ).toLocaleDateString("es-CL")}
                        </Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text
                          style={[styles.gridLabel, { color: textSecondary }]}
                        >
                          CLIENTE
                        </Text>
                        <Text
                          style={[styles.gridValue, { color: textPrimary }]}
                        >
                          {selectedVenta.cliente_nombre ||
                            "Sin cliente registrado"}
                        </Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text
                          style={[styles.gridLabel, { color: textSecondary }]}
                        >
                          MÉTODO DE PAGO
                        </Text>
                        <View
                          style={[
                            styles.methodBadgeDetail,
                            {
                              backgroundColor: isDark ? "#37415120" : "#F3F4F6",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.methodTextDetail,
                              { color: textPrimary },
                            ]}
                          >
                            {selectedVenta.metodo_pago.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.gridItem}>
                        <Text
                          style={[styles.gridLabel, { color: textSecondary }]}
                        >
                          {selectedVenta.garzon_nombre ? "GARZÓN / CAJERO" : "CAJERO"}
                        </Text>
                        <Text
                          style={[styles.gridValue, { color: textPrimary }]}
                        >
                          {selectedVenta.garzon_nombre
                            ? `${selectedVenta.garzon_nombre} / ${selectedVenta.cajero_nombre || selectedVenta.cajero_nick || "Cajero"}`
                            : (selectedVenta.cajero_nombre || selectedVenta.cajero_nick || "Cajero")
                          }
                        </Text>
                      </View>
                    </View>

                    {/* Hostess Section */}
                    <View style={styles.hostessSection}>
                      <Text
                        style={[styles.sectionTitle, { color: textSecondary }]}
                      >
                        ANFITRIONA(S) ASIGNADA(S)
                      </Text>
                      <View style={styles.hostessBadges}>
                        {selectedVenta.usuarios &&
                          selectedVenta.usuarios.length > 0 ? (
                          selectedVenta.usuarios.map((u: any, idx: number) => (
                            <View
                              key={idx}
                              style={[
                                styles.hostessBadgeDetail,
                                { backgroundColor: `${accentColor}15` },
                              ]}
                            >
                              <Text style={[styles.hostessTextDetail, { color: accentColor }]}>
                                {u.nick || "User"}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <View
                            style={[
                              styles.hostessBadgeDetail,
                              { backgroundColor: "#37415120" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.hostessTextDetail,
                                { color: textSecondary },
                              ]}
                            >
                              Venta directa en barra
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Product Table */}
                    <View
                      style={[
                        styles.tableContainer,
                        {
                          backgroundColor: isDark ? "#111827" : "#F9FAFB",
                          borderColor,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.tableHeaderRow,
                          { borderBottomColor: borderColor },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tableHead,
                            { flex: 2, color: textSecondary },
                          ]}
                        >
                          Producto
                        </Text>
                        <Text
                          style={[
                            styles.tableHead,
                            {
                              flex: 1,
                              color: textSecondary,
                              textAlign: "center",
                            },
                          ]}
                        >
                          Cant.
                        </Text>
                        <Text
                          style={[
                            styles.tableHead,
                            {
                              flex: 1.2,
                              color: textSecondary,
                              textAlign: "right",
                            },
                          ]}
                        >
                          Precio
                        </Text>
                        <Text
                          style={[
                            styles.tableHead,
                            {
                              flex: 1.2,
                              color: textSecondary,
                              textAlign: "right",
                            },
                          ]}
                        >
                          Sub Total
                        </Text>
                      </View>

                      {selectedVenta.detalles &&
                        selectedVenta.detalles.map((det: any, idx: number) => (
                          <View
                            key={idx}
                            style={[
                              styles.tableRow,
                              {
                                borderBottomColor:
                                  idx === selectedVenta.detalles.length - 1
                                    ? "transparent"
                                    : borderColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.productName,
                                { flex: 2, color: textPrimary },
                              ]}
                            >
                              {det.producto_nombre}
                            </Text>
                            <Text
                              style={[
                                styles.productQty,
                                {
                                  flex: 1,
                                  color: textPrimary,
                                  textAlign: "center",
                                },
                              ]}
                            >
                              {det.cantidad}
                            </Text>
                            <Text
                              style={[
                                styles.productPrice,
                                {
                                  flex: 1.2,
                                  color: textPrimary,
                                  textAlign: "right",
                                },
                              ]}
                            >
                              ${det.precio.toLocaleString()}
                            </Text>
                            <Text
                              style={[
                                styles.productSubtotal,
                                {
                                  flex: 1.2,
                                  color: textPrimary,
                                  textAlign: "right",
                                },
                              ]}
                            >
                              ${det.sub_total.toLocaleString()}
                            </Text>
                          </View>
                        ))}
                    </View>

                    {/* Summary Totals */}
                    <View style={styles.summarySection}>
                      <View style={styles.summaryRow}>
                        <Text
                          style={[
                            styles.summaryLabel,
                            { color: textSecondary },
                          ]}
                        >
                          Subtotal
                        </Text>
                        <Text
                          style={[styles.summaryVal, { color: textPrimary }]}
                        >
                          $
                          {(
                            selectedVenta.total - (selectedVenta.propina || 0)
                          ).toLocaleString()}
                        </Text>
                      </View>
                      {selectedVenta.propina > 0 && (
                        <View style={styles.summaryRow}>
                          <Text
                            style={[
                              styles.summaryLabel,
                              { color: textSecondary },
                            ]}
                          >
                            Propina
                          </Text>
                          <Text
                            style={[styles.summaryVal, { color: statusColors[1] }]}
                          >
                            ${selectedVenta.propina.toLocaleString()}
                          </Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.summaryRow,
                          {
                            marginTop: 8,
                            borderTopWidth: 1,
                            borderTopColor: borderColor,
                            paddingTop: 12,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.totalLabelFinal,
                            { color: textPrimary },
                          ]}
                        >
                          TOTAL
                        </Text>
                        <Text style={[styles.totalValFinal, { color: accentColor }]}>
                          ${selectedVenta.total.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </ScrollView>

                  <Pressable
                    style={[
                      styles.modalCloseBtn,
                      { backgroundColor: accentColor },
                    ]}
                    onPress={() => setModalVisible(false)}
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

      {/* Action Sheet Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={actionSheetVisible}
        onRequestClose={() => setActionSheetVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setActionSheetVisible(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: cardBg }]}>
            <View style={styles.actionSheetHeader}>
              <View style={styles.actionSheetHandle} />
              <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>
                Opciones de Venta
              </Text>
              <Text style={[styles.actionSheetSub, { color: textSecondary }]}>
                Código: {activeVenta?.codigo}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.actionItem,
                pressed && styles.actionItemPressed,
              ]}
              onPress={() => activeVenta && handleVerDetalles(activeVenta.id_venta)}
            >
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: `${accentColor}15` },
                ]}
              >
                <Ionicons name="eye-outline" size={24} color={accentColor} />
              </View>
              <Text style={[styles.actionText, { color: textPrimary }]}>
                Ver Detalles
              </Text>
            </Pressable>

            {activeVenta?.estado !== 0 && activeVenta?.estado !== 3 && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                ]}
                onPress={handleAnularVenta}
              >
                <View
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: "#EF444415" },
                  ]}
                >
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </View>
                <Text style={[styles.actionText, { color: "#EF4444" }]}>
                  Solicitar Anulación
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.actionCancelBtn,
                { backgroundColor: isDark ? "#374151" : "#F3F4F6" },
              ]}
              onPress={() => setActionSheetVisible(false)}
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
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(155,155,155,0.1)",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(155,155,155,0.1)',
  },
  plusBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E11D48",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#E11D48",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    gap: 4,
  },
  plusBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  headerTitle: { fontSize: 24, fontWeight: "800" },
  headerSubtitle: { fontSize: 15, fontWeight: "500", opacity: 0.8 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { padding: 16, paddingBottom: 100 },

  // Resumen Card
  resumenCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#E11D48",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  resumenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resumenLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "700",
  },
  resumenValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 4,
  },
  resumenIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  resumenFooter: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  resumenStat: { flex: 1, alignItems: "center" },
  resumenStatValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  resumenStatLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  resumenDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  // Card Improved
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 6,
    marginBottom: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardMainRow: { flexDirection: "row", justifyContent: "space-between" },
  cardLeftContent: { flex: 1.2 },
  cardTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardCode: { fontSize: 17, fontWeight: "900", letterSpacing: 0.5 },
  statusBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  cardDetailsList: { gap: 6 },
  detailItemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowIcon: { width: 16, textAlign: "center" },
  detailValue: { fontSize: 14, fontWeight: "600" },

  hostessPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 1,
  },
  hostessText: { fontSize: 13, fontWeight: "800" },

  cardRightContent: {
    flex: 0.8,
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0,0,0,0.03)",
    paddingLeft: 12,
  },
  methodBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    opacity: 0.8,
  },
  methodText: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },

  cardTotalBig: { fontSize: 22, fontWeight: "900" },
  subInfoRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  cardSubCount: { fontSize: 12, fontWeight: "600" },
  cardPropinaGreen: { fontSize: 12, fontWeight: "800", color: "#10B981" },
  moreOptionsBtn: { padding: 4, marginTop: 4 },

  // Empty State
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
    marginBottom: 20,
  },
  modalTitleText: { fontSize: 24, fontWeight: "900" },
  modalSubText: { fontSize: 14, fontWeight: "600" },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal Reference Layout
  detailsGrid: {
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
  methodBadgeDetail: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  methodTextDetail: { fontSize: 13, fontWeight: "800" },

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
  summaryLabel: { fontSize: 14, fontWeight: "700" },
  summaryVal: { fontSize: 15, fontWeight: "800" },
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

  // Toast
  toastCard: {
    width: "90%",
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  toastIconBox: {
    width: 80,
    height: 80,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  toastTitle: { fontSize: 22, fontWeight: "900", marginBottom: 8 },
  toastMessage: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.8,
  },
  toastBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  toastBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  // Action Sheet
  actionSheet: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  actionSheetHeader: { alignItems: "center", marginBottom: 20 },
  actionSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginBottom: 15,
  },
  actionSheetTitle: { fontSize: 20, fontWeight: "900" },
  actionSheetSub: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
    gap: 16,
  },
  actionItemPressed: { backgroundColor: "rgba(0,0,0,0.03)" },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: { fontSize: 16, fontWeight: "700" },
  actionCancelBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  actionCancelText: { fontSize: 16, fontWeight: "800" },

  // Tab Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(155,155,155,0.05)",
    borderRadius: 16,
    padding: 4,
    marginTop: 15,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
  },

  // Timer Pill inside Card
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
  },
  timerLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: "monospace",
  },
  finishBtn: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  finishBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "900",
  },
});
