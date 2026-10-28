import { apiClientSafe } from '@/api/client';
import {
  useDebouncedEventListener,
  useDebouncedEventListeners,
} from '@/hooks/useDebouncedEventListener';
import { useAuthStore } from '@/store/authStore';
import type {
  ApiRes,
  DashboardEvent,
  DashboardStats,
  UserRole,
  ActiveService,
} from '@/types/api';
import { showToast } from '@/utils/toast-lazy';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import type { EnvaseResumen } from '@/hooks/useEnvasesScreen';
import {
  emitRefreshRequests,
  REALTIME_EVENT_NAMES,
  shouldInvalidateDashboardFromSse,
} from '@/utils/realtime';

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
  asignacion_activa?: boolean;
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
  containerSummary?: EnvaseResumen | null;
}

const initialStats: DashboardStats = {
  weeklyIncome: [],
  badges: [],
  totalEarnings: 0,
  svcCount: 0,
};

export function useDashboardData(role: UserRole) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  const {
    data,
    isLoading: loading,
    isFetching: refreshing,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', role, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const endpoints = [
        apiClientSafe<DashboardEvent[]>('/events/user'),
        apiClientSafe('/auth/me'),
        apiClientSafe('/users/status'),
        apiClientSafe<MeStatsData>('/users/me/stats'),
      ];

      if (role === 'anfitriona') {
        endpoints.push(apiClientSafe<DashboardStats>('/events/stats'));
        endpoints.push(apiClientSafe<ServicioRaw[]>('/services/user'));
      } else if (role === 'garzon') {
        endpoints.push(apiClientSafe<DashboardStats>('/events/stats'));
        endpoints.push(apiClientSafe<CashStatusData>('/cashregister/status'));
      } else if (role === 'cajero') {
        endpoints.push(apiClientSafe<Record<string, unknown>>('/cash-register/stats'));
        endpoints.push(apiClientSafe('/service-requests/pending-count'));
      } else if (role === 'barman') {
        endpoints.push(apiClientSafe<DashboardStats>('/events/stats'));
        endpoints.push(apiClientSafe<Record<string, unknown>>('/bar'));
        endpoints.push(apiClientSafe<unknown[]>('/transfers/pending'));
        endpoints.push(apiClientSafe<EnvaseResumen>('/bar/containers/summary'));
      }

      const results = await Promise.all(
        endpoints.map((p) =>
          p.catch((e) => {
            logger.error('Endpoint error:', e);
            return { success: false, data: null };
          }),
        ),
      );

      const eventsRes = results[0];
      const meRes = results[1];
      const statusRes = results[2];
      const meStatsRes = results[3];

      let roleStats = null;
      let extraData: Record<string, unknown> = {};

      if (eventsRes.success) {
        const meData = (meRes as ApiRes<{ user: Record<string, unknown> }>)
          .data;
        const statusData = (statusRes as ApiRes<UserStatusData>).data;

        if (role === 'anfitriona') {
          const eventsStatsRes = results[4] as ApiRes<DashboardStats>;
          roleStats = eventsStatsRes.data;
          const serviciosRes = results[5] as ApiRes<ServicioRaw[]>;
          extraData.activeService = serviciosRes.success
            ? (serviciosRes.data.find(
                (s) => Number(s.estado) === 2 && s.asignacion_activa !== false,
              ) ?? null)
            : null;
        } else if (role === 'garzon') {
          const eventsStatsRes = results[4] as ApiRes<DashboardStats>;
          roleStats = eventsStatsRes.data;
          const cashRes = results[5] as ApiRes<CashStatusData>;
          extraData.hasOpenCaja = cashRes.success
            ? cashRes.data.hasOpenCaja
            : true;
        } else if (role === 'cajero') {
          roleStats = results[4];
          const pendingData = (results[5] as ApiRes<PendingCountData>).data;
          extraData.pendingCount = pendingData?.count || 0;
        } else if (role === 'barman') {
          const eventsStatsRes = results[4] as ApiRes<DashboardStats>;
          roleStats = eventsStatsRes.data;
          extraData.barStock = (results[5] as ApiRes<unknown>)?.data ?? null;
          extraData.pendingTransfers =
            (results[6] as ApiRes<unknown>)?.data ?? null;
          extraData.containerSummary =
            (results[7] as ApiRes<EnvaseResumen>)?.data ?? null;
        }

        if (meData?.user) {
          useAuthStore
            .getState()
            .updateProfile(meData.user as any, { localOnly: true });
        }

        return {
          events: eventsRes.data || [],
          stats: roleStats || initialStats,
          userStatus: statusData?.status || 1,
          payoutTotal: Number(
            (meStatsRes as ApiRes<MeStatsData>).data?.stats
              ?.montoAnticipoMaximo || 0,
          ),
          ...extraData,
        } as DashboardData;
      }
      throw new Error('Failed to fetch dashboard central data');
    },
    staleTime: 1000 * 60 * 5,
  });

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', role] });
  }, [queryClient, role]);

  useDebouncedEventListener(
    REALTIME_EVENT_NAMES.refreshRequests,
    invalidateDashboard,
    500,
  );

  useDebouncedEventListeners(
    [
      REALTIME_EVENT_NAMES.refreshBar,
      REALTIME_EVENT_NAMES.refreshProducts,
      REALTIME_EVENT_NAMES.refreshCategories,
      REALTIME_EVENT_NAMES.refreshRooms,
      REALTIME_EVENT_NAMES.refreshPersonal,
      REALTIME_EVENT_NAMES.refreshClients,
    ],
    invalidateDashboard,
    500,
  );

  useDebouncedEventListener(
    REALTIME_EVENT_NAMES.sseEvent,
    (payload: any) => {
      logger.debug('[SSE Event received]:', {
        arg0: payload?.type,
        arg1: payload?.data,
      });
      if (shouldInvalidateDashboardFromSse(payload?.type)) {
        invalidateDashboard();
        if (
          payload.type === 'new_order' ||
          payload.type === 'new_service_request'
        ) {
          logger.debug('[SSE] Emitiendo refresh_requests para:', {
            arg0: payload.type,
            arg1: payload.data?.id,
          });
          emitRefreshRequests(payload);
        }
      }
    },
    500,
  );

  const onRefresh = useCallback(async () => {
    try {
      await refetch({ throwOnError: true });
      showToast({
        type: 'success',
        text1: 'Éxito',
        text2: 'Datos actualizados',
      });
    } catch {
      showToast({ type: 'error', text1: 'Error', text2: 'Fallo al refrescar' });
    }
  }, [refetch]);

  return {
    loading,
    refreshing,
    error: data ? null : error,
    events: data?.events || [],
    stats: data?.stats || initialStats,
    userStatus: data?.userStatus || 1,
    activeService: data?.activeService || null,
    pendingCount: data?.pendingCount || 0,
    payoutTotal: data?.payoutTotal || 0,
    containerSummary: data?.containerSummary ?? null,
    hasNewAlert,
    selectedDates,
    onRefresh,
    setSelectedDates,
    setHasNewAlert,
    fetchData: refetch,
  };
}
