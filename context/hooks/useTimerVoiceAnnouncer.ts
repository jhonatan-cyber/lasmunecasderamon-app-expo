import * as Speech from "expo-speech";
import { useEffect } from "react";
import type { Timer } from "@/context/types";
import {
  emitRefreshSales,
} from "@/utils/realtime";
import { calculateRemainingTime, parseDateSafe } from "@/utils/timeUtils";
import { isCajeroRole, type UserLike } from "@/utils/userRole";
import logger from "@/utils/logger";

const announceVoice = async (message: string) => {
  try {
    Speech.speak(message, {
      language: "es-ES",
      rate: 0.9,
      pitch: 1.0,
    });
  } catch (error) {
    logger.captureException(error, { context: 'TimerVoiceAnnouncer:announceVoice' });
  }
};

interface UseTimerVoiceAnnouncerParams {
  timersRef: React.MutableRefObject<Timer[]>;
  serverOffset: number;
  user: UserLike;
  setTimers: React.Dispatch<React.SetStateAction<Timer[]>>;
  setExpiredTimer: React.Dispatch<React.SetStateAction<Timer | null>>;
}

/**
 * Polls active timers every 5 seconds and announces voice warnings
 * when a timer is about to expire (5 min / 1 min remaining).
 * Also triggers expired-timer events and sets the expiredTimer state.
 */
export function useTimerVoiceAnnouncer({
  timersRef,
  serverOffset,
  user,
  setTimers,
  setExpiredTimer,
}: UseTimerVoiceAnnouncerParams) {
  useEffect(() => {
    if (!isCajeroRole(user)) return;

    const interval = setInterval(() => {
      const currentTimers = timersRef.current;
      currentTimers.forEach((timer) => {
        if (!timer.isActive || timer.isPaused || timer.estado === 3) return;

        const remSeconds = calculateRemainingTime(timer, serverOffset);

        let targetMinute: number | null = null;
        if (remSeconds > 0) {
            if (remSeconds <= 300 && remSeconds > 60 && timer.lastAnnouncedMinute !== 5) {
                targetMinute = 5;
            } else if (remSeconds <= 60 && timer.lastAnnouncedMinute !== 1) {
                targetMinute = 1;
            }
        }

        const start = timer.startTime instanceof Date ? timer.startTime : parseDateSafe(timer.startTime);
        const elapsedSinceStart = Math.floor((new Date(Date.now() + serverOffset).getTime() - start.getTime()) / 1000);

        if (targetMinute !== null) {
          const mensajeStr = targetMinute === 1 ? 'quedan 1 minuto' : `quedan ${targetMinute} minutos`;
          const mensaje = `Atención: ${mensajeStr} en la ${timer.roomName}`;
          announceVoice(mensaje);

          setTimers((prev) =>
            prev.map((t) =>
              t.id === timer.id ? { ...t, lastAnnouncedMinute: targetMinute! } : t,
            ),
          );
        }

        if (remSeconds <= 0 && !timer.isOverdueNotified && elapsedSinceStart > 10) {
          emitRefreshSales({
            roomName: timer.roomName,
            automatic: true,
            reason: 'ended',
            servicioId: timer.servicioId,
            tipoTransaccion: timer.tipoTransaccion,
          });

          setTimers((prev) =>
            prev.map((t) =>
              t.id === timer.id ? { ...t, isOverdueNotified: true } : t,
            ),
          );

          setExpiredTimer(timer);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [user, serverOffset, setTimers, setExpiredTimer, timersRef]);
}
