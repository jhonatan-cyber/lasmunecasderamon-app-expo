import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClientSafe } from '@/api/client';
import {
  REALTIME_EVENT_NAMES,
  shouldRefreshRequestsFromSse,
  type RealtimePayload,
} from '@/utils/realtime';
import {
  useDebouncedEventListener,
} from '@/hooks/useDebouncedEventListener';

const QUERY_KEY = ['pending-solicitudes-count'] as const;

/**
 * Contador de solicitudes pendientes para la campanita del header.
 *
 * Va separado del query del dashboard: así el badge se actualiza en cuanto
 * llega un evento realtime (o se atiende una solicitud) aunque el dashboard
 * siga en caché.
 */
export function usePendingSolicitudesCount(enabled = true): number {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await apiClientSafe<{ count?: number }>(
        '/service-requests/pending-count',
      );
      return res.success ? Number(res.data?.count || 0) : 0;
    },
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  useDebouncedEventListener(
    REALTIME_EVENT_NAMES.refreshRequests,
    invalidate,
    300,
    enabled,
  );

  useDebouncedEventListener<RealtimePayload>(
    REALTIME_EVENT_NAMES.sseEvent,
    (payload) => {
      if (shouldRefreshRequestsFromSse(payload?.type)) invalidate();
    },
    300,
    enabled,
  );

  useFocusEffect(
    useCallback(() => {
      if (enabled) invalidate();
    }, [enabled, invalidate]),
  );

  return data ?? 0;
}
