import { useCallback, useEffect, useRef } from 'react';
import { apiClientSafe } from '@/api/client';
import { MetodoPago } from '@/types/api';
import type { Timer } from '@/context/types';
import type { TimerRawData } from '@/types/realtime';
import { parseDateSafe } from '@/utils/timeUtils';
import logger from '@/utils/logger';

interface ActiveTimersResponse {
  success: boolean;
  data: TimerRawData[];
  serverTime?: string;
}

interface UseActiveTimersFetcherParams {
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
  setServerOffset: React.Dispatch<React.SetStateAction<number>>;
  serverOffsetRef: React.MutableRefObject<number>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  timersRef: React.MutableRefObject<Timer[]>;
}

export function useActiveTimersFetcher({
  setTimers,
  setServerOffset,
  serverOffsetRef,
  setLoading,
  timersRef,
}: UseActiveTimersFetcherParams) {
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const fetchActiveTimersRef = useRef<() => Promise<void>>(async () => {});

  const fetchActiveTimers = useCallback(async () => {
    const nowTs = Date.now();

    if (nowTs - lastFetchTimeRef.current < 2000) {
      logger.debug('[ActiveTimersFetcher] Skipping fetchActiveTimers (debounced)');
      return;
    }
    lastFetchTimeRef.current = nowTs;

    try {
      logger.debug('[ActiveTimersFetcher] Calling fetchActiveTimers');

      const raw = await apiClientSafe<TimerRawData[]>("/timers/active?source=mobile", { timeout: 20000 });
      const data = raw as unknown as ActiveTimersResponse;
      if (data.success && Array.isArray(data.data)) {
        if (data.serverTime) {
          const serverDate = new Date(data.serverTime);
          const localDate = new Date();
          const offset = serverDate.getTime() - localDate.getTime();
          setServerOffset(offset);
          serverOffsetRef.current = offset;
        }

        const currentTimersMap = new Map(timersRef.current.map(t => [t.id, t.isOverdueNotified]));

        const activeTimers = data.data.map((t: TimerRawData) => ({
          id: `${t.servicioId}-${t.roomId}`,
          servicioId: String(t.servicioId),
          roomId: String(t.roomId),
          roomName: t.roomName || '',
          duration: t.duration,
          remainingTime: t.remainingTime || 0,
          isActive: true,
          isPaused: t.isPaused === 1 || t.estado === 3,
          startTime: parseDateSafe(t.startTime),
          servicioCode: t.codigo || '',
          cliente_id: t.cliente_id,
          clienteNombre: t.clienteNombre || '',
          tipoTransaccion: t.tipoTransaccion,
          anfitrionas: t.anfitrionas,
          precio_servicio: t.precio_servicio,
          precio_habitacion: t.precio_habitacion,
          iva: t.iva,
          total: t.total,
          metodo_pago: t.metodo_pago as MetodoPago | undefined,
          waiter_name: t.waiter_name,
          waiter_foto: t.waiter_foto,
          solicitante_name: t.solicitante_name,
          solicitante_foto: t.solicitante_foto,
          habitacion_comision: t.habitacion_comision || 0,
          anfitrionas_ids: typeof t.anfitrionas_ids === 'string' ? t.anfitrionas_ids.split(',').filter(Boolean) : (t.anfitrionas_ids || []),
          anfitrionas_fotos: t.anfitrionas_fotos || [],
          created_at: t.created_at,
          estado: t.estado,
          total_usuarios: t.total_usuarios,
          comision_individual: t.comision_individual,
          isOverdueNotified: currentTimersMap.get(`${t.servicioId}-${t.roomId}`) || false,
          es_temporal: t.es_temporal === 1 || t.es_temporal === true,
          servicio_original_id: t.servicioOriginalId ? String(t.servicioOriginalId) : null,
        }));

        setTimers(activeTimers);
      }
    } catch {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        void fetchActiveTimersRef.current();
      }, 5000);
    } finally {
      setLoading(false);
    }
  }, [setTimers, setServerOffset, serverOffsetRef, setLoading, timersRef]);

  useEffect(() => {
    fetchActiveTimersRef.current = fetchActiveTimers;
  }, [fetchActiveTimers]);

  // Cleanup retryTimer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  return { fetchActiveTimers };
}
