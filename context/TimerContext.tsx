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



export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [serverOffset, setServerOffset] = useState(0);
  const serverOffsetRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [expiredTimer, setExpiredTimer] = useState<Timer | null>(null);
  const user = useAuthStore((state) => state.user);
  const timersRef = useRef<Timer[]>([]);

  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  const { fetchActiveTimers } = useActiveTimersFetcher({
    setTimers,
    setServerOffset,
    serverOffsetRef,
    setLoading,
    timersRef,
  });

  // SSE event handling — delegated to the extracted hook
  useSSETimerHandler({
    fetchActiveTimers,
    serverOffset,
    setTimers,
    setExpiredTimer,
  });

  // Voice announcements and overdue detection (5s polling) — delegated to extracted hook
  useTimerVoiceAnnouncer({
    timersRef,
    serverOffset,
    user,
    setTimers,
    setExpiredTimer,
  });

  // ─── Tick loop local de 1s ──────────────────────────────────
  // Decrementa remainingTime para timers activos no pausados.
  // Así la UI muestra un countdown suave incluso si no llegan SSE events.
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTimers = timersRef.current;
      let needsUpdate = false;

      for (const timer of currentTimers) {
        if (timer.isActive && !timer.isPaused && timer.remainingTime > 0) {
          needsUpdate = true;
          break;
        }
      }

      if (!needsUpdate) return;

      setTimers((prev) =>
        prev.map((t) => {
          if (t.isActive && !t.isPaused && t.remainingTime > 0) {
            return { ...t, remainingTime: t.remainingTime - 1 };
          }
          return t;
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  // Memoizados por separado: el tick de 1s solo invalida `dataValue`;
  // `actionsValue` es estable (fetchActiveTimers no cambia).
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
        {children}

        <ExpiredTimerModal timer={expiredTimer} onDismiss={handleDismissExpired} />
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
