import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text as RNText,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { apiClient } from "../../../../api/client";
import { AnimatedButton } from "../../../../components/AnimatedButton";
import { AnimatedScreen } from "../../../../components/AnimatedScreen";
import { GarzonActionCard } from "../../../../components/GarzonActionCard";
import { GarzonStats } from "../../../../components/GarzonStats";
import { PremiumAlert } from "../../../../components/PremiumAlert";
import { EventDetailModal } from '../../../../components/EventDetailModal';
import { PremiumCalendar } from "../../../../components/PremiumCalendar";
import { PremiumHeaderActions } from "../../../../components/PremiumHeaderActions";
import { PremiumLiquidationCard } from "../../../../components/PremiumLiquidationCard";
import { PremiumUserProfile } from "../../../../components/PremiumUserProfile";
import { QRScannerModal } from "../../../../components/QRScannerModal";
import { RegistroAsistenciaModal } from "../../../../components/RegistroAsistenciaModal";
import { StaggeredFadeIn } from "../../../../components/StaggeredFadeIn";
import { useAccentColor } from "../../../../hooks/useAccentColor";
import { useAuthStore } from "../../../../store/authStore";

const { width } = Dimensions.get("window");

type GarzonState = {
  loading: boolean;
  refreshing: boolean;
  stats: any;
  recentActivity: any[];
  userStatus: number;
  hasNewAlert: boolean;
  selectedDates: string[];
  isModalVisible: boolean;
  hasOpenCaja: boolean;
  isQRScannerVisible: boolean;
  selectedEvent: any | null;
  alertConfig: {
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "danger";
    onConfirm?: () => void;
    showCancel?: boolean;
  };
};

type GarzonAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_REFRESHING"; payload: boolean }
  | { type: "SET_DATA"; payload: Partial<GarzonState> }
  | { type: "UPDATE_SELECTED_DATES"; payload: string[] }
  | { type: "SET_MODAL_VISIBLE"; payload: boolean }
  | { type: "SET_ALERT"; payload: GarzonState["alertConfig"] }
  | { type: "SET_NEW_ALERT"; payload: boolean }
  | { type: "SET_QR_VISIBLE"; payload: boolean }
  | { type: "SET_SELECTED_EVENT"; payload: any | null };

const initialGarzonState: GarzonState = {
  loading: true,
  refreshing: false,
  stats: null,
  recentActivity: [],
  userStatus: 1,
  hasNewAlert: false,
  selectedDates: [],
  isModalVisible: false,
  hasOpenCaja: true,
  isQRScannerVisible: false,
  selectedEvent: null,
  alertConfig: { visible: false, title: "", message: "", type: "info" },
};

function garzonReducer(state: GarzonState, action: GarzonAction): GarzonState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_REFRESHING":
      return { ...state, refreshing: action.payload };
    case "SET_DATA":
      return { ...state, ...action.payload };
    case "UPDATE_SELECTED_DATES":
      return { ...state, selectedDates: action.payload };
    case "SET_MODAL_VISIBLE":
      return { ...state, isModalVisible: action.payload };
    case "SET_ALERT":
      return { ...state, alertConfig: action.payload };
    case "SET_NEW_ALERT":
      return { ...state, hasNewAlert: action.payload };
    case "SET_QR_VISIBLE":
      return { ...state, isQRScannerVisible: action.payload };
    case "SET_SELECTED_EVENT":
      return { ...state, selectedEvent: action.payload };
    default:
      return state;
  }
}

export default function GarzonHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { accentColor, gradientColors, isDark } = useAccentColor();
  const insets = useSafeAreaInsets();
  const dataRef = useRef<string>("");

  const [state, dispatch] = useReducer(garzonReducer, initialGarzonState);
  const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);
  const [eventDetail, setEventDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const {
    loading,
    refreshing,
    stats,
    recentActivity,
    userStatus,
    hasNewAlert,
    selectedDates,
    isModalVisible,
    hasOpenCaja,
    alertConfig,
    isQRScannerVisible,
    selectedEvent,
  } = state;

  const bg = isDark ? "#000000" : "#F3F4F6";
  const cardBg = isDark ? "#111111" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#64748B";
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: GarzonState["alertConfig"]["type"] = "info",
      onConfirm?: () => void,
      showCancel = false,
    ) => {
      dispatch({
        type: "SET_ALERT",
        payload: { visible: true, title, message, type, onConfirm, showCancel },
      });
    },
    [],
  );

  const fetchData = useCallback(async (isManual = false) => {
    try {
      const [statsRes, eventsRes, userRes, cajaRes, statusRes] =
        await Promise.all([
          apiClient("/events/stats"),
          apiClient("/events/user"),
          apiClient("/auth/me"),
          apiClient("/cashregister/status"),
          apiClient("/users/status"),
        ]);

      const newData = {
        stats: statsRes.data,
        events: eventsRes.data,
        user: userRes.user,
        caja: cajaRes.data,
        status: statusRes.status,
      };
      const serialized = JSON.stringify(newData);
      const hasChanges = dataRef.current !== serialized;
      dataRef.current = serialized;

      dispatch({
        type: "SET_DATA",
        payload: {
          stats: statsRes.data,
          recentActivity: eventsRes.data || [],
          hasOpenCaja: cajaRes.data?.hasOpenCaja ?? true,
          userStatus: statusRes.status ?? 1,
        },
      });

      if (userRes.success && userRes.user) {
        useAuthStore.getState().updateProfile(userRes.user);
      }

      if (isManual) {
        Toast.show({
          type: hasChanges ? "success" : "info",
          text1: hasChanges ? "Ã‰xito" : "InformaciÃ³n",
          text2: hasChanges ? "Datos actualizados" : "Sin cambios en los datos",
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error("Error fetching garzon data:", error);
      if (isManual) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No se pudo actualizar",
        });
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_REFRESHING", payload: false });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refresh_requests", () => {
      fetchData();
    });
    return () => sub.remove();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    dispatch({ type: "SET_REFRESHING", payload: true });
    fetchData(true);
  }, [fetchData]);

  const selectedEvents = useMemo(() => {
    if (selectedDates.length === 0) return [];
    return recentActivity
      .filter((e) => {
        const d = new Date(e.date);
        const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        return selectedDates.includes(dateStr);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedDates, recentActivity]);

  const typeLabels: Record<string, string> = {
    comision: "ComisiÃ³n",
    asistencia: "Asistencia",
    anticipo: "Anticipo",
    propina: "Propina",
    venta: "Venta",
    servicio: "Servicio",
    gratificacion: "GratificaciÃ³n"
  };

  const getEventLabel = (item: any) => {
    if (!item) return "";
    if (item.type === 'comision') {
      if (item.subType === 'venta') return "ComisiÃ³n de Venta";
      if (item.subType === 'servicio') return "ComisiÃ³n de Servicio";
      return "ComisiÃ³n";
    }
    if (item.type === 'propina') {
      if (item.subType === 'venta') return "Propina de Venta";
      return "Propina";
    }
    return typeLabels[item.type] || item.type.toUpperCase();
  };

  const handleSelectEvent = async (item: any) => {
      setEventDetail(null);
      setLoadingDetail(false);
      dispatch({ type: "SET_SELECTED_EVENT", payload: item });
      if (['comision', 'propina', 'asistencia', 'anticipo'].includes(item.type)) {
          setLoadingDetail(true);
          try {
            const res = await apiClient(`/events/detail/${item.id}?type=${item.type}`);
              if (res.success && res.data) setEventDetail(res.data);
          } catch (e) {
              console.error('detail fetch error', e);
          } finally {
              setLoadingDetail(false);
          }
      }
  };

  const getStatusLabel = (status: any) => {
    if (typeof status === 'string') return status.toUpperCase();
    if (status === 1) return 'PENDIENTE';
    if (status === 2) return 'CONFIRMADO';
    if (status === 3) return 'RECHAZADO';
    return 'COMPLETADO';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        <AnimatedScreen>
          <LinearGradient
            colors={gradientColors as any}
            style={[styles.header, { paddingTop: insets.top + 10 }]}
          >
            <PremiumHeaderActions
              hasNewAlert={hasNewAlert}
              setHasNewAlert={(val) =>
                dispatch({ type: "SET_NEW_ALERT", payload: val })
              }
              showAlert={showAlert}
              profilePath="/garzon/perfil"
              onQRScannerPress={() => setShowAsistenciaModal(true)}
            />
            <PremiumUserProfile user={user} userStatus={userStatus} />
          </LinearGradient>

          <View style={{ height: 10 }} />

          <GarzonStats stats={stats} events={recentActivity} />

          <View style={styles.actionGrid}>
            <StaggeredFadeIn index={0} style={{ flex: 1 }}>
              <GarzonActionCard
                title="PEDIDOS"
                description={
                  hasOpenCaja ? "Inicia una nueva orden" : "Caja cerrada"
                }
                icon="beer"
                color={accentColor}
                disabled={!hasOpenCaja}
                onPress={() => router.push("/(app)/garzon/pedidos")}
              />
            </StaggeredFadeIn>

            <StaggeredFadeIn index={1} style={{ flex: 1 }}>
              <GarzonActionCard
                title="SERVICIOS"
                description={
                  hasOpenCaja ? "Control de salones" : "Caja cerrada"
                }
                icon="bed"
                color="#10B981"
                disabled={!hasOpenCaja}
                onPress={() => router.push("/(app)/garzon/servicios")}
              />
            </StaggeredFadeIn>
          </View>

          {!hasOpenCaja && (
            <View style={styles.cajaWarning}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <RNText style={styles.cajaWarningText}>
                No puedes realizar pedidos sin una caja abierta.
              </RNText>
            </View>
          )}

          <View style={{ marginTop: 15 }}>
            <PremiumLiquidationCard
              user={user}
              events={recentActivity}
              title="Resumen de Propinas y Ventas"
              totalLabel="Ingresos Acumulados"
            />
          </View>

          <PremiumCalendar
            events={recentActivity}
            selectedDates={selectedDates}
            onDateToggle={(dateStr) => {
              const next = selectedDates.includes(dateStr)
                ? selectedDates.filter((d) => d !== dateStr)
                : [...selectedDates, dateStr];
              dispatch({ type: "UPDATE_SELECTED_DATES", payload: next });
            }}
          />

          {selectedDates.length > 0 && (
            <View
              style={[
                styles.selectionFloat,
                {
                  backgroundColor: isDark ? "#111111" : "#FFFFFF",
                },
              ]}
            >
              <RNText style={[styles.selectionText, { color: "#FFF" }]}>
              {selectedDates.length} {selectedDates.length === 1 ? 'día' : 'días'} seleccionados
              </RNText>
              <View style={styles.selectionActions}>
                <Pressable
                  onPress={() =>
                    dispatch({ type: "UPDATE_SELECTED_DATES", payload: [] })
                  }
                  style={styles.clearBtn}
                  accessibilityLabel="Borrar selecciÃ³n"
                  accessibilityRole="button"
                >
                  <RNText style={styles.clearBtnText}>Borrar</RNText>
                </Pressable>
                <Pressable
                  onPress={() =>
                    dispatch({ type: "SET_MODAL_VISIBLE", payload: true })
                  }
                  style={[styles.viewBtn, { backgroundColor: accentColor }]}
                  accessibilityLabel="Ver detalles"
                  accessibilityRole="button"
                >
                  <RNText style={styles.viewBtnText}>Detalles</RNText>
                </Pressable>
              </View>
            </View>
          )}
          <View style={{ height: 100 }} />
        </AnimatedScreen>
      </ScrollView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() =>
          dispatch({ type: "SET_MODAL_VISIBLE", payload: false })
        }
      >
        <View style={styles.modalOverlayBottom}>
          <View style={[styles.modalContent, { backgroundColor: bg }]}>
            <View style={styles.modalHeader}>
              <View>
                <RNText style={[styles.modalTitle, { color: textPrimary }]}>
                  Eventos Detallados
                </RNText>
                <RNText
                  style={[styles.modalSubtitle, { color: textSecondary }]}
                >
                  {selectedDates.length} días
                </RNText>
              </View>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: cardBg }]}
                onPress={() =>
                  dispatch({ type: "SET_MODAL_VISIBLE", payload: false })
                }
                accessibilityLabel="Cerrar modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={selectedEvents}
              keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
              renderItem={({ item }) => {
                const isAnticipo = item.type === "anticipo";
                const iconColor = isAnticipo ? "#EF4444" : "#10B981";
                return (
                  <Pressable
                    onPress={() => handleSelectEvent(item)}
                    style={({ pressed }) => [
                      styles.eventItem,
                      { backgroundColor: cardBg, borderColor, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: `${iconColor}20` },
                      ]}
                    >
                      <Ionicons
                        name={item.type === 'asistencia' ? 'calendar' : item.type === 'anticipo' ? 'cash' : 'wallet-outline'}
                        size={18}
                        color={iconColor}
                      />
                    </View>
                    <View style={styles.eventInfo}>
                      <RNText
                        style={[styles.eventTitle, { color: textPrimary }]}
                      >
                        {getEventLabel(item)} {item.codigo && item.codigo !== 'TIPS' ? `- ${item.codigo}` : ''}
                      </RNText>
                      <RNText
                        style={[styles.eventTime, { color: textSecondary }]}
                      >
                        {new Date(item.date).toLocaleDateString('es-ES', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                      </RNText>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <RNText
                        style={[
                          styles.eventPrice,
                          { color: isAnticipo ? "#EF4444" : "#10B981" },
                        ]}
                      >
                        {isAnticipo ? "-" : "+"}${item.amount.toLocaleString()}
                      </RNText>
                      <RNText style={[styles.statusMiniText, { color: textSecondary }]}>
                        {getStatusLabel(item.estado)}
                      </RNText>
                    </View>
                  </Pressable>
                );
              }}
              contentContainerStyle={{ padding: 20 }}
            />
          </View>
        </View>
      </Modal>
      <EventDetailModal
          visible={!!selectedEvent}
          event={selectedEvent}
          eventDetail={eventDetail}
          loadingDetail={loadingDetail}
          onClose={() => { dispatch({ type: "SET_SELECTED_EVENT", payload: null }); setEventDetail(null); }}
          getEventLabel={getEventLabel}
          getStatusLabel={getStatusLabel}
      />

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={() => {
          dispatch({
            type: "SET_ALERT",
            payload: { ...alertConfig, visible: false },
          });
          alertConfig.onConfirm?.();
        }}
        onCancel={() =>
          dispatch({
            type: "SET_ALERT",
            payload: { ...alertConfig, visible: false },
          })
        }
        showCancel={alertConfig.showCancel}
      />

      <QRScannerModal
        visible={isQRScannerVisible}
        onClose={() => dispatch({ type: "SET_QR_VISIBLE", payload: false })}
        onScanned={async () => {
          fetchData(false);
        }}
      />

      <RegistroAsistenciaModal
        visible={showAsistenciaModal}
        onClose={() => setShowAsistenciaModal(false)}
        onRegistered={() => {
          setShowAsistenciaModal(false);
          fetchData(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  actionGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 20,
  },
  cajaWarning: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 6,
  },
  cajaWarningText: { color: "#EF4444", fontSize: 12, fontWeight: "700" },
  selectionFloat: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#111111",
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 10,
  },
  selectionText: { fontWeight: "700" },
  selectionActions: { flexDirection: "row", gap: 10 },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  clearBtnText: { color: "#EF4444", fontWeight: "800" },
  viewBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  viewBtnText: { color: "#FFF", fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    height: "80%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  modalHeader: {
    padding: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#37415120",
  },
  modalTitle: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  modalSubtitle: { fontSize: 14, marginTop: 4 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  eventInfo: { flex: 1, marginLeft: 15 },
  eventTitle: { fontSize: 15, fontWeight: "700" },
  eventTime: { fontSize: 12, marginTop: 2 },
  eventPrice: { fontSize: 16, fontWeight: "800" },
  alertCard: {
    width: "85%",
    borderRadius: 32,
    padding: 24,
    alignItems: "center",
  },
  alertTitle: { fontSize: 22, fontWeight: "900", marginBottom: 10 },
  alertMessage: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  alertActions: { flexDirection: "row", gap: 12, width: "100%" },
  alertBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  alertBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  qrButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  detailCard: {
    maxHeight: '85%',
    width: '100%',
    borderRadius: 32,
    padding: 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  detailIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  detailCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  detailBody: {
    alignItems: 'center',
    marginBottom: 30
  },
  detailType: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8
  },
  detailAmount: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 25,
    opacity: 0.5
  },
  detailRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700'
  },
  statusBadgeDetail: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  statusTextDetail: {
    fontSize: 11,
    fontWeight: '800'
  },
  confirmBtn: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800'
  },
  statusMiniText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4
  }
});
