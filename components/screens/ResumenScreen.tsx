import { apiClientSafe } from "@/api/client";
import { BreakdownCard } from "@/components/shared/BreakdownCard";
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
import { contentColumn, tabBarBottomPadding } from "@/constants/layout";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFinancialEvents } from "@/hooks/useFinancialEvents";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuthStore } from "@/store/authStore";
import logger from "@/utils/logger";
import { sumSalesCommissions } from "@/utils/salesCommissions";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

interface ResumenScreenProps {
  role: "anfitriona" | "garzon" | "barman" | "cajero";
}

export function ResumenScreen({ role }: ResumenScreenProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const esAdmin = useIsAdmin();
  const { accentColor, bg, cardBg, borderColor, textPrimary, textSecondary } =
    useAccentColor();

  const {
    events,
    payoutTotal,
    payoutBreakdown,
    selectedDates,
    refreshing,
    onRefresh,
    setSelectedDates,
  } = useDashboardData(role) as any;

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetail, setEventDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showCalendar = !esAdmin;
  const {
    data: salesCommissions,
    loading: salesCommissionsLoading,
    error: salesCommissionsError,
  } = useFinancialEvents("comisiones", role === "anfitriona");
  const salesCommissionTotal = salesCommissionsLoading || salesCommissionsError
    ? null
    : sumSalesCommissions(salesCommissions);

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
          showCalendar
            ? "Total a cobrar y calendario"
            : "Total a cobrar y reportes"
        }
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(`/${role}`);
          }
        }}
        showThemeToggle
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
        contentContainerStyle={[contentColumn, { paddingBottom: tabBarBottomPadding }]}
      >
        <View style={{ paddingHorizontal: 16 }}>
          {/* Total a cobrar y botón PDF - siempre visible */}
          <View style={{ marginTop: 20 }}>
            <PremiumLiquidationCard
              user={user}
              events={events}
              totalAmount={payoutTotal}
            />
          </View>
        </View>

        {/* Desglose de ingresos - siempre visible */}
        <BreakdownCard
          breakdown={payoutBreakdown}
          role={role}
          salesCommissionTotal={role === "anfitriona" ? salesCommissionTotal : undefined}
        />

        {/* Calendario con márgenes propios para que use todo el ancho útil */}
        {showCalendar && (
          <PremiumCalendar
            events={events}
            selectedDates={selectedDates}
            onDateToggle={toggleDate}
          />
        )}
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
        textSecondary={textSecondary}
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
