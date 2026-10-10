import { useAuthStore } from "@/store/authStore";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState } from "react-native";
import type { Timer, TimerContextType } from '@/context/types';

import { ExpiredTimerModal } from '@/context/components/ExpiredTimerModal';
import { useActiveTimersFetcher } from '@/context/hooks/useActiveTimersFetcher';
import { useSSETimerHandler } from '@/context/hooks/useSSETimerHandler';
import { useTimerVoiceAnnouncer } from '@/context/hooks/useTimerVoiceAnnouncer';

const TimerContext = createContext<TimerContextType | undefined>(undefined);

/**
 * Acciones estables (no cambian con el tick de 1s): quien solo necesita
 * `refreshTimers` usa `useTimerActions()` y NO re-renderiza cada segundo.
 */
interface TimerActionsContextType {
  refreshTimers: () => Promise<void>;
}

const TimerActionsContext = createContext<TimerActionsContextType | undefined>(undefined);
const TimerTickContext = createContext(0);



export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [serverOffset, setServerOffset] = useState(0);
  const serverOffsetRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [expiredTimer, setExpiredTimer] = useState<Timer | null>(null);
  const [timerTick, setTimerTick] = useState(0);
  const user = useAuthStore((state) => state.user);
  const timersRef = useRef<Timer[]>([]);

  const { fetchActiveTimers } = useActiveTimersFetcher({
    setTimers,
    setServerOffset,
    serverOffsetRef,
    setLoading,
    timersRef,
  });

  // SSE event handling — delegated to the extracted hook
  const { syncTimersRef } = useSSETimerHandler({
    fetchActiveTimers,
    serverOffset,
    setTimers,
    setExpiredTimer,
  });

  useEffect(() => {
    timersRef.current = timers;
    syncTimersRef(timers);
  }, [syncTimersRef, timers]);

  // Voice announcements and overdue detection (5s polling) — delegated to extracted hook
  useTimerVoiceAnnouncer({
    timersRef,
    serverOffset,
    user,
    setTimers,
    setExpiredTimer,
  });

  // El tick visual vive en un contexto separado: solo las tarjetas que muestran
  // una cuenta regresiva se actualizan cada segundo. Las pantallas que solo
  // necesitan saber qué timers existen mantienen referencias estables.
  useEffect(() => {
    if (!timers.some((timer) => timer.isActive && !timer.isPaused)) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (interval !== undefined) {
        clearInterval(interval);
        interval = undefined;
      }
    };
    const start = () => {
      stop();
      setTimerTick((tick) => tick + 1);
      interval = setInterval(() => setTimerTick((tick) => tick + 1), 1000);
    };

    if (AppState.currentState === "active") start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") start();
      else stop();
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [timers]);

  // Initial fetch solo con sesión (antes fetcheaba pre-login y cosechaba 401).
  useEffect(() => {
    if (!user?.id) {
      // Diferido un tick: setState síncrono en el efecto dispara renders en cascada.
      const timeout = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      void fetchActiveTimers();
    }, 0);

    return () => clearTimeout(timeout);
  }, [user?.id, fetchActiveTimers]);

  const handleDismissExpired = useCallback(() => {
    setExpiredTimer(null);
  }, []);

  // Los valores de datos solo cambian al sincronizar timers, no en cada tick.
  const dataValue = useMemo(
    () => ({ timers, serverOffset, loading }),
    [timers, serverOffset, loading],
  );
  const actionsValue = useMemo(
    () => ({ refreshTimers: fetchActiveTimers }),
    [fetchActiveTimers],
  );

  return (
    <TimerActionsContext.Provider value={actionsValue}>
      <TimerContext.Provider
        value={{
          ...dataValue,
          refreshTimers: actionsValue.refreshTimers,
        }}
      >
        <TimerTickContext.Provider value={timerTick}>
          {children}
          <ExpiredTimerModal timer={expiredTimer} onDismiss={handleDismissExpired} />
        </TimerTickContext.Provider>
      </TimerContext.Provider>
    </TimerActionsContext.Provider>
  );
};

// Re-exported for backward compatibility — consumers import Timer from @/context/TimerContext
export type { Timer } from '@/context/types';

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error("uso dentro de TimerProvider");
  }
  return context;
};

/**
 * Solo acciones (estable): para pantallas/hooks que disparan `refreshTimers`
 * pero no muestran el countdown. No re-renderiza con el tick de 1s.
 */
export const useTimerActions = () => {
  const context = useContext(TimerActionsContext);
  if (context === undefined) {
    throw new Error("uso dentro de TimerProvider");
  }
  return context;
};

/** Suscripción de bajo costo para componentes que muestran una cuenta regresiva. */
export const useTimerTick = () => useContext(TimerTickContext);
