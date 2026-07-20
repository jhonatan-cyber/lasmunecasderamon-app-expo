import { useCallback, useEffect, useRef } from 'react';
import { eventBus } from '@/utils/eventBus';
import { Timer } from '@/context/types';
import { calculateRemainingTime, parseDateSafe } from "@/utils/timeUtils";
import {
  emitRefreshCuentas,
  emitRefreshRequests,
  emitRefreshSales,
  REALTIME_EVENT_NAMES,
} from "@/utils/realtime";
import type { SSEPayload, TimerRawData } from '@/types/realtime';
import type { MetodoPago } from '@/types/api';
import logger from '@/utils/logger';

interface UseSSETimerHandlerParams {
  fetchActiveTimers: () => Promise<void>;
  serverOffset: number;
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
  setExpiredTimer: React.Dispatch<React.SetStateAction<Timer | null>>;
}

export function useSSETimerHandler({
  fetchActiveTimers,
  serverOffset,
  setTimers,
  setExpiredTimer,
}: UseSSETimerHandlerParams) {
  const serverOffsetRef = useRef(serverOffset);
  const timersRef = useRef<Timer[]>([]);

  useEffect(() => {
    serverOffsetRef.current = serverOffset;
  }, [serverOffset]);

  const syncTimersRef = useCallback((next: Timer[]) => {
    timersRef.current = next;
  }, []);

  const handleSSEEvent = useCallback((payload: SSEPayload) => {
    switch (payload.type) {
      case "timer_started": {
        if (!payload.data) break;
        const d = payload.data as unknown as TimerRawData;
        const start = parseDateSafe(d.startTime);
        const now = new Date(Date.now() + serverOffsetRef.current);
        const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
        const durationMins = Number(d.duration || 0);
        let remainingSeconds = Math.max(0, durationMins * 60 - elapsedSeconds);

        if (remainingSeconds === 0 && durationMins > 0 && elapsedSeconds < 120) {
          remainingSeconds = durationMins * 60;
        }

        const newTimer: Timer = {
          id: `${d.servicioId}-${d.roomId}`,
          servicioId: d.servicioId,
          roomId: d.roomId,
          roomName: d.roomName,
          duration: durationMins,
          remainingTime: remainingSeconds,
          isActive: true,
          isPaused: false,
          startTime: start,
          servicioCode: d.codigo || '',
          cliente_id: d.cliente_id,
          clienteNombre: d.clienteNombre || '',
          tipoTransaccion: d.tipoTransaccion,
          anfitrionas: d.anfitrionas,
          precio_servicio: d.precio_servicio,
          precio_habitacion: d.precio_habitacion,
          iva: d.iva,
          total: d.total,
          metodo_pago: d.metodo_pago as MetodoPago | undefined,
          waiter_name: d.waiter_name,
          habitacion_comision: d.habitacion_comision || 0,
          anfitrionas_ids: typeof d.anfitrionas_ids === 'string'
            ? d.anfitrionas_ids.split(',').filter(Boolean)
            : (d.anfitrionas_ids || []),
          created_at: d.created_at || d.startTime,
          estado: d.estado || 2,
          total_usuarios: d.total_usuarios,
          comision_individual: d.comision_individual,
          isOverdueNotified: false,
          es_temporal: d.es_temporal === 1 || d.es_temporal === true,
          servicio_original_id: d.servicioOriginalId ? String(d.servicioOriginalId) : null,
        };
        setTimers((prev) => {
          const next = [
            ...prev.filter((t) => !(String(t.servicioId) === String(newTimer.servicioId) && t.tipoTransaccion === newTimer.tipoTransaccion)),
            newTimer,
          ];
          timersRef.current = next;
          return next;
        });
        emitRefreshSales();
        emitRefreshRequests();
        emitRefreshCuentas();
        break;
      }

      case "timer_stopped": {
        if (!payload.data) break;
        const d = payload.data as unknown as TimerRawData;
        const targetServicioId = d.servicioId;
        const stoppedTimerInfo = timersRef.current.find(
          (t) => String(t.servicioId) === String(targetServicioId)
        );

        const roomNameForEvent =
          stoppedTimerInfo?.roomName ||
          d.roomName ||
          d.habitacion_numero ||
          d.habitacion_id ||
          'asignada';

        const targetTipo = d.tipoTransaccion || 'servicio';
        const originalId = stoppedTimerInfo?.servicio_original_id;

        setTimers((prev) => {
          let next = prev.filter((t) => !(String(t.servicioId) === String(targetServicioId) && (t.tipoTransaccion === targetTipo || !t.tipoTransaccion)));

          if (originalId) {
            next = next.map((t) => {
              if (String(t.servicioId) === String(originalId) && t.tipoTransaccion === targetTipo) {
                return { ...t, isPaused: false, estado: 2, lastAnnouncedMinute: undefined };
              }
              return t;
            });
          }

          timersRef.current = next;
          return next;
        });

        emitRefreshSales({
          roomName: roomNameForEvent,
          automatic: false,
          reason: 'stopped',
          servicioId: targetServicioId,
          tipoTransaccion: targetTipo,
        });
        emitRefreshRequests();
        emitRefreshCuentas();
        break;
      }

      case "timer_paused": {
        if (!payload.data) break;
        const d = payload.data as unknown as TimerRawData;
        const targetTipoP = d.tipoTransaccion || 'servicio';
        setTimers((prev) => {
          const next = prev.map((t) => {
            if (String(t.servicioId) === String(d.servicioId) && t.tipoTransaccion === targetTipoP) {
              const currentRemaining = calculateRemainingTime(t, serverOffsetRef.current);
              return {
                ...t,
                isPaused: true,
                estado: 3,
                remainingTime: currentRemaining,
              };
            }
            return t;
          });
          timersRef.current = next;
          return next;
        });
        emitRefreshSales();
        emitRefreshRequests();
        emitRefreshCuentas();
        break;
      }

      case "timer_resumed": {
        if (!payload.data) break;
        const d = payload.data as unknown as TimerRawData;
        const targetTipoR = d.tipoTransaccion || 'servicio';
        setTimers((prev) => {
          const next = prev.map((t) => {
            if (String(t.servicioId) === String(d.servicioId) && t.tipoTransaccion === targetTipoR) {
              return {
                ...t,
                isPaused: false,
                estado: 2,
                startTime: parseDateSafe(d.newStartTime || d.startTime),
                lastAnnouncedMinute: undefined,
              };
            }
            return t;
          });
          timersRef.current = next;
          return next;
        });
        emitRefreshSales();
        emitRefreshRequests();
        emitRefreshCuentas();
        break;
      }

      case "timer_updated": {
        if (!payload.data) break;
        const d = payload.data as unknown as TimerRawData;
        const targetTipoU = d.tipoTransaccion || 'servicio';
        setTimers((prev) => {
          const next = prev.map((t) => {
            if (String(t.servicioId) === String(d.servicioId) && t.tipoTransaccion === targetTipoU) {
              return {
                ...t,
                ...d,
                id: t.id,
                duration: Number(d.duration || t.duration),
                startTime: d.startTime ? parseDateSafe(d.startTime) : t.startTime,
                roomName: d.roomName || t.roomName,
                anfitrionas: d.anfitrionas !== undefined ? d.anfitrionas : t.anfitrionas,
                anfitrionas_ids: typeof d.anfitrionas_ids === 'string'
                  ? d.anfitrionas_ids.split(',').filter(Boolean)
                  : (d.anfitrionas_ids || t.anfitrionas_ids),
                servicio_original_id: d.servicioOriginalId ? String(d.servicioOriginalId) : null,
                lastAnnouncedMinute: undefined,
              } as Timer;
            }
            return t;
          });
          timersRef.current = next;
          return next;
        });
        emitRefreshSales();
        emitRefreshRequests();
        emitRefreshCuentas();
        break;
      }

      case "timers_updated": {
        logger.debug('[TimerContext Mobile] timers_updated received - syncing list');
        fetchActiveTimers();
        break;
      }

      case "user_status_updated": {
        emitRefreshRequests();
        break;
      }
    }
  }, [fetchActiveTimers, setTimers]);

  useEffect(() => {
    const subscription = eventBus.addListener(REALTIME_EVENT_NAMES.sseEvent, (payload: unknown) => {
      handleSSEEvent(payload as SSEPayload);
    });

    return () => {
      subscription.remove();
    };
  }, [handleSSEEvent]);

  return { syncTimersRef, timersRef, serverOffsetRef };
}
