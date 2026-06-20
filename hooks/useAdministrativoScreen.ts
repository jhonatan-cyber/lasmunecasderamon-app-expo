import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toast from "react-native-toast-message";
import { getEventLabel, getEventStatusLabel as getStatusLabel } from "@/utils/eventHelpers";
import { eventsService } from '@/services';
import logger from "@/utils/logger";

export interface Event {
  type:
    | "venta"
    | "propina"
    | "asistencia"
    | "anticipo"
    | "comision"
    | "servicio";
  id: number;
  codigo: string;
  date: string;
  amount: number;
  estado: number;
  subType?: string;
}

export function useAdministrativoScreen() {
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

        const eventsRes = await eventsService.getUserEvents(
          `startDate=${startDate}&endDate=${endDate}`,
        );

        const serialized = JSON.stringify(eventsRes.data || []);
        const hasChanges = dataRef.current !== serialized;
        dataRef.current = serialized;

        if (eventsRes.success) {
          setRecentActivity(eventsRes.data || []);
        }

        if (isManual) {
          Toast.show({
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
          Toast.show({
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

  const handleSelectEvent = useCallback(async (item: any) => {
    setEventDetail(null);
    setLoadingDetail(false);
    setSelectedEvent(item);
    if (["comision", "propina", "asistencia", "anticipo"].includes(item.type)) {
      setLoadingDetail(true);
      try {
        const res = await eventsService.detail(item.id, item.type);
        if (res.success && res.data) setEventDetail(res.data);
      } catch (e) {
        logger.captureException(e, {
          context: "Administrativo:handleSelectEvent",
        });
      } finally {
        setLoadingDetail(false);
      }
    }
  }, []);

  return {
    loading,
    refreshing,
    recentActivity,
    selectedDates,
    setSelectedDates,
    isModalVisible,
    setIsModalVisible,
    selectedEvent,
    setSelectedEvent,
    eventDetail,
    setEventDetail,
    loadingDetail,
    currentDate,
    setCurrentDate,
    onRefresh,
    selectedEvents,
    getEventLabel,
    handleSelectEvent,
    getStatusLabel,
  };
}
