﻿import { Ionicons } from "@expo/vector-icons";
import { FlashList as ShopifyFlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MotiView } from "moti";
import {
  DeviceEventEmitter,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { apiClient, BASE_URL } from '@/api/client';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { PremiumFAB } from '@/components/ui/PremiumFAB';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTimer } from '@/context/TimerContext';
import { calculateRemainingTime, parseDateSafe } from '@/utils/timeUtils';
import { useAccentColor } from '@/hooks/useAccentColor';
import { rotateColor } from '@/utils/colors';

import logger from '@/utils/logger';
const FlashList = ShopifyFlashList as any;

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

// Componente aislado para el temporizador: tiene su propio tick interno
function TimerPill({ timer, serverOffset, accentColor, textSecondary, textPrimary }: {
  timer: any; serverOffset: number; accentColor: string; textSecondary: string; textPrimary: string;
}) {
  const [remaining, setRemaining] = useState(() => calculateRemainingTime(timer, serverOffset));

  useEffect(() => {
    setRemaining(calculateRemainingTime(timer, serverOffset));
    if (timer.isPaused) return;
    const interval = setInterval(() => {
      setRemaining(calculateRemainingTime(timer, serverOffset));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer, serverOffset]);

  const fmt = (secs: number) => {
    const absSecs = isNaN(secs) ? 0 : Math.max(0, Math.floor(Math.abs(secs)));
    const m = Math.floor(absSecs / 60);
    const s = absSecs % 60;
    return `${secs < 0 ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[
      styles.timerPill,
      { backgroundColor: remaining < 60 ? '#EF444420' : `${accentColor}20`, borderColor: remaining < 60 ? '#EF444440' : `${accentColor}40` }
    ]}>
      <Ionicons name="time" size={16} color={remaining < 60 ? '#EF4444' : accentColor} />
      <View>
        <Text style={[styles.timerLabel, { color: textSecondary }]}>RESTANTE</Text>
        <Text style={[styles.timerValue, { color: remaining < 60 ? '#EF4444' : textPrimary }]}>{fmt(remaining)}</Text>
      </View>
    </View>
  );
}

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
  const [selectedVenta, setSelectedVenta] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const ventasList = Array.isArray(ventas) ? ventas : [];

  // Action Sheet state
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [activeVenta, setActiveVenta] = useState<any>(null);
  const [anulacionModalVisible, setAnulacionModalVisible] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [montoAnulacion, setMontoAnulacion] = useState("");
  const [anulandoVenta, setAnulandoVenta] = useState(false);

  const { timers, serverOffset, refreshTimers } = useTimer();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<"historial" | "proceso">(
    (params.tab as any) === "proceso" ? "proceso" : "historial",
  );
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
  const cardBg = isDark ? "#111111" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? `${accentColor}40` : "rgba(0,0,0,0.05)";

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

      const salesPayload = Array.isArray(resSales.data)
        ? resSales.data
        : Array.isArray(resSales.data?.data)
          ? resSales.data.data
          : [];
      const newData = { sales: salesPayload, resumen: resResumen.data };
      const serialized = JSON.stringify(newData);
      const hasChanges = dataRef.current !== serialized;
      dataRef.current = serialized;

      if (resSales.success) {
        setVentas(salesPayload);
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
      logger.captureException(error, { context: 'Ventas:fetchData' });
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
      logger.info("[DEBUG] Event refresh_sales received, updating list...", data);
      
      // La notificación global (modal) ya la maneja GlobalTimerAlert.tsx
      // Aquí solo refrescamos la lista.
      fetchVentas();
      refreshTimers();
    });
    return () => subscription.remove();
  }, [fetchVentas, refreshTimers]);

  // Tick eliminado: TimerPill maneja su propio intervalo
  const onRefresh = () => {
    setRefreshing(true);
    fetchVentas(true);
    refreshTimers();
  };

  const getVentaId = (venta: any) => venta?.id ?? venta?.id_venta ?? null;
  const formatMontoInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString("es-CL");
  };
  const parseMontoInput = (value: string) => Number(value.replace(/\D/g, "") || 0);

  const handleOpenActionSheet = (venta: any) => {
    setActiveVenta(venta);
    setActionSheetVisible(true);
  };

  const openAnulacionModal = () => {
    if (!activeVenta) return;
    setActionSheetVisible(false);
    setMotivoAnulacion("");
    setMontoAnulacion(formatMontoInput(String(Math.round(Number(activeVenta.total || 0)))));
    setAnulacionModalVisible(true);
  };

  const closeAnulacionModal = () => {
    if (anulandoVenta) return;
    setAnulacionModalVisible(false);
    setMotivoAnulacion("");
    setMontoAnulacion("");
  };

  const handleVerDetalles = async (id: number | string) => {
    setActionSheetVisible(false);
    setLoadingDetail(true);
    setModalVisible(true);
    try {
      const res = await apiClient(`/ventas/${id}`);
      if (res?.success && res.data) {
        setSelectedVenta(res.data);
      } else {
        showToast("Error", res?.message || "No se pudo obtener el detalle de la venta");
        setModalVisible(false);
      }
    } catch (error: any) {
      showToast("Error", error?.message || "Error al cargar detalles");
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
          const ventaId = getVentaId(venta);
          const res = await apiClient(`/ventas/${ventaId}`, {
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
        } catch {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          showToast("Error", "Error al procesar la finalización de la venta");
        }
      },
    });
  };

  const handleAnularVenta = async () => {
    if (!activeVenta) return;
    const ventaId = getVentaId(activeVenta);
    const monto = parseMontoInput(montoAnulacion);
    const motivo = motivoAnulacion.trim();

    if (!ventaId) {
      showToast("Error", "No se pudo identificar la venta.");
      return;
    }

    if (!monto || monto <= 0) {
      showToast("Error", "Debes ingresar un monto mayor a 0.");
      return;
    }

    if (monto > Number(activeVenta.total || 0)) {
      showToast("Error", "El monto no puede ser mayor al total de la venta.");
      return;
    }

    if (!motivo) {
      showToast("Error", "Debes ingresar el motivo de la anulación.");
      return;
    }

    try {
      setAnulandoVenta(true);
      const res = await apiClient(
        `/ventas/anulacion`,
        {
          method: "POST",
          body: JSON.stringify({
            ventaId,
            motivo,
            monto,
          }),
        },
      );
      if (res.success || !res.error) {
        closeAnulacionModal();
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
    } catch {
      showToast("Error", "Error al procesar la solicitud de anulación");
    } finally {
      setAnulandoVenta(false);
    }
  };

  const renderVentaCard = ({ item }: { item: any }) => {
const productCount = item.item_count || 0;
    // Generar un color dinámico basado en el ID para variedad, pero manteniendo el status color si es importante
    // O mejor aún: usar una rotación del color de acento según la posición/ID
    const ventaId = getVentaId(item);
    const itemAccent = rotateColor(accentColor, ((Number(ventaId) || 0) % 10) * 36);
    const statusColor = item.estado === 2 ? itemAccent : (statusColors[item.estado] || "#6B7280");

    // Check if this sale has an active timer (matching room or service ID)
    const activeTimer = timers.find(
      (t) =>
        t.tipoTransaccion === "venta" &&
        (String(t.servicioId) === String(ventaId) ||
          (String(t.roomId) === String(item.habitacion_id) && item.estado === 2)),
    );

    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400 }}
        style={{ marginHorizontal: 8 }}
      >
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
               <Text style={[styles.cardCode, { color: textPrimary }]}>Codigo : {item.codigo}</Text>
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

              {/* Cantidad de productos */}
              <View style={styles.detailItemRow}>
                <Ionicons
                  name="cube-outline"
                  size={14}
                  color={textSecondary}
                  style={styles.rowIcon}
                />
                <Text style={[styles.detailValue, { color: textPrimary }]}>
                  {productCount} {productCount === 1 ? 'producto' : 'productos'}
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
                  {parseDateSafe(item.fecha_crea).toLocaleString("es-CL", {
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
              <TimerPill
                timer={activeTimer}
                serverOffset={serverOffset}
                accentColor={accentColor}
                textSecondary={textSecondary}
                textPrimary={textPrimary}
              />
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
            
            {/* Status Badge below payment method */}
            <View style={[
              styles.methodBadgeContainer,
              { marginTop: 4 }
            ]}>
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

            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.cardTotalBig, { color: textPrimary }]}>
                ${item.total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </Text>
              <View style={styles.subInfoRow}>
                <Text style={[styles.cardSubCount, { color: textSecondary }]}>
                  {productCount} items
                </Text>
                {item.propina > 0 && (
                  <>
                    <Text style={{ color: textSecondary, marginHorizontal: 4 }}>
                              â€¢
                    </Text>
                    <Text style={styles.cardPropinaGreen}>
                      +${item.propina.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
        </Pressable>
      </MotiView>
    );
  };

  if (loading) return <VentasSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? 'dark' : 'light'} />
      <PremiumHeader
        title="Ventas"
        subtitle={activeTab === "historial" ? "Historial de transacciones" : "Ventas activas en tiempo real"}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
              <TouchableOpacity onPress={() => fetchVentas(true)} style={styles.backBtnRight}>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Pressable onPress={() => router.replace("/cajero/(tabs)" as any)} style={styles.backBtnRight}>
                  <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backTextRight}>Atrás</Text>
              </Pressable>
          </View>
        }
      />

      <View style={[styles.tabContainer, {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          height: isTablet ? 56 : 48,
          marginHorizontal: 16,
          marginTop: 15,
          gap: 12
      }]}>
          <Pressable
            style={[
              styles.tab,
              activeTab === "historial" 
                ? { backgroundColor: accentColor }
                : { borderWidth: 1, borderColor: accentColor + '30' },
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
                  : { color: isDark ? "#9CA3AF" : "#64748B" },
              ]}
            >
              Listado de Ventas
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tab,
              activeTab === "proceso" 
                ? { backgroundColor: accentColor }
                : { borderWidth: 1, borderColor: accentColor + '30' },
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
                    : { color: isDark ? "#9CA3AF" : "#64748B" },
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
      {/* Main Content */}
      <FlashList
        data={
          loadingSales
            ? [1, 2, 3, 4] as any
            : (activeTab === "historial"
              ? ventasList
              : ventasList.filter(
                (v) =>
                  v.estado === 2 ||
                  timers.some(
                    (t) =>
                      t.tipoTransaccion === "venta" &&
                      (t.servicioId === getVentaId(v) ||
                        (t.roomId === v.habitacion_id && v.estado === 2)),
                  ),
              ))
        }
        renderItem={loadingSales ? VentaCardSkeleton : renderVentaCard}
        numColumns={numColumns}
        estimatedItemSize={120}
        ListHeaderComponent={resumen && activeTab === "historial" ? (
          <View style={[styles.resumenCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : accentColor, shadowColor: isDark ? 'transparent' : accentColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
            <View style={styles.resumenRow}>
              <View>
                <Text style={[styles.resumenLabel, { color: isDark ? textSecondary : 'rgba(255,255,255,0.8)' }]}>TOTAL VENTAS HOY</Text>
                <Text style={[styles.resumenValue, { color: '#FFFFFF' }]}>${(resumen.resumen_general?.total_ventas_monto || resumen.total_hoy || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 16 }}>
                <Ionicons name="stats-chart" size={32} color="#FFFFFF" />
              </View>
            </View>
          </View>
        ) : null}
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

      {/* Detail Modal Refactored Premium */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: cardBg, borderColor }]}>
            {loadingDetail ? (
              <DetailSkeleton />
            ) : (
              selectedVenta && (
                <View style={{ flex: 1 }}>
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalTitleText, { color: textPrimary }]}>Detalle de Venta</Text>
                  <Text style={[styles.modalSubText, { color: textSecondary }]}>Código: {selectedVenta.codigo}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ backgroundColor: (statusColors[selectedVenta.estado] || accentColor) + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: (statusColors[selectedVenta.estado] || accentColor) + '30' }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: statusColors[selectedVenta.estado] || accentColor }}>{(statusLabels[selectedVenta.estado] || 'VENTA').toUpperCase()}</Text>
                      </View>
                      <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={textSecondary} />
                      </Pressable>
                    </View>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                    {/* Origen de la venta */}
                    <View style={[styles.origenSection, { backgroundColor: isDark ? '#1a1a2e' : '#F8FAFC', borderColor }]}>
                      <View style={styles.origenRow}>
                        <View style={[styles.origenIconBox, { backgroundColor: selectedVenta.pedido_id ? `${accentColor}20` : '#10B98120' }]}>
                          <Ionicons
                            name={selectedVenta.pedido_id ? 'receipt-outline' : 'storefront-outline'}
                            size={20}
                            color={selectedVenta.pedido_id ? accentColor : '#10B981'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.origenType, { color: selectedVenta.pedido_id ? accentColor : '#10B981' }]}>
                            {selectedVenta.pedido_id ? 'VENTA DESDE PEDIDO' : 'VENTA DIRECTA EN BARRA'}
                          </Text>
                          {selectedVenta.pedido_id ? (
                            <View style={styles.origenPersonas}>
                              <Text style={[styles.origenPersonaLabel, { color: textSecondary }]}>
                                  Pedido por: <Text style={[styles.origenPersonaValue, { color: textPrimary }]}>{selectedVenta.garzon_nombre || 'â€”'} {selectedVenta.garzon_nick ? `(@${selectedVenta.garzon_nick})` : ''}</Text>
                              </Text>
                              <Text style={[styles.origenPersonaLabel, { color: textSecondary }]}>
                                  Procesado por: <Text style={[styles.origenPersonaValue, { color: textPrimary }]}>{selectedVenta.cajero_nombre || 'â€”'} {selectedVenta.cajero_nick ? `(@${selectedVenta.cajero_nick})` : ''}</Text>
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.origenPersonaLabel, { color: textSecondary }]}>
                                  Vendido por: <Text style={[styles.origenPersonaValue, { color: textPrimary }]}>{selectedVenta.cajero_nombre || selectedVenta.vendedor_nombre || 'â€”'} {selectedVenta.cajero_nick ? `(@${selectedVenta.cajero_nick})` : ''}</Text>
                            </Text>
                          )}
                        </View>
                      </View>

                      {selectedVenta.habitacion_id && (
                        <View style={[styles.habitacionRow, { borderTopColor: borderColor }]}>
                          <Ionicons name="bed-outline" size={16} color={accentColor} />
                          <Text style={[styles.origenPersonaLabel, { color: textSecondary, flex: 1 }]}>
                                Habitación: <Text style={[styles.origenPersonaValue, { color: textPrimary }]}>{selectedVenta.habitacion_nombre || selectedVenta.habitacion_numero || 'â€”'}</Text>
                          </Text>
                          {selectedVenta.tiempo ? (
                            <View style={[styles.tiempoBadge, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40` }]}>
                              <Ionicons name="time-outline" size={12} color={accentColor} />
                              <Text style={[styles.tiempoText, { color: accentColor }]}>{selectedVenta.tiempo} min</Text>
                            </View>
                          ) : null}
                        </View>
                      )}
                    </View>

                    {/* Top Info Header */}
                    <View style={{ marginBottom: 25, paddingHorizontal: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1, backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5', padding: 15, borderRadius: 18, borderWidth: 1, borderColor: borderColor }}>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: textSecondary, textTransform: 'uppercase', marginBottom: 6 }}>Fecha y Hora</Text>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>
                            {parseDateSafe(selectedVenta.fecha_crea).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5', padding: 15, borderRadius: 18, borderWidth: 1, borderColor: borderColor }}>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: textSecondary, textTransform: 'uppercase', marginBottom: 6 }}>Método Pago</Text>
                           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                             <Ionicons name={payMethodIcons[selectedVenta.metodo_pago] || "wallet"} size={16} color={accentColor} />
                             <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>{String(selectedVenta.metodo_pago || 'EFECTIVO').toUpperCase()}</Text>
                           </View>
                        </View>
                      </View>
                    </View>

                    {/* Cliente Section */}
                    <View style={{ marginBottom: 25 }}>
                      <View style={{ flex: 1, gap: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Cliente</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: borderColor }}>
                          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#333' : '#DDD', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="person-outline" size={18} color={textPrimary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }} numberOfLines={1}>{selectedVenta.cliente_nombre || "Sin Cliente"}</Text>
                            <Text style={{ fontSize: 10, color: textSecondary }}>{selectedVenta.habitacion_nombre || "General"}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Distributions Bio */}
                    {(selectedVenta.comisiones_detalle?.length > 0 || selectedVenta.propinas_detalle?.length > 0) && (
                      <View style={{ marginBottom: 25, gap: 12 }}>
                        {selectedVenta.comisiones_detalle?.length > 0 && (
                          <View style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: borderColor }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Distribución de Comisiones</Text>
                              {selectedVenta.total_comision > 0 && (
                                <Text style={{ fontSize: 14, fontWeight: '900', color: accentColor }}>${Number(selectedVenta.total_comision).toLocaleString('es-CL')} total</Text>
                              )}
                            </View>
                            {selectedVenta.comisiones_detalle.map((c: any, idx: number) => (
                              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: idx === selectedVenta.comisiones_detalle.length - 1 ? 0 : 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                  {c.foto ? (
                                    <Image source={{ uri: `${BASE_URL}/img/users/${c.foto}` }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                                  ) : (
                                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: accentColor + '15', justifyContent: 'center', alignItems: 'center' }}>
                                      <Text style={{ fontSize: 10, fontWeight: '900', color: accentColor }}>{c.nick?.[0]?.toUpperCase()}</Text>
                                    </View>
                                  )}
                                  <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>@{c.nick}</Text>
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: accentColor }}>${Number(c.monto).toLocaleString('es-CL')}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {selectedVenta.propinas_detalle?.length > 0 && (
                          <View style={{ backgroundColor: isDark ? '#1A1A1A' : '#FFF', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: borderColor }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: textSecondary, textTransform: 'uppercase', marginBottom: 15, letterSpacing: 0.5 }}>Distribución de Propinas</Text>
                            {selectedVenta.propinas_detalle.map((p: any, idx: number) => (
                              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: idx === selectedVenta.propinas_detalle.length - 1 ? 0 : 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                  {p.foto ? (
                                    <Image source={{ uri: `${BASE_URL}/img/users/${p.foto}` }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                                  ) : (
                                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B98115', justifyContent: 'center', alignItems: 'center' }}>
                                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#10B981' }}>{p.nick?.[0]?.toUpperCase()}</Text>
                                    </View>
                                  )}
                                  <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>@{p.nick}</Text>
                                </View>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: '#10B981' }}>${Number(p.monto).toLocaleString('es-CL')}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Grouped Product Cards */}
                    <View style={{ marginTop: 5, paddingHorizontal: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: textSecondary, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        Listado de Productos
                      </Text>
                      
                       {(() => {
                         const dets = selectedVenta.detalles || [];
                         const grouped = dets.reduce((acc: any[], cur: any) => {
                           const hNick = cur.hostess_nick || selectedVenta.usuarios_nicks || 'Sin Anfitriona';
                           const key = `${cur.producto_nombre}-${hNick}`;
                           const idx = acc.findIndex(i => {
                              const ihNick = i.hostess_nick || selectedVenta.usuarios_nicks || 'Sin Anfitriona';
                              return `${i.producto_nombre}-${ihNick}` === key;
                           });
                           if (idx > -1) {
                             acc[idx].cantidad += Number(cur.cantidad) || 0;
                             acc[idx].sub_total += Number(cur.sub_total) || 0;
                             acc[idx].comision += Number(cur.comision || 0);
                           } else acc.push({ ...cur });
                           return acc;
                         }, []);
 
                         return grouped.map((det: any, idx: number) => (
                          <View key={idx} style={{ backgroundColor: cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor, marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                              <View style={{ backgroundColor: accentColor + '10', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                                <Text style={{ fontSize: 11, fontWeight: '900', color: accentColor }}>CANT: {det.cantidad}</Text>
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: textSecondary }}>${Number(det.precio).toLocaleString('es-CL')} c/u</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                              {det.producto_foto ? (
                                <Image source={{ uri: `${BASE_URL}/api/images/products/${det.producto_foto}` }} style={{ width: 40, height: 40, borderRadius: 10 }} />
                              ) : (
                                <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isDark ? '#333' : '#EEE', justifyContent: 'center', alignItems: 'center' }}>
                                   <Ionicons name="cube-outline" size={20} color={textSecondary} />
                                </View>
                              )}
                              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary, flex: 1 }}>{det.producto_nombre}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', borderTopWidth: 1, borderTopColor: borderColor + '40', paddingTop: 12 }}>
                               <View style={{ alignItems: 'flex-end' }}>
                                  <Text style={{ fontSize: 18, fontWeight: '900', color: textPrimary }}>${Number(det.sub_total).toLocaleString('es-CL')}</Text>
                               </View>
                            </View>
                          </View>
                        ));
                      })()}
                    </View>

                    {/* Summary Totals Detail */}
                    <View style={{ marginTop: 20, backgroundColor: isDark ? '#111' : '#F9F9F9', padding: 20, borderRadius: 24, borderWidth: 1, borderColor }}>
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ color: textSecondary, fontWeight: '700' }}>Subtotal</Text>
                          <Text style={{ color: textPrimary, fontWeight: '800' }}>${(selectedVenta.total - (selectedVenta.propina || 0)).toLocaleString('es-CL')}</Text>
                       </View>
                       {selectedVenta.propina > 0 && (
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: textSecondary, fontWeight: '700' }}>Propina</Text>
                            <Text style={{ color: '#10B981', fontWeight: '800' }}>+${Number(selectedVenta.propina).toLocaleString('es-CL')}</Text>
                         </View>
                       )}
                       <View style={{ height: 1, backgroundColor: borderColor, marginVertical: 10 }} />
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: textPrimary }}>TOTAL</Text>
                          <Text style={{ fontSize: 24, fontWeight: '900', color: accentColor }}>${Number(selectedVenta.total).toLocaleString('es-CL')}</Text>
                       </View>
                    </View>
                  </ScrollView>

                  <Pressable style={[styles.modalCloseBtn, { backgroundColor: accentColor }]} onPress={() => setModalVisible(false)}>
                    <Text style={styles.modalCloseBtnText}>Cerrar Detalles</Text>
                  </Pressable>
                </View>
              )
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={anulacionModalVisible}
        onRequestClose={closeAnulacionModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.anulacionModalCard,
              {
                backgroundColor: cardBg,
                borderColor: `${accentColor}35`,
              },
            ]}
          >
            <View style={styles.anulacionHeader}>
              <View style={[styles.anulacionIconBox, { backgroundColor: "#EF444415" }]}>
                <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.anulacionTitle, { color: textPrimary }]}>Solicitar Anulación</Text>
              <Text style={[styles.anulacionSubtitle, { color: textSecondary }]}>
                Completa el monto y el motivo para enviar la solicitud al administrador.
              </Text>
            </View>

            <View
              style={[
                styles.anulacionInfoCard,
                { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" },
              ]}
            >
              <Text style={[styles.anulacionInfoText, { color: textSecondary }]}>
                Código: <Text style={{ color: textPrimary, fontWeight: "800" }}>{activeVenta?.codigo || "-"}</Text>
              </Text>
              <Text style={[styles.anulacionInfoText, { color: textSecondary }]}>
                Cliente: <Text style={{ color: textPrimary, fontWeight: "800" }}>{activeVenta?.cliente_nombre || "Sin cliente"}</Text>
              </Text>
              <Text style={[styles.anulacionInfoText, { color: textSecondary }]}>
                Total referencia: <Text style={{ color: accentColor, fontWeight: "900" }}>${Number(activeVenta?.total || 0).toLocaleString("es-CL")}</Text>
              </Text>
            </View>

            <View style={styles.anulacionField}>
              <Text style={[styles.anulacionLabel, { color: textPrimary }]}>Monto solicitado *</Text>
              <TextInput
                value={montoAnulacion}
                onChangeText={(value) => setMontoAnulacion(formatMontoInput(value))}
                placeholder="Ingresa el monto"
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
                editable={!anulandoVenta}
                style={[
                  styles.anulacionInput,
                  {
                    color: textPrimary,
                    borderColor,
                    backgroundColor: isDark ? "#0F0F0F" : "#FFFFFF",
                  },
                ]}
              />
            </View>

            <View style={styles.anulacionField}>
              <Text style={[styles.anulacionLabel, { color: textPrimary }]}>Motivo de la anulación *</Text>
              <TextInput
                value={motivoAnulacion}
                onChangeText={setMotivoAnulacion}
                placeholder="Describe el motivo de la anulación"
                placeholderTextColor={textSecondary}
                editable={!anulandoVenta}
                multiline
                textAlignVertical="top"
                style={[
                  styles.anulacionTextarea,
                  {
                    color: textPrimary,
                    borderColor,
                    backgroundColor: isDark ? "#0F0F0F" : "#FFFFFF",
                  },
                ]}
              />
            </View>

            <View style={styles.anulacionActions}>
              <Pressable
                onPress={closeAnulacionModal}
                disabled={anulandoVenta}
                style={[
                  styles.anulacionSecondaryBtn,
                  { borderColor: `${accentColor}55`, backgroundColor: accentColor + "10" },
                ]}
              >
                <Text style={[styles.anulacionSecondaryText, { color: accentColor }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleAnularVenta}
                disabled={anulandoVenta}
                style={[
                  styles.anulacionPrimaryBtn,
                  { backgroundColor: accentColor, opacity: anulandoVenta ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.anulacionPrimaryText}>
                  {anulandoVenta ? "Enviando..." : "Enviar Solicitud"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Sheet Modal */}
      <Modal animationType="fade" transparent={true} visible={actionSheetVisible} onRequestClose={() => setActionSheetVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setActionSheetVisible(false)}>
          <View style={[styles.actionSheet, { backgroundColor: cardBg, borderColor: `${accentColor}40`, borderWidth: 1, borderBottomWidth: 0 }]}>
            <View style={styles.actionSheetHeader}>
              <View style={[styles.actionSheetHandle, { backgroundColor: `${accentColor}60` }]} />
              <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>Opciones de Venta</Text>
              <Text style={[styles.actionSheetSub, { color: textSecondary }]}>Código: {activeVenta?.codigo}</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]} onPress={() => {
              const ventaId = getVentaId(activeVenta);
              if (ventaId) handleVerDetalles(ventaId);
            }}>
              <View style={[styles.actionIconBox, { backgroundColor: accentColor + '15' }]}>
                <Ionicons name="eye-outline" size={24} color={accentColor} />
              </View>
              <Text style={[styles.actionText, { color: textPrimary }]}>Ver Detalles</Text>
            </Pressable>
            {activeVenta?.estado !== 0 && activeVenta?.estado !== 3 && (
              <Pressable style={({ pressed }) => [styles.actionItem, pressed && styles.actionItemPressed]} onPress={openAnulacionModal}>
                <View style={[styles.actionIconBox, { backgroundColor: "#EF444415" }]}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </View>
                <Text style={[styles.actionText, { color: "#EF4444" }]}>Solicitar Anulación</Text>
              </Pressable>
            )}
            <Pressable style={[styles.actionCancelBtn, { backgroundColor: accentColor + '15', borderWidth: 1, borderColor: accentColor + '40' }]} onPress={() => setActionSheetVisible(false)}>
              <Text style={[styles.actionCancelText, { color: accentColor }]}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <PremiumFAB
          label={activeTab === "historial" ? "NUEVA VENTA" : "NUEVO SERVICIO"}
          icon={activeTab === "historial" ? "cart-outline" : "add"}
          onPress={() => router.push(activeTab === "historial" ? "/cajero/nueva-venta" : "/cajero/nuevo-servicio")}
          visible={!modalVisible && !actionSheetVisible && !anulacionModalVisible && !alertConfig.visible}
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
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(155,155,155,0.1)",
  },
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

  plusBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 9999,
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#E11D48",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    gap: 4,
  },
  plusBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  headerTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontWeight: "600", opacity: 0.8 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContainer: { paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 100 },

  // Resumen Card
  resumenCard: {
    padding: 24,
    borderRadius: 32,
    marginBottom: 20,
    elevation: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
    marginBottom: 22,
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
  cardCode: { fontSize: 17, fontWeight: "900", letterSpacing: -0.5 },
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
  modalTitleText: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  modalSubText: { fontSize: 12, fontWeight: "600" },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },

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
  summaryLabel: { fontSize: 14, fontWeight: "700" },
  summaryVal: { fontSize: 15, fontWeight: "800" },
  totalLabelFinal: { fontSize: 18, fontWeight: "900" },
  totalValFinal: { fontSize: 24, fontWeight: "900", color: "#E11D48" },

  modalCloseBtn: {
    height: 56,
    borderRadius: 9999,
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
    borderRadius: 9999,
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
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  actionCancelText: { fontSize: 16, fontWeight: "800" },
  anulacionModalCard: {
    width: "92%",
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 16,
  },
  anulacionHeader: {
    alignItems: "center",
    gap: 8,
  },
  anulacionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  anulacionTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  anulacionSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  anulacionInfoCard: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  anulacionInfoText: {
    fontSize: 14,
    fontWeight: "600",
  },
  anulacionField: {
    gap: 8,
  },
  anulacionLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  anulacionInput: {
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
  },
  anulacionTextarea: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: "600",
  },
  anulacionActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  anulacionSecondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  anulacionSecondaryText: {
    fontSize: 15,
    fontWeight: "800",
  },
  anulacionPrimaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  anulacionPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  // Tab Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(155,155,155,0.05)",
    borderRadius: 9999,
    padding: 4,
    marginTop: 15,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 9999,
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
    borderRadius: 9999,
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
    borderRadius: 9999,
    marginBottom: 8,
  },
  finishBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "900",
  },
});

