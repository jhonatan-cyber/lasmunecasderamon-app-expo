import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { showToast } from '@/utils/toast-lazy';
import { apiClientSafe } from "@/api/client-safe";
import logger from "@/utils/logger";
import { EventDetailModal } from "@/components/shared/EventDetailModal";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { PremiumCalendar } from "@/components/ui/PremiumCalendar";
import { PremiumLiquidationCard } from "@/components/shared/PremiumLiquidationCard";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useAuthStore } from "@/store/authStore";
import { Event } from "@/hooks/useAdministrativoScreen";

import {
  AdministrativoSkeleton,
  SelectionFloat,
  DetailedEventsModal
} from "@/components/cajero/administrativo";

export default function AdministrativoScreen() {
  const { accentColor, isDark, bg, cardBg, textPrimary, textSecondary, borderColor } = useAccentColor();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<Event[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const dataRef = useRef<string>("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventDetail, setEventDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());



  const fetchData = useCallback(
    async (isManual = false) => {
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

        const eventsRes = await apiClientSafe<Event[]>(
          `/events/user?startDate=${startDate}&endDate=${endDate}`,
        );

        const serialized = JSON.stringify(eventsRes.data || []);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;

        if (eventsRes.success) {
          setRecentActivity(eventsRes.data || []);
        }

        if (isManual) {
          showToast({
            type: hasChanges ? "success" : "info",
            text1: hasChanges ? "Éxito" : "Información",
            text2: hasChanges
              ? "Datos actualizados"
              : "Sin cambios en los datos",
            visibilityTime: 3000,
          });
        }
      } catch (error) {
        logger.captureException(error, { context: "Administrativo:fetchData" });
        if (isManual) {
          showToast({
            type: "error",
            text1: "Error",
            text2: "No se pudo actualizar el resumen",
            visibilityTime: 3000,
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentDate],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

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
    comision: "Comisión",
    asistencia: "Asistencia",
    anticipo: "Anticipo",
    propina: "Propina",
    venta: "Venta",
    servicio: "Servicio",
    gratificacion: "Gratificación",
    hora_extra: "Hora Extra",
  };

  const getEventLabel = (item: any) => {
    if (!item) return "";
    if (item.type === "comision") {
      if (item.subType === "venta") return "Comisión de Venta";
      if (item.subType === "servicio") return "Comisión de Servicio";
      return "Comisión";
    }
    if (item.type === "propina") {
      if (item.subType === "venta") return "Propina de Venta";
      return "Propina";
    }
    return typeLabels[item.type] || item.type.toUpperCase();
  };

  const handleSelectEvent = async (item: any) => {
    setEventDetail(null);
    setLoadingDetail(false);
    setSelectedEvent(item);
    if (["comision", "propina", "asistencia", "anticipo"].includes(item.type)) {
      setLoadingDetail(true);
      try {
        const res = await apiClientSafe(
          `/events/detail/${item.id}?type=${item.type}`,
        );
        if (res.success && res.data) setEventDetail(res.data);
      } catch (e) {
        logger.captureException(e, {
          context: "Administrativo:handleSelectEvent",
        });
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const getStatusLabel = (item: any) => {
    if (typeof item?.estado === "string") return item.estado;

    const status = Number(item?.estado);

    if (item?.type === "anticipo") {
      if (status === 0) return "Pagado";
      if (status === 1) return "Confirmado";
      if (status === 2) return "Pendiente";
      if (status === 3) return "Rechazado";
    }

    if (status === 0) return "Pagado";
    if (status === 1) return "Por cobrar";
    if (status === 2) return "Confirmado";
    if (status === 3) return "Rechazado";
    if (status === 4) return "Completado";
    return String(item?.estado ?? "");
  };

  if (loading) {
    return (
      <AdministrativoSkeleton
        bg={bg}
        isDark={isDark}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? "light" : "dark"} />

      <PremiumHeader
        title="Resumen Personal"
        subtitle="Actividad y eventos"
        rightComponent={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtnRight}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backTextHeader}>Atrás</Text>
            </Pressable>
          </View>
        }
      />

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
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <PremiumLiquidationCard user={user} events={recentActivity} />
        </View>

        <SelectionFloat
          selectedDatesCount={selectedDates.length}
          cardBg={cardBg}
          borderColor={borderColor}
          textPrimary={textPrimary}
          accentColor={accentColor}
          onClear={() => setSelectedDates([])}
          onViewDetails={() => setIsModalVisible(true)}
        />

        <View style={{ marginTop: 10 }}>
          <PremiumCalendar
            events={recentActivity}
            selectedDates={selectedDates}
            onDateToggle={(dateStr) => {
              setSelectedDates((prev) =>
                prev.includes(dateStr)
                  ? prev.filter((d) => d !== dateStr)
                  : [...prev, dateStr],
              );
            }}
            currentMonth={currentDate}
            onMonthChange={(date) => {
              setCurrentDate(date);
              setSelectedDates([]);
            }}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <DetailedEventsModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        selectedDatesCount={selectedDates.length}
        selectedEvents={selectedEvents}
        bg={bg}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
        accentColor={accentColor}
        onSelectEvent={handleSelectEvent}
        getEventLabel={getEventLabel}
        getStatusLabel={getStatusLabel}
      />

      <EventDetailModal
        visible={!!selectedEvent}
        event={selectedEvent}
        eventDetail={eventDetail}
        loadingDetail={loadingDetail}
        onClose={() => {
          setSelectedEvent(null);
          setEventDetail(null);
        }}
        getEventLabel={getEventLabel}
        getStatusLabel={getStatusLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backBtnRight: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    gap: 6,
  },
  backTextHeader: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  container: { flex: 1 },
});
