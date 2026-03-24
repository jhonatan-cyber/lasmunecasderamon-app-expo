import { DeviceEventEmitter } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import Toast from "react-native-toast-message";
import { DashboardEvent, DashboardStats, UserRole } from "@/types/api";

export interface DashboardData {
  events: DashboardEvent[];
  stats: DashboardStats;
  userStatus: number;
  activeService: any | null;
  pendingCount: number;
}

const initialStats: DashboardStats = { weeklyIncome: [], badges: [], totalEarnings: 0, svcCount: 0 };

export function useDashboardData(role: UserRole) {
  const queryClient = useQueryClient();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  // El motor principal: useQuery maneja loading, error y cache
  const { 
    data, 
    isLoading: loading, 
    isFetching: refreshing, 
    refetch,
    error 
  } = useQuery({
    queryKey: ['dashboard', role],
    queryFn: async () => {
      const endpoints = [
        apiClient("/events/user"),
        apiClient("/auth/me"),
        apiClient("/users/status"),
      ];

      // Endpoints específicos por rol
      if (role === 'anfitriona') {
        endpoints.push(apiClient("/events/stats"));
        endpoints.push(apiClient("/servicios/user"));
      } else if (role === 'garzon') {
        endpoints.push(apiClient("/events/stats"));
        endpoints.push(apiClient("/cashregister/status"));
      } else if (role === 'cajero') {
        endpoints.push(apiClient("/caja/stats"));
        endpoints.push(apiClient("/solicitudes-servicios/pending-count"));
      }

      const results = await Promise.all(endpoints.map(p => p.catch(e => {
        console.error("Endpoint error:", e);
        return { success: false, data: null };
      })));

      const eventsRes = results[0];
      const meRes = results[1];
      const statusRes = results[2];
      
      let roleStats = null;
      let extraData: any = {};

      if (results[0]?.success) {
        if (role === 'anfitriona') {
            roleStats = results[3]?.data;
            const services = results[4];
            extraData.activeService = services?.success ? services.data.find((s: any) => s.estado === 2) : null;
        } else if (role === 'garzon') {
            roleStats = results[3]?.data;
            extraData.hasOpenCaja = results[4]?.data?.hasOpenCaja ?? true;
        } else if (role === 'cajero') {
            roleStats = results[3]?.success ? results[3] : null; 
            extraData.pendingCount = results[4]?.count || 0;
        }

        // side effect: update auth store
        if (meRes?.success && meRes?.user) {
            useAuthStore.getState().updateProfile(meRes.user);
        }

        return {
            events: eventsRes?.data || [],
            stats: roleStats || initialStats,
            userStatus: statusRes?.status || meRes?.user?.status || 1,
            ...extraData
        } as DashboardData;
      }
      throw new Error("Failed to fetch dashboard central data");
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache fresco
  });

  // Radar de eventos en tiempo real: Invalida la query para que React Query la refresque sola
  useEffect(() => {
    const refreshSub = DeviceEventEmitter.addListener("refresh_requests", () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard', role] });
    });
    
    const sseSub = DeviceEventEmitter.addListener("sse_event", (payload: any) => {
        const businessEvents = ["new_order", "new_service_request", "order_updated", "service_request_approved", "room_occupied"];
        if (payload && businessEvents.includes(payload.type)) {
            queryClient.invalidateQueries({ queryKey: ['dashboard', role] });
        }
    });
    
    return () => {
      refreshSub.remove();
      sseSub.remove();
    };
  }, [role, queryClient]);

  const onRefresh = useCallback(async () => {
    try {
        await refetch();
        Toast.show({ type: "success", text1: "Éxito", text2: "Datos actualizados" });
    } catch (e) {
        Toast.show({ type: "error", text1: "Error", text2: "Fallo al refrescar" });
    }
  }, [refetch]);

  return {
    loading,
    refreshing,
    events: data?.events || [],
    stats: data?.stats || initialStats,
    userStatus: data?.userStatus || 1,
    activeService: data?.activeService || null,
    pendingCount: data?.pendingCount || 0,
    hasNewAlert,
    selectedDates,
    onRefresh,
    setSelectedDates,
    setHasNewAlert,
    fetchData: refetch // para compatibilidad con el HomeScreen si lo llama manualmente
  };
}
