import { eventBus } from "@/utils/eventBus";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClientSafe } from "@/api/client";
import type { ApiRes } from "@/types/api";
import { useAuthStore } from "@/store/authStore";
import { showToast } from '@/utils/toast-lazy';
import { DashboardEvent, DashboardStats, UserRole, type ActiveService, type UserProfileResponse } from "@/types/api";
import {
  emitRefreshRequests,
  REALTIME_EVENT_NAMES,
  shouldInvalidateDashboardFromSse,
} from "@/utils/realtime";

import logger from '@/utils/logger';

interface UserStatusData {
  status: number;
  estado_servicio: number;
  user: { id: string; nick: string; name: string; role: string; foto: string };
}

interface PendingCountData {
  count: number;
  serviciosCount: number;
  pedidosCount: number;
}

interface ServicioRaw {
  estado: number;
  [key: string]: unknown;
}

interface CashStatusData {
  hasOpenCaja: boolean;
}

interface MeStatsData {
  stats: { montoAnticipoMaximo: number };
}

export interface DashboardData {
  events: DashboardEvent[];
  stats: DashboardStats;
  userStatus: number;
  activeService: ActiveService | null;
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
        apiClientSafe<DashboardEvent[]>("/events/user"),
        apiClientSafe("/auth/me"),
        apiClientSafe("/users/status"),
        apiClientSafe<MeStatsData>("/users/me/stats"),
      ];

      
      if (role === 'anfitriona') {
        endpoints.push(apiClientSafe<DashboardStats>("/events/stats"));
        endpoints.push(apiClientSafe<ServicioRaw[]>("/servicios/user"));
      } else if (role === 'garzon') {
        endpoints.push(apiClientSafe<DashboardStats>("/events/stats"));
        endpoints.push(apiClientSafe<CashStatusData>("/cashregister/status"));
      } else if (role === 'cajero') {
        endpoints.push(apiClientSafe<Record<string, unknown>>("/caja/stats"));
        endpoints.push(apiClientSafe("/solicitudes-servicios/pending-count"));
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
      let extraData: Record<string, unknown> = {};

      if (eventsRes.success) {
        const meData = (meRes as ApiRes<{ user: Record<string, unknown> }>).data;
        const statusData = (statusRes as ApiRes<UserStatusData>).data;

        if (role === 'anfitriona') {
            const eventsStatsRes = results[4] as ApiRes<DashboardStats>;
            roleStats = eventsStatsRes.data;
            const serviciosRes = results[5] as ApiRes<ServicioRaw[]>;
            extraData.activeService = serviciosRes.success ? serviciosRes.data.find(s => s.estado === 2) ?? null : null;
        } else if (role === 'garzon') {
            const eventsStatsRes = results[4] as ApiRes<DashboardStats>;
            roleStats = eventsStatsRes.data;
            const cashRes = results[5] as ApiRes<CashStatusData>;
            extraData.hasOpenCaja = cashRes.success ? cashRes.data.hasOpenCaja : true;
        } else if (role === 'cajero') {
            roleStats = results[4];
            const pendingData = (results[5] as ApiRes<PendingCountData>).data;
            extraData.pendingCount = pendingData?.count || 0;
        }

        if (meData?.user) {
            useAuthStore.getState().updateProfile(meData.user as any);
        }

        return {
            events: eventsRes.data || [],
            stats: roleStats || initialStats,
            userStatus: statusData?.status || 1,
            payoutTotal: Number((meStatsRes as ApiRes<MeStatsData>).data?.stats?.montoAnticipoMaximo || 0),
            ...extraData
        } as DashboardData;
      }
      throw new Error("Failed to fetch dashboard central data");
    },
    staleTime: 1000 * 60 * 5, 
  });

  
  useEffect(() => {
    const refreshSub = eventBus.addListener(REALTIME_EVENT_NAMES.refreshRequests, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard', role] });
    });
    
    const sseSub = eventBus.addListener(REALTIME_EVENT_NAMES.sseEvent, (payload: any) => {
        logger.debug('[SSE Event received]:', { arg0: payload?.type, arg1: payload?.data });
        if (shouldInvalidateDashboardFromSse(payload?.type)) {
            queryClient.invalidateQueries({ queryKey: ['dashboard', role] });
            
            
            if (payload.type === 'new_order' || payload.type === 'new_service_request') {
                logger.debug('[SSE] Emitiendo refresh_requests para:', { arg0: payload.type, arg1: payload.data?.id });
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
        showToast({ type: "success", text1: "Éxito", text2: "Datos actualizados" });
    } catch {
        showToast({ type: "error", text1: "Error", text2: "Fallo al refrescar" });
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
