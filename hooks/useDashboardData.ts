import { DeviceEventEmitter } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import Toast from "react-native-toast-message";
import { DashboardEvent, DashboardStats, UserRole } from "@/types/api";
import {
  emitRefreshRequests,
  REALTIME_EVENT_NAMES,
  shouldInvalidateDashboardFromSse,
} from "@/utils/realtime";

import logger from '@/utils/logger';
export interface DashboardData {
  events: DashboardEvent[];
  stats: DashboardStats;
  userStatus: number;
  activeService: any | null;
  pendingCount: number;
  payoutTotal: number;
}

const initialStats: DashboardStats = { weeklyIncome: [], badges: [], totalEarnings: 0, svcCount: 0 };

export function useDashboardData(role: UserRole) {
  const queryClient = useQueryClient();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  
  const { 
    data, 
    isLoading: loading, 
    isFetching: refreshing, 
    refetch,
  } = useQuery({
    queryKey: ['dashboard', role],
    queryFn: async () => {
      const endpoints = [
        apiClient("/events/user"),
        apiClient("/auth/me"),
        apiClient("/users/status"),
        apiClient("/users/me/stats"),
      ];

      
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
        logger.error("Endpoint error:", e);
        return { success: false, data: null };
      })));

      const eventsRes = results[0];
      const meRes = results[1];
      const statusRes = results[2];
      const meStatsRes = results[3];
      
      let roleStats = null;
      let extraData: any = {};

      if (results[0]?.success) {
        if (role === 'anfitriona') {
            roleStats = results[4]?.data;
            const services = results[5];
            extraData.activeService = services?.success ? services.data.find((s: any) => s.estado === 2) : null;
        } else if (role === 'garzon') {
            roleStats = results[4]?.data;
            extraData.hasOpenCaja = results[5]?.data?.hasOpenCaja ?? true;
        } else if (role === 'cajero') {
            roleStats = results[4]?.success ? results[4] : null; 
            extraData.pendingCount = results[5]?.count || 0;
        }

        
        if (meRes?.success && meRes?.user) {
            useAuthStore.getState().updateProfile(meRes.user);
        }

        return {
            events: eventsRes?.data || [],
            stats: roleStats || initialStats,
            userStatus: statusRes?.status || meRes?.user?.status || 1,
            payoutTotal: Number(meStatsRes?.data?.stats?.montoAnticipoMaximo || 0),
            ...extraData
        } as DashboardData;
      }
      throw new Error("Failed to fetch dashboard central data");
    },
    staleTime: 1000 * 60 * 5, 
  });

  
  useEffect(() => {
    const refreshSub = DeviceEventEmitter.addListener(REALTIME_EVENT_NAMES.refreshRequests, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard', role] });
    });
    
    const sseSub = DeviceEventEmitter.addListener(REALTIME_EVENT_NAMES.sseEvent, (payload: any) => {
        logger.info('[SSE Event received]:', { arg0: payload?.type, arg1: payload?.data });
        if (shouldInvalidateDashboardFromSse(payload?.type)) {
            queryClient.invalidateQueries({ queryKey: ['dashboard', role] });
            
            
            if (payload.type === 'new_order' || payload.type === 'new_service_request') {
                logger.info('[SSE] Emitiendo refresh_requests para:', { arg0: payload.type, arg1: payload.data?.id });
                emitRefreshRequests(payload);
            }
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
    } catch {
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
    payoutTotal: data?.payoutTotal || 0,
    hasNewAlert,
    selectedDates,
    onRefresh,
    setSelectedDates,
    setHasNewAlert,
    fetchData: refetch 
  };
}
