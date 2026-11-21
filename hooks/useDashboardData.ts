import { apiClientSafe } from '@/api/client';
import {
  useDebouncedEventListener,
  useDebouncedEventListeners,
} from '@/hooks/useDebouncedEventListener';
import { useAuthStore } from '@/store/authStore';
import { useIsAdmin } from '@/hooks/useIsAdmin';
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
  stats: {
    montoAnticipoMaximo: number;
    montoAsistencia?: number;
    montoComisiones?: number;
    montoPropinas?: number;
    montoHorasExtras?: number;
    montoGratificaciones?: number;
    montoAnticipos?: number;
    totalAsistencias?: number;
    totalPropinas?: number;
    serviciosCompletados?: number;
    serviciosEnCurso?: number;
  };
}

interface AdvancesMaxData {
  monto_asistencia?: number;
  monto_comisiones?: number;
  monto_propinas?: number;
  monto_maximo?: number;
  tiene_solicitud_pendiente?: boolean;
  efectivo_en_caja?: number;
}

export interface DashboardData {
  events: DashboardEvent[];
  stats: DashboardStats;
  userStatus: number;
  activeService: ActiveService | null;
  pendingCount: number;
  /** Pedidos en cola o en curso en el salón (estado 1 y 2). */
  pendingOrders?: number;
  /** Solicitudes de servicio esperando atención. */
  pendingRequests?: number;
  /** Transferencias de stock sin confirmar (barman). */
  pendingTransfers?: number;
  /** Anticipos aprobados por el admin que aún no se entregaron. */
  pendingAdvances?: number;
  payoutTotal: number;
  payoutBreakdown?: {
    montoAsistencia: number;
    montoComisiones: number;
    montoPropinas: number;
    montoHorasExtras: number;
    montoGratificaciones: number;
    montoAnticipos: number;
    totalAsistencias: number;
    serviciosCompletados: number;
  };
  containerSummary?: EnvaseResumen | null;
}

const initialStats: DashboardStats = {
  weeklyIncome: [],
  badges: [],
  totalEarnings: 0,
  svcCount: 0,
};

/**
 * Hook centralizado para cargar los datos del dashboard según el rol del usuario.
 *
 * @returns {object} Objeto con los datos del dashboard:
 *   - loading: boolean — si está cargando por primera vez
 *   - refreshing: boolean — si está refrescando datos
 *   - error: Error | null — error de la última consulta
 *   - stats: DashboardStats — estadísticas del usuario
 *   - userStatus: number — estado actual del usuario
 *   - hasNewAlert: boolean — si hay alerta nueva sin leer
 *   - activeService: ActiveService | null — servicio activo (anfitriona/garzón)
 *   - pendingCount: number — cantidad de solicitudes pendientes (cajero)
 *   - containerSummary: EnvaseResumen | null — resumen de envases (barman)
 *   - selectedDates: string[] — fechas seleccionadas en el filtro
 *   - setSelectedDates: (dates: string[]) => void — setter de fechas
 *   - setHasNewAlert: (v: boolean) => void — setter de alerta nueva
 *   - onRefresh: () => Promise<void> — función para refrescar datos
 */
export function useDashboardData(role: UserRole) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const esAdmin = useIsAdmin();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  const {
    data,
    isLoading: loading,
    isFetching: refreshing,
    error,
    refetch,
  } = useQuery({
    // El alcance del administrador cambia qué datos se piden (anticipos), así
    // que forma parte de la clave: si cambian los permisos, se vuelve a pedir.
    queryKey: ['dashboard', role, userId, esAdmin ? 'admin' : 'user'],
    enabled: Boolean(userId),
    queryFn: async () => {
      const endpoints = [
        apiClientSafe<DashboardEvent[]>('/events/user'),
        apiClientSafe('/auth/me'),
        apiClientSafe('/users/status'),
        apiClientSafe<MeStatsData>('/users/me/stats'),
        apiClientSafe<AdvancesMaxData>('/advances/max'),
      ];

      // Índices de las respuestas comunes
      const EVENTS_INDEX = 0;
      const ME_INDEX = 1;
      const STATUS_INDEX = 2;
      const ME_STATS_INDEX = 3;
      const ADVANCES_MAX_INDEX = 4;
      // Los endpoints específicos por rol comienzan en INDEX 5
      const ROLE_SPECIFIC_START = 5;

      if (role === 'anfitriona') {
        endpoints.push(apiClientSafe<DashboardStats>('/events/stats'));
        endpoints.push(apiClientSafe<ServicioRaw[]>('/services/user'));
      } else if (role === 'garzon') {
        endpoints.push(apiClientSafe<DashboardStats>('/events/stats'));
        endpoints.push(apiClientSafe<CashStatusData>('/cashregister/status'));
        endpoints.push(apiClientSafe<PendingCountData>('/service-requests/pending-count'));
      } else if (role === 'cajero') {
        endpoints.push(apiClientSafe<Record<string, unknown>>('/cash-register/stats'));
        endpoints.push(apiClientSafe<PendingCountData>('/service-requests/pending-count'));
        // Solo el administrador aprueba anticipos: el contador de la tarjeta
        // "Anticipos" no tiene sentido para un cajero sin esa tarea.
        if (esAdmin) endpoints.push(apiClientSafe<unknown>('/advances'));
      } else if (role === 'barman') {
        endpoints.push(apiClientSafe<DashboardStats>('/events/stats'));
        endpoints.push(apiClientSafe<Record<string, unknown>>('/bar'));
        endpoints.push(apiClientSafe<unknown[]>('/transfers/pending'));
        endpoints.push(apiClientSafe<EnvaseResumen>('/bar/containers/summary'));
      }

      const results = await Promise.all(
        endpoints.map((p) =>
          p.catch((e) => {
            logger.fetchError(e, { context: 'useDashboardData' });
            return { success: false, data: null };
          }),
        ),
      );

      const eventsRes = results[EVENTS_INDEX];
      const meRes = results[ME_INDEX];
      const statusRes = results[STATUS_INDEX];
      const meStatsRes = results[ME_STATS_INDEX];
      const advancesMaxRes = results[ADVANCES_MAX_INDEX];

      let roleStats = null;
      let extraData: Record<string, unknown> = {};
      let roleSpecificIndex = ROLE_SPECIFIC_START;

      if (eventsRes.success) {
        const meData = (meRes as ApiRes<{ user: Record<string, unknown> }>)
          .data;
        const statusData = (statusRes as ApiRes<UserStatusData>).data;

        if (role === 'anfitriona') {
          const eventsStatsRes = results[roleSpecificIndex] as ApiRes<DashboardStats>;
          roleStats = eventsStatsRes.data;
          const serviciosRes = results[roleSpecificIndex + 1] as ApiRes<ServicioRaw[]>;
          extraData.activeService = serviciosRes.success
            ? (serviciosRes.data.find(
                (s) => Number(s.estado) === 2 && s.asignacion_activa !== false,
              ) ?? null)
            : null;
        } else if (role === 'garzon') {
          const eventsStatsRes = results[roleSpecificIndex] as ApiRes<DashboardStats>;
          roleStats = eventsStatsRes.data;
          const cashRes = results[roleSpecificIndex + 1] as ApiRes<CashStatusData>;
          extraData.hasOpenCaja = cashRes.success
            ? cashRes.data.hasOpenCaja
            : true;
          const pendingData = (results[roleSpecificIndex + 2] as ApiRes<PendingCountData>).data;
          extraData.pendingOrders = pendingData?.pedidosCount || 0;
          extraData.pendingRequests = pendingData?.serviciosCount || 0;
        } else if (role === 'cajero') {
          roleStats = results[roleSpecificIndex];
          const pendingData = (results[roleSpecificIndex + 1] as ApiRes<PendingCountData>).data;
          extraData.pendingCount = pendingData?.count || 0;
          extraData.pendingOrders = pendingData?.pedidosCount || 0;
          extraData.pendingRequests = pendingData?.serviciosCount || 0;
          if (esAdmin) {
            const advancesPayload = (results[roleSpecificIndex + 2] as ApiRes<unknown>)?.data;
            const advances = Array.isArray(advancesPayload)
              ? advancesPayload
              : Array.isArray((advancesPayload as { data?: unknown[] })?.data)
                ? ((advancesPayload as { data: unknown[] }).data as any[])
                : [];
            // Estado 2 = solicitud pendiente de aprobar o rechazar.
            extraData.pendingAdvances = advances.filter(
              (item) => Number(item?.estado) === 2,
            ).length;
          }
        } else if (role === 'barman') {
          const eventsStatsRes = results[roleSpecificIndex] as ApiRes<DashboardStats>;
          roleStats = eventsStatsRes.data;
          extraData.barStock = (results[roleSpecificIndex + 1] as ApiRes<unknown>)?.data ?? null;
          const transfers = (results[roleSpecificIndex + 2] as ApiRes<unknown>)?.data;
          extraData.pendingTransfers = Array.isArray(transfers) ? transfers.length : 0;
          extraData.containerSummary =
            (results[roleSpecificIndex + 3] as ApiRes<EnvaseResumen>)?.data ?? null;
        }

        if (meData?.user) {
          useAuthStore
            .getState()
            .updateProfile(meData.user as any, { localOnly: true });
        }

        // Obtener los montos reales de /advances/max si está disponible
        const advancesData = (advancesMaxRes as ApiRes<AdvancesMaxData>).data;
        const advancesMontoAsistencia = advancesData?.monto_asistencia;
        const advancesMontoComisiones = advancesData?.monto_comisiones;
        const advancesMontoPropinas = advancesData?.monto_propinas;
        const advancesMontoMaximo = advancesData?.monto_maximo;

        const meStats = (meStatsRes as ApiRes<MeStatsData>).data?.stats;

        // Usar los datos reales de /advances/max si están disponibles,
        // de lo contrario usar /users/me/stats, y si no, ceros
        const montoAsistencia = advancesMontoAsistencia != null
          ? Number(advancesMontoAsistencia)
          : Number(meStats?.montoAsistencia || 0);
        const montoComisiones = advancesMontoComisiones != null
          ? Number(advancesMontoComisiones)
          : Number(meStats?.montoComisiones || 0);
        const montoPropinas = advancesMontoPropinas != null
          ? Number(advancesMontoPropinas)
          : Number(meStats?.montoPropinas || 0);

        return {
          events: eventsRes.data || [],
          stats: roleStats || initialStats,
          userStatus: statusData?.status || 1,
          payoutTotal: advancesMontoMaximo != null
            ? Number(advancesMontoMaximo)
            : Number(meStats?.montoAnticipoMaximo || 0),
          payoutBreakdown: {
            montoAsistencia,
            montoComisiones,
            montoPropinas,
            montoHorasExtras: Number(meStats?.montoHorasExtras || 0),
            montoGratificaciones: Number(meStats?.montoGratificaciones || 0),
            montoAnticipos: Number(meStats?.montoAnticipos || 0),
            totalAsistencias: Number(meStats?.totalAsistencias || 0),
            serviciosCompletados: Number(meStats?.serviciosCompletados || 0),
          },
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
    pendingOrders: data?.pendingOrders || 0,
    pendingRequests: data?.pendingRequests || 0,
    pendingTransfers: data?.pendingTransfers || 0,
    pendingAdvances: data?.pendingAdvances || 0,
    payoutTotal: data?.payoutTotal || 0,
    payoutBreakdown: data?.payoutBreakdown,
    containerSummary: data?.containerSummary ?? null,
    hasNewAlert,
    selectedDates,
    onRefresh,
    setSelectedDates,
    setHasNewAlert,
    fetchData: refetch,
  };
}
