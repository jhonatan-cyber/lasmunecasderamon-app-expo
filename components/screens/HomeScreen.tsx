import { apiClient } from "@/api/client";
import { ActiveServiceCard } from '@/components/anfitriona/ActiveServiceCard';
import { CajeroActionGrid } from '@/components/cajero/CajeroActionGrid';
import { CajeroStats } from '@/components/cajero/CajeroStats';
import { GarzonActionCard } from '@/components/garzon/GarzonActionCard';
import { GarzonStats } from '@/components/garzon/GarzonStats';
import { EventDetailModal } from '@/components/shared/EventDetailModal';
import { PremiumLiquidationCard } from '@/components/shared/PremiumLiquidationCard';
import { PremiumUserProfile } from '@/components/shared/PremiumUserProfile';
import { RegistroAsistenciaModal } from '@/components/shared/RegistroAsistenciaModal';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { AnimatedScreen } from '@/components/ui/AnimatedScreen';
import { DonutChart } from '@/components/ui/DonutChart';
import { PremiumAlert } from '@/components/ui/PremiumAlert';
import { PremiumCalendar } from '@/components/ui/PremiumCalendar';
import { PremiumHeaderActions } from '@/components/ui/PremiumHeaderActions';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { useAccentColor } from "@/hooks/useAccentColor";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuthStore } from "@/store/authStore";
import { formatCurrency } from "@/utils/format";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import React, { useCallback, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    RefreshControl,
    Text as RNText,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

interface HomeScreenProps {
  role: "anfitriona" | "garzon" | "cajero";
}

export function HomeScreen({ role }: HomeScreenProps) {
  const { accentColor, gradientColors, isDark } = useAccentColor();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const {
    loading,
    refreshing,
    events,
    stats,
    userStatus,
    hasNewAlert,
    selectedDates,
    activeService,
    pendingCount,
    payoutTotal,
    onRefresh,
    setSelectedDates,
    setHasNewAlert,
  } = useDashboardData(role) as any;

  const [alertConfig, setAlertConfig] = useState<any>({ visible: false, title: "", message: "", type: "info" });
  const [showAsistenciaModal, setShowAsistenciaModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetail, setEventDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const bg = isDark ? "#000000" : "#F3F4F6";
  const cardBg = isDark ? "#111111" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? `${accentColor}40` : "#E2E8F0";

  const showAlert = useCallback((title: string, message: string, type: any = "info", onConfirm?: () => void, showCancel = false) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm, showCancel });
  }, []);

  const handleSelectEvent = async (item: any) => {
    setSelectedEvent(item);
    if (['comision', 'propina', 'asistencia', 'anticipo'].includes(item.type)) {
      setLoadingDetail(true);
      try {
        const res = await apiClient(`/events/detail/${item.id}?type=${item.type}`);
        if (res.success) setEventDetail(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const getEventLabel = (item: any) => {
    if (!item) return "";
    const typeLabels: any = { comision: "Comisión", asistencia: "Asistencia", anticipo: "Anticipo", propina: "Propina", venta: "Venta", servicio: "Servicio", gratificacion: "Gratificación", hora_extra: "Hora Extra" };
    if (item.type === 'comision') return item.subType === 'venta' ? "Comisión de Venta" : "Comisión de Servicio";
    if (item.type === 'propina') return item.subType === 'venta' ? "Propina de Venta" : "Propina";
    return typeLabels[item.type] || item.type.toUpperCase();
  };

  const selectedEvents = useMemo(() => {
    if (selectedDates.length === 0) return [];
    return events
      .filter((e: any) => {
        const d = new Date(e.date);
        const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        return selectedDates.includes(dateStr);
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedDates, events]);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={[styles.headerSkeleton, { paddingTop: insets.top + 10 }]}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <SkeletonLoader width={60} height={60} borderRadius={30} />
          <View style={{ gap: 8 }}>
            <SkeletonLoader width={120} height={20} />
            <SkeletonLoader width={80} height={15} />
          </View>
        </View>
      </View>
      <View style={{ padding: 20, gap: 15 }}>
        <SkeletonLoader width="100%" height={150} borderRadius={24} />
        <View style={{ flexDirection: 'row', gap: 15 }}>
          <SkeletonLoader width="48%" height={100} borderRadius={20} />
          <SkeletonLoader width="48%" height={100} borderRadius={20} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <LinearGradient colors={gradientColors as any} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <PremiumHeaderActions
          hasNewAlert={hasNewAlert}
          setHasNewAlert={setHasNewAlert}
          showAlert={showAlert}
          profilePath={`/${role}/perfil`}
          onQRScannerPress={() => setShowAsistenciaModal(true)}
          onPersonalPress={role === 'cajero' ? () => router.push('/cajero/personal') : undefined}
          notificationCount={role === 'cajero' ? pendingCount : 0}
          onNotificationPress={role === 'cajero' ? () => router.push('/cajero/solicitudes') : undefined}
        />
        <PremiumUserProfile user={user} userStatus={userStatus} role={role} />

        {role === 'anfitriona' && !activeService && (
          <MotiView from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ marginTop: 15, alignItems: 'center' }}>
            <AnimatedButton
              style={[styles.callStaffBtn, { backgroundColor: accentColor }]}
              onPress={() => showAlert("Atención", "¿Solicitar asistencia general?", "warning", () => {
                apiClient("/notifications/assistance", { method: "POST", body: JSON.stringify({ type: "Llamado" }) });
                Toast.show({ type: "success", text1: "Enviado" });
              }, true)}
            >
              <RNText style={styles.callStaffBtnText}>SOLICITAR SERVICIO</RNText>
            </AnimatedButton>
          </MotiView>
        )}
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <AnimatedScreen>
          <View style={{ padding: role === 'cajero' ? 0 : 16 }}>
            {/* {role === 'cajero' && <PendingSolicitudesAlert isInline />} */}

            {role === 'anfitriona' && activeService && (
              <ActiveServiceCard
                habitacion={activeService.habitacion}
                onPress={() => router.push('/anfitriona/servicios')}
              />
            )}

            {role === 'anfitriona' && (
              <View style={styles.analyticsRow}>
                <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor }]}>
                  <RNText style={[styles.cardTitle, { color: textPrimary }]}>Meta Semanal</RNText>
                  <DonutChart size={60} percent={Math.min(100, Math.round((stats.totalEarnings / 50000) * 100))} color={accentColor} isDark={isDark} />
                  <RNText style={{ color: textSecondary, fontSize: 11 }}>{formatCurrency(stats.totalEarnings)} / {formatCurrency(50000)}</RNText>
                </View>
                <View style={[styles.glassCard, { backgroundColor: cardBg, borderColor }]}>
                  <RNText style={[styles.cardTitle, { color: textPrimary }]}>Crecimiento</RNText>
                  <RNText style={{ fontSize: 24, fontWeight: '900', color: accentColor }}>+12%</RNText>
                </View>
              </View>
            )}

            {role === 'garzon' && (
              <>
                <GarzonStats stats={stats} events={events} />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 15 }}>
                  <GarzonActionCard title="PEDIDOS" description="Gestión de comandas" icon="beer" color={accentColor} onPress={() => router.push('/garzon/pedidos')} />
                  <GarzonActionCard title="SERVICIOS" description="Atenciones activas" icon="bed" color="#10B981" onPress={() => router.push('/garzon/servicios')} />
                </View>
              </>
            )}

            {role === 'cajero' && (
              <>
                <CajeroStats stats={stats} fullWidth />
                <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
                  <CajeroActionGrid fullWidth />
                </View>
              </>
            )}

            <View style={{ marginTop: 20, paddingHorizontal: role === 'cajero' ? 16 : 0 }}>
              <PremiumLiquidationCard user={user} events={events} totalAmount={payoutTotal} />
            </View>

            {role !== 'cajero' && (
              <PremiumCalendar events={events} selectedDates={selectedDates} onDateToggle={(d) => {
                const next = selectedDates.includes(d) ? selectedDates.filter((x: any) => x !== d) : [...selectedDates, d];
                setSelectedDates(next);
              }} />
            )}
          </View>
        </AnimatedScreen>
      </ScrollView>

      {selectedDates.length > 0 && (
        <MotiView from={{ translateY: 100 }} animate={{ translateY: 0 }} style={[styles.selectionFloat, { backgroundColor: cardBg }]}>
          <RNText style={{ color: textPrimary, fontWeight: '700' }}>{selectedDates.length} seleccionados</RNText>
          <Pressable onPress={() => setIsModalVisible(true)} style={[styles.viewBtn, { backgroundColor: accentColor }]}>
            <RNText style={{ color: '#FFF', fontWeight: '800' }}>DETALLES</RNText>
          </Pressable>
        </MotiView>
      )}

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: bg }]}>
            <View style={styles.modalHeader}>
              <RNText style={[styles.modalTitle, { color: textPrimary }]}>Eventos</RNText>
              <Pressable onPress={() => setIsModalVisible(false)}><Ionicons name="close" size={28} color={textPrimary} /></Pressable>
            </View>
            <FlashList<any>
              data={selectedEvents}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleSelectEvent(item)} style={[styles.eventItem, { backgroundColor: cardBg, borderColor }]}>
                  <RNText style={{ color: textPrimary, fontWeight: '700' }}>{getEventLabel(item)}</RNText>
                  <RNText style={{ color: accentColor, fontWeight: '900' }}>{formatCurrency(item.amount)}</RNText>
                </Pressable>
              )}
              contentContainerStyle={{ padding: 16 }}
            />
          </View>
        </View>
      </Modal>

      <EventDetailModal
        visible={!!selectedEvent}
        event={selectedEvent}
        eventDetail={eventDetail}
        loadingDetail={loadingDetail}
        onClose={() => setSelectedEvent(null)}
        getEventLabel={getEventLabel}
        getStatusLabel={(item) => {
          const status = Number(item?.estado);
          if (item?.type === 'anticipo') {
            if (status === 0) return 'Pagado';
            if (status === 1) return 'Confirmado';
            if (status === 2) return 'Pendiente';
            if (status === 3) return 'Rechazado';
          }
          if (status === 0) return 'Pagado';
          if (status === 1) return 'Por cobrar';
          if (status === 2) return 'Confirmado';
          if (status === 3) return 'Rechazado';
          if (status === 4) return 'Completado';
          return String(item?.estado ?? '');
        }}
      />
      <RegistroAsistenciaModal visible={showAsistenciaModal} onClose={() => setShowAsistenciaModal(false)} onRegistered={() => setShowAsistenciaModal(false)} />
      <PremiumAlert {...alertConfig} onConfirm={() => { alertConfig.onConfirm?.(); setAlertConfig({ ...alertConfig, visible: false }); }} onCancel={() => setAlertConfig({ ...alertConfig, visible: false })} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerSkeleton: { height: 200, padding: 20, backgroundColor: '#222' },
  container: { flex: 1 },
  callStaffBtn: { paddingHorizontal: 20, height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 4 },
  callStaffBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  activeServiceCard: { margin: 16, padding: 16, borderRadius: 20, elevation: 4 },
  analyticsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  glassCard: { flex: 1, padding: 16, borderRadius: 24, borderWidth: 1, alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 12, fontWeight: '800', opacity: 0.7 },
  selectionFloat: { position: 'absolute', bottom: 34, left: 20, right: 20, padding: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10 },
  viewBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '80%', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  eventItem: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
});










