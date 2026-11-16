import { apiClientSafe } from "@/api/client";
import { EventDetailModal } from "@/components/shared/EventDetailModal";
import { PremiumLiquidationCard } from "@/components/shared/PremiumLiquidationCard";
import { SelectedEventsBar } from "@/components/screens/home/SelectedEventsBar";
import { SelectedEventsModal } from "@/components/screens/home/SelectedEventsModal";
import {
  filterEventsByDates,
  getEventLabel,
  getStatusLabel,
} from "@/components/screens/home/eventLabels";
import { PremiumCalendar } from "@/components/ui/PremiumCalendar";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { contentColumn } from "@/constants/layout";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuthStore } from "@/store/authStore";
import logger from "@/utils/logger";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

interface ResumenScreenProps {
  role: "anfitriona" | "garzon" | "barman";
}

export function ResumenScreen({ role }: ResumenScreenProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const esAdmin = useIsAdmin();
  const { accentColor, bg, cardBg, borderColor, textPrimary } = useAccentColor();

  const {
    events,
    payoutTotal,
    selectedDates,
    refreshing,
    onRefresh,
    setSelectedDates,
  } = useDashboardData(role) as any;

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetail, setEventDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showLiquidation = role !== "barman";
  const showCalendar = !esAdmin;

  const selectedEvents = useMemo(
    () => filterEventsByDates(events, selectedDates),
    [selectedDates, events],
  );

  const handleSelectEvent = async (item: any) => {
    setSelectedEvent(item);
    if (
      [
        "comision",
        "propina",
        "asistencia",
        "anticipo",
        "servicio",
        "venta",
      ].includes(item.type)
    ) {
      setLoadingDetail(true);
      try {
        const res = await apiClientSafe(
          `/events/detail/${item.id}?type=${item.type}`,
        );
        if (res.success) setEventDetail(res.data);
      } catch (e) {
        logger.captureException(e, { context: "ResumenScreen:handleSelectEvent" });
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const toggleDate = useCallback(
    (date: string) => {
      const next = selectedDates.includes(date)
        ? selectedDates.filter((x: string) => x !== date)
        : [...selectedDates, date];
      setSelectedDates(next);
    },
    [selectedDates, setSelectedDates],
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PremiumHeader
        title="Resumen"
        subtitle={
          showLiquidation
            ? showCalendar
              ? "Total a cobrar y calendario"
              : "Total a cobrar y reportes"
            : "Calendario de actividad"
        }
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(`/${role}`);
          }
        }}
      />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        contentContainerStyle={[contentColumn, { paddingBottom: 100 }]}
      >
        <View style={{ paddingHorizontal: 16 }}>
          {showLiquidation && (
            <View style={{ marginTop: 20 }}>
              <PremiumLiquidationCard
                user={user}
                events={events}
                totalAmount={payoutTotal}
              />
            </View>
          )}

          {showCalendar && (
            <PremiumCalendar
              events={events}
              selectedDates={selectedDates}
              onDateToggle={toggleDate}
            />
          )}
        </View>
      </ScrollView>

      {selectedDates.length > 0 && (
        <SelectedEventsBar
          count={selectedDates.length}
          cardBg={cardBg}
          accentColor={accentColor}
          textPrimary={textPrimary}
          onOpenDetails={() => setIsModalVisible(true)}
        />
      )}

      <SelectedEventsModal
        visible={isModalVisible}
        events={selectedEvents}
        bg={bg}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        accentColor={accentColor}
        onClose={() => setIsModalVisible(false)}
        onSelect={handleSelectEvent}
      />

      <EventDetailModal
        visible={!!selectedEvent}
        event={selectedEvent}
        eventDetail={eventDetail}
        loadingDetail={loadingDetail}
        onClose={() => setSelectedEvent(null)}
        getEventLabel={getEventLabel}
        getStatusLabel={getStatusLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    marginLeft: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  backText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});
