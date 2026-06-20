import { useCallback, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { Timer } from '@/context/types';
import { calculateRemainingTime, parseDateSafe } from "@/utils/timeUtils";
import {
  emitRefreshCuentas,
  emitRefreshRequests,
  emitRefreshSales,
  REALTIME_EVENT_NAMES,
} from "@/utils/realtime";
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

  const handleSSEEvent = useCallback((payload: any) => {
    switch (payload.type) {
      case "timer_started": {
        const newTimerData = payload.data;
        const start = parseDateSafe(newTimerData.startTime);
        const now = new Date(Date.now() + serverOffsetRef.current);
        const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
        const durationMins = Number(newTimerData.duration || 0);
        let remainingSeconds = Math.max(0, durationMins * 60 - elapsedSeconds);

        if (remainingSeconds === 0 && durationMins > 0 && elapsedSeconds < 120) {
          remainingSeconds = durationMins * 60;
        }

        const newTimer: Timer = {
          id: `${newTimerData.servicioId}-${newTimerData.roomId}`,
          servicioId: newTimerData.servicioId,
          roomId: newTimerData.roomId,
          roomName: newTimerData.roomName,
          duration: durationMins,
          remainingTime: remainingSeconds,
          isActive: true,
          isPaused: false,
          startTime: start,
          servicioCode: newTimerData.codigo,
          cliente_id: newTimerData.cliente_id,
          clienteNombre: newTimerData.clienteNombre,
          tipoTransaccion: newTimerData.tipoTransaccion,
          anfitrionas: newTimerData.anfitrionas,
          precio_servicio: newTimerData.precio_servicio,
          precio_habitacion: newTimerData.precio_habitacion,
          iva: newTimerData.iva,
          total: newTimerData.total,
          metodo_pago: newTimerData.metodo_pago,
          waiter_name: newTimerData.waiter_name,
          habitacion_comision: newTimerData.habitacion_comision || 0,
          anfitrionas_ids: typeof newTimerData.anfitrionas_ids === 'string'
            ? newTimerData.anfitrionas_ids.split(',').filter(Boolean)
            : (newTimerData.anfitrionas_ids || []),
          created_at: newTimerData.created_at || newTimerData.startTime,
          estado: newTimerData.estado || 2,
          total_usuarios: newTimerData.total_usuarios,
          comision_individual: newTimerData.comision_individual,
          isOverdueNotified: false,
          es_temporal: newTimerData.es_temporal === 1 || newTimerData.es_temporal === true,
          servicio_original_id: newTimerData.servicioOriginalId ? String(newTimerData.servicioOriginalId) : null,
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
        const targetServicioId = payload.data.servicioId;
        const stoppedTimerInfo = timersRef.current.find(
          (t) => String(t.servicioId) === String(targetServicioId)
        );

        const roomNameForEvent =
          stoppedTimerInfo?.roomName ||
          payload.data?.roomName ||
          payload.data?.habitacion_numero ||
          payload.data?.habitacion_id ||
          'asignada';

        const targetTipo = payload.data.tipoTransaccion || 'servicio';
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
        const targetTipoP = payload.data.tipoTransaccion || 'servicio';
        setTimers((prev) => {
          const next = prev.map((t) => {
            if (String(t.servicioId) === String(payload.data.servicioId) && t.tipoTransaccion === targetTipoP) {
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
        const targetTipoR = payload.data.tipoTransaccion || 'servicio';
        setTimers((prev) => {
          const next = prev.map((t) => {
            if (String(t.servicioId) === String(payload.data.servicioId) && t.tipoTransaccion === targetTipoR) {
              return {
                ...t,
                isPaused: false,
                estado: 2,
                startTime: parseDateSafe(payload.data.newStartTime),
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
        const targetTipoU = payload.data.tipoTransaccion || 'servicio';
        setTimers((prev) => {
          const next = prev.map((t) => {
            if (String(t.servicioId) === String(payload.data.servicioId) && t.tipoTransaccion === targetTipoU) {
              return {
                ...t,
                ...payload.data,
                duration: Number(payload.data.duration || t.duration),
                startTime: payload.data.startTime ? parseDateSafe(payload.data.startTime) : t.startTime,
                roomName: payload.data.roomName || t.roomName,
                anfitrionas: payload.data.anfitrionas !== undefined ? payload.data.anfitrionas : t.anfitrionas,
                anfitrionas_ids: typeof payload.data.anfitrionas_ids === 'string'
                  ? payload.data.anfitrionas_ids.split(',').filter(Boolean)
                  : (payload.data.anfitrionas_ids || t.anfitrionas_ids),
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

      case "timers_updated": {
        logger.info('[TimerContext Mobile] timers_updated received - syncing list');
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
    const subscription = DeviceEventEmitter.addListener(REALTIME_EVENT_NAMES.sseEvent, (payload: any) => {
      handleSSEEvent(payload);
    });

    return () => {
      subscription.remove();
    };
  }, [handleSSEEvent]);

  return { syncTimersRef, timersRef, serverOffsetRef };
}
