import * as Speech from "expo-speech";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import EventSource from "react-native-sse";
import Toast from "react-native-toast-message";
import { API_URL, apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

export interface Timer {
  id: string;
  servicioId: number;
  roomId: number;
  roomName: string;
  duration: number; // en minutos
  remainingTime: number; // en segundos
  isActive: boolean;
  isPaused: boolean;
  startTime: Date;
  servicioCode: string;
  clienteNombre: string;
  tipoTransaccion?: "servicio" | "venta";
  anfitrionas?: string;
  precio_servicio?: number;
  precio_habitacion?: number;
  iva?: number;
  total?: number;
  metodo_pago?: string;
  waiter_name?: string;
  habitacion_comision?: number;
  anfitrionas_ids?: number[];
  created_at?: string;
  estado?: number;
  lastAnnouncedMinute?: number;
}

interface TimerContextType {
  timers: Timer[];
  serverOffset: number;
  loading: boolean;
  refreshTimers: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

// Función de utilidad para hablar
const announceVoice = async (message: string) => {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (!isSpeaking) {
      Speech.speak(message, {
        language: "es-ES",
        rate: 0.9,
        pitch: 1.0,
      });
    }
  } catch (error) {
    console.error("[TimerContext] Error en voice synthesis:", error);
  }
};

export const calculateRemainingTime = (
  timer: Timer,
  offset: number = 0,
): number => {
  if (timer.isPaused) {
    return timer.remainingTime;
  }

  const now = new Date(Date.now() + offset);
  const elapsedSeconds = Math.floor(
    (now.getTime() - timer.startTime.getTime()) / 1000,
  );
  const totalDurationSeconds = timer.duration * 60;
  const remaining = totalDurationSeconds - elapsedSeconds;

  return Math.max(0, remaining);
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [serverOffset, setServerOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timersRef = useRef<Timer[]>([]);

  // Sincronizar ref con estado para el intervalo de voz
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  const fetchActiveTimers = useCallback(async () => {
    try {
      const data = await apiClient("/timers/active");
      if (data.success && Array.isArray(data.data)) {
        if (data.serverTime) {
          const serverDate = new Date(data.serverTime);
          const localDate = new Date();
          setServerOffset(serverDate.getTime() - localDate.getTime());
        }

        const activeTimers = data.data.map((t: any) => ({
          id: `${t.servicioId}-${t.roomId}`,
          servicioId: t.servicioId,
          roomId: t.roomId,
          roomName: t.roomName,
          duration: t.duration,
          remainingTime: t.remainingTime || 0,
          isActive: true,
          isPaused: t.isPaused === 1 || t.estado === 3,
          startTime: new Date(t.startTime),
          servicioCode: t.codigo,
          clienteNombre: t.clienteNombre,
          tipoTransaccion: t.tipoTransaccion,
          anfitrionas: t.anfitrionas,
          precio_servicio: t.precio_servicio,
          precio_habitacion: t.precio_habitacion,
          iva: t.iva,
          total: t.total,
          metodo_pago: t.metodo_pago,
          waiter_name: t.waiter_name,
          habitacion_comision: t.habitacion_comision || 0,
          anfitrionas_ids: t.anfitrionas_ids || [],
          created_at: t.created_at,
          estado: t.estado,
        }));

        setTimers(activeTimers);
      }
    } catch (error) {
      console.error("[TimerContext] Error fetching active timers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSSEEvent = useCallback((payload: any) => {
    switch (payload.type) {
      case "timer_started":
        const newTimerData = payload.data;
        const newTimer: Timer = {
          id: `${newTimerData.servicioId}-${newTimerData.roomId}`,
          servicioId: newTimerData.servicioId,
          roomId: newTimerData.roomId,
          roomName: newTimerData.roomName,
          duration: newTimerData.duration,
          remainingTime: newTimerData.duration * 60,
          isActive: true,
          isPaused: false,
          startTime: new Date(newTimerData.startTime),
          servicioCode: newTimerData.codigo,
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
          anfitrionas_ids: newTimerData.anfitrionas_ids || [],
          created_at: newTimerData.created_at || newTimerData.startTime,
          estado: newTimerData.estado || 2,
        };
        setTimers((prev) => [
          ...prev.filter((t) => t.servicioId !== newTimer.servicioId),
          newTimer,
        ]);
        break;

      case "timer_stopped":
        const currentUser = useAuthStore.getState().user;
        const stoppedTimer = timersRef.current.find((t) => t.servicioId === payload.data.servicioId);
        if (currentUser?.role?.toLowerCase() === "cajero") {
          const roomLabel = stoppedTimer?.roomName || payload.data?.habitacion_numero || payload.data?.habitacion_id || payload.data?.roomName || 'asignada';
          Toast.show({
            type: "success",
            text1: "Servicio Finalizado Automáticamente",
            text2: `La habitación ${roomLabel} ha terminado su tiempo.`,
          });
        }
        setTimers((prev) =>
          prev.filter((t) => t.servicioId !== payload.data.servicioId),
        );
        break;

      case "timer_paused":
        setTimers((prev) =>
          prev.map((t) => {
            if (t.servicioId === payload.data.servicioId) {
              const currentRemaining = calculateRemainingTime(t, serverOffset);
              return {
                ...t,
                isPaused: true,
                estado: 3,
                remainingTime: currentRemaining,
              };
            }
            return t;
          }),
        );
        break;

      case "timer_resumed":
        setTimers((prev) =>
          prev.map((t) => {
            if (t.servicioId === payload.data.servicioId) {
              return {
                ...t,
                isPaused: false,
                estado: 2,
                startTime: new Date(payload.data.newStartTime),
                lastAnnouncedMinute: undefined,
              };
            }
            return t;
          }),
        );
        break;

      case "timer_updated":
        setTimers((prev) =>
          prev.map((t) => {
            if (t.servicioId === payload.data.servicioId) {
              return {
                ...t,
                ...payload.data,
                duration: Number(payload.data.duration || t.duration),
                startTime: payload.data.startTime ? new Date(payload.data.startTime) : t.startTime,
                roomName: payload.data.roomName || t.roomName,
                anfitrionas: payload.data.anfitrionas !== undefined ? payload.data.anfitrionas : t.anfitrionas,
                lastAnnouncedMinute: undefined,
              };
            }
            return t;
          }),
        );
        break;
    }
  }, [serverOffset]);

  // Loop de avisos por voz (Solo Cajero)
  useEffect(() => {
    if (!user || user.role?.toLowerCase() !== "cajero") return;

    const interval = setInterval(() => {
      const currentTimers = timersRef.current;
      currentTimers.forEach((timer) => {
        if (!timer.isActive || timer.isPaused || timer.estado === 3) return;

        const remSeconds = calculateRemainingTime(timer, serverOffset);
        const remMinutes = Math.floor(remSeconds / 60);

        if (
          (remMinutes === 5 || remMinutes === 1) &&
          timer.lastAnnouncedMinute !== remMinutes &&
          remSeconds > 0
        ) {
          const mensaje = `Atención: quedan ${remMinutes} minuto${remMinutes > 1 ? "s" : ""} en la ${timer.roomName}`;
          announceVoice(mensaje);

          setTimers((prev) =>
            prev.map((t) =>
              t.id === timer.id ? { ...t, lastAnnouncedMinute: remMinutes } : t,
            ),
          );
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [user, serverOffset]);

  useEffect(() => {
    if (!user?.id) return;

    fetchActiveTimers();

    const sseUrl = `${API_URL.replace("/api", "")}/api/notifications/sse`;
    let es: EventSource | null = null;

    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("message", (event: any) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);
          handleSSEEvent(payload);
        } catch (err) {
          console.error("[TimerContext] SSE parse error:", err);
        }
      });
    } catch (err) {
      console.error("[TimerContext] SSE init error:", err);
    }

    return () => {
      if (es) {
        es.close();
        eventSourceRef.current = null;
      }
    };
  }, [user?.id, handleSSEEvent, fetchActiveTimers]);

  return (
    <TimerContext.Provider
      value={{
        timers,
        serverOffset,
        loading,
        refreshTimers: fetchActiveTimers,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error("uso dentro de TimerProvider");
  }
  return context;
};
