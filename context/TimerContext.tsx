import * as Speech from "expo-speech";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DeviceEventEmitter } from 'react-native';
import EventSource from "react-native-sse";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

import { parseDateSafe, calculateRemainingTime, formatTime } from "../utils/timeUtils";

export interface Timer {
  id: string;
  servicioId: string;
  roomId: string;
  roomName: string;
  duration: number; // en minutos
  remainingTime: number; // en segundos
  isActive: boolean;
  isPaused: boolean;
  startTime: Date;
  servicioCode: string;
  clienteNombre: string;
  tipoTransaccion?: "servicio" | "venta" | "cuenta";
  anfitrionas?: string;
  precio_servicio?: number;
  precio_habitacion?: number;
  iva?: number;
  total?: number;
  metodo_pago?: string;
  waiter_name?: string;
  habitacion_comision?: number;
  anfitrionas_ids?: string[];
  created_at?: string;
  estado?: number;
  lastAnnouncedMinute?: number;
  isOverdueNotified?: boolean;
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

  }
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

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchActiveTimers = useCallback(async () => {
    try {
      // Timeout corto (8s) para no bloquear la UI — si falla, hace retry automático
      const data = await apiClient("/timers/active", { timeout: 8000 });
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
          startTime: parseDateSafe(t.startTime),
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
          isOverdueNotified: false,
        }));

        setTimers(activeTimers);
      }
    } catch (error) {
      // Silencioso — programa retry en 5s sin mostrar error al usuario
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        fetchActiveTimers();
      }, 5000);
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
          startTime: parseDateSafe(newTimerData.startTime),
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
          isOverdueNotified: false,
        };
        setTimers((prev) => [
          ...prev.filter((t) => !(String(t.servicioId) === String(newTimer.servicioId) && t.tipoTransaccion === newTimer.tipoTransaccion)),
          newTimer,
        ]);
        DeviceEventEmitter.emit('refresh_sales');
        DeviceEventEmitter.emit('refresh_requests');
        DeviceEventEmitter.emit('refresh_cuentas');
        break;

      case "timer_stopped":
        // Buscar el timer ANTES de removerlo del estado para tener sus metadatos
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

        setTimers((prev) =>
          prev.filter((t) => !(String(t.servicioId) === String(targetServicioId) && (t.tipoTransaccion === targetTipo || !t.tipoTransaccion))),
        );

        DeviceEventEmitter.emit('refresh_sales', {
          roomName: roomNameForEvent,
          automatic: true,
          servicioId: targetServicioId
        });
        DeviceEventEmitter.emit('refresh_requests');
        DeviceEventEmitter.emit('refresh_cuentas');
        break;

      case "timer_paused": {
        const targetTipoP = payload.data.tipoTransaccion || 'servicio';
        setTimers((prev) =>
          prev.map((t) => {
            if (String(t.servicioId) === String(payload.data.servicioId) && t.tipoTransaccion === targetTipoP) {
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
        DeviceEventEmitter.emit('refresh_sales');
        DeviceEventEmitter.emit('refresh_requests');
        DeviceEventEmitter.emit('refresh_cuentas');
        break;
      }

      case "timer_resumed": {
        const targetTipoR = payload.data.tipoTransaccion || 'servicio';
        setTimers((prev) =>
          prev.map((t) => {
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
          }),
        );
        DeviceEventEmitter.emit('refresh_sales');
        DeviceEventEmitter.emit('refresh_requests');
        DeviceEventEmitter.emit('refresh_cuentas');
        break;
      }

      case "timer_updated": {
        const targetTipoU = payload.data.tipoTransaccion || 'servicio';
        setTimers((prev) =>
          prev.map((t) => {
            if (String(t.servicioId) === String(payload.data.servicioId) && t.tipoTransaccion === targetTipoU) {
              return {
                ...t,
                ...payload.data,
                duration: Number(payload.data.duration || t.duration),
                startTime: payload.data.startTime ? parseDateSafe(payload.data.startTime) : t.startTime,
                roomName: payload.data.roomName || t.roomName,
                anfitrionas: payload.data.anfitrionas !== undefined ? payload.data.anfitrionas : t.anfitrionas,
                lastAnnouncedMinute: undefined,
              };
            }
            return t;
          }),
        );
        DeviceEventEmitter.emit('refresh_sales');
        DeviceEventEmitter.emit('refresh_requests');
        DeviceEventEmitter.emit('refresh_cuentas');
        break;
      }
    }
  }, [serverOffset]);

  // Loop de avisos por voz (Solo Cajero)
  useEffect(() => {
    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
    if (roleName?.toLowerCase() !== "cajero") return;

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

        if (remSeconds <= 0 && !timer.isOverdueNotified) {
          DeviceEventEmitter.emit('refresh_sales', {
            roomName: timer.roomName,
            automatic: true,
            servicioId: timer.servicioId
          });

          setTimers((prev) =>
            prev.map((t) =>
              t.id === timer.id ? { ...t, isOverdueNotified: true } : t,
            ),
          );
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [user, serverOffset]);

  useEffect(() => {
    fetchActiveTimers();

    // Suscribirse al canal SSE centralizado desde NotificationContext
    const subscription = DeviceEventEmitter.addListener("sse_event", (payload: any) => {
      handleSSEEvent(payload);
    });

    return () => {
      subscription.remove();
      // Cancelar retry pendiente al desmontar
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
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
