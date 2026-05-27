import { apiClient } from "@/api/client";
import { useAuthStore } from "@/store/authStore";
import * as Speech from "expo-speech";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { DeviceEventEmitter, Modal, View, Text, Pressable } from 'react-native';
import EventSource from "react-native-sse";
import { MetodoPago } from '../types/api';

import { calculateRemainingTime, parseDateSafe } from "@/utils/timeUtils";

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
  cliente_id?: string | null;
  clienteNombre: string;
  tipoTransaccion?: "servicio" | "venta" | "cuenta";
  anfitrionas?: string;
  precio_servicio?: number;
  precio_habitacion?: number;
  iva?: number;
  total?: number;
  metodo_pago?: MetodoPago;
  waiter_name?: string;
  waiter_foto?: string;
  solicitante_name?: string;
  solicitante_foto?: string;
  habitacion_comision?: number;
  anfitrionas_ids?: string[];
  anfitrionas_fotos?: string[];
  created_at?: string;
  estado?: number;
  total_usuarios?: number;
  comision_individual?: number;
  lastAnnouncedMinute?: number;
  isOverdueNotified?: boolean;
  // Campos para servicios temporales
  es_temporal?: boolean;
  servicio_original_id?: string | null;
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
    Speech.speak(message, {
      language: "es-ES",
      rate: 0.9,
      pitch: 1.0,
    });
  } catch (error) {
    console.error("Error al anunciar por voz:", error);
  }
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [serverOffset, setServerOffset] = useState(0);
  const serverOffsetRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [expiredTimer, setExpiredTimer] = useState<Timer | null>(null);
  const user = useAuthStore((state) => state.user);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timersRef = useRef<Timer[]>([]);

  // Sincronizar ref con estado para el intervalo de voz
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastFetchTimeRef = useRef<number>(0);

  const fetchActiveTimers = useCallback(async () => {
    const nowTs = Date.now();
    // Evitar llamadas excesivas (mucha frecuencia): mínimo 2 segundos entre fetch
    if (nowTs - lastFetchTimeRef.current < 2000) {
      console.log('[TimerContext Mobile] Skipping fetchActiveTimers (debounced)');
      return;
    }
    lastFetchTimeRef.current = nowTs;

    try {
      console.log('[TimerContext Mobile] Calling fetchActiveTimers');
      // Timeout más largo (20s) para evitar AbortError en red lenta
      const data = await apiClient("/timers/active?source=mobile", { timeout: 20000 });
      if (data.success && Array.isArray(data.data)) {
        if (data.serverTime) {
          const serverDate = new Date(data.serverTime);
          const localDate = new Date();
          const offset = serverDate.getTime() - localDate.getTime();
          setServerOffset(offset);
          serverOffsetRef.current = offset;
        }

        // Guardamos el estado actual de isOverdueNotified para no reiniciarlo y evitar un loop infinito de modales
        const currentTimersMap = new Map(timersRef.current.map(t => [t.id, t.isOverdueNotified]));

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
          cliente_id: t.cliente_id,
          clienteNombre: t.clienteNombre,
          tipoTransaccion: t.tipoTransaccion,
          anfitrionas: t.anfitrionas,
          precio_servicio: t.precio_servicio,
          precio_habitacion: t.precio_habitacion,
          iva: t.iva,
          total: t.total,
          metodo_pago: t.metodo_pago,
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
    } catch (error) {
      // Silencioso: programa retry en 5s sin mostrar error al usuario
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
      case "timer_started": {
        const newTimerData = payload.data;
        const start = parseDateSafe(newTimerData.startTime);
        const now = new Date(Date.now() + serverOffsetRef.current);
        const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
        const durationMins = Number(newTimerData.duration || 0);
        let remainingSeconds = Math.max(0, durationMins * 60 - elapsedSeconds);
        
        if (remainingSeconds === 0 && durationMins > 0 && elapsedSeconds < 120) {
            remainingSeconds = durationMins * 60; // Grace period like the web app
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
        setTimers((prev) => [
          ...prev.filter((t) => !(String(t.servicioId) === String(newTimer.servicioId) && t.tipoTransaccion === newTimer.tipoTransaccion)),
          newTimer,
        ]);
        DeviceEventEmitter.emit('refresh_sales');
        DeviceEventEmitter.emit('refresh_requests');
        DeviceEventEmitter.emit('refresh_cuentas');
        break;
      }

      case "timer_stopped":
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

        // Si el timer detenido es un temporal, reanudar el original LOCALMENTE
        // como fallback por si timer_resumed llegó antes o no se procesó
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
          
          return next;
        });

        DeviceEventEmitter.emit('refresh_sales', {
          roomName: roomNameForEvent,
          automatic: false,
          reason: 'stopped',
          servicioId: targetServicioId,
          tipoTransaccion: targetTipo,
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
                anfitrionas_ids: typeof payload.data.anfitrionas_ids === 'string' 
                  ? payload.data.anfitrionas_ids.split(',').filter(Boolean) 
                  : (payload.data.anfitrionas_ids || t.anfitrionas_ids),
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
      case "timers_updated": {
        console.log('[TimerContext Mobile] timers_updated received - syncing list');
        fetchActiveTimers();
        break;
      }
      case "user_status_updated": {
        DeviceEventEmitter.emit('refresh_requests');
        break;
      }
    }
  }, [fetchActiveTimers]);

  useEffect(() => {
    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
    if (roleName?.toLowerCase() !== "cajero") return;

    const interval = setInterval(() => {
      const currentTimers = timersRef.current;
      currentTimers.forEach((timer) => {
        if (!timer.isActive || timer.isPaused || timer.estado === 3) return;

        const remSeconds = calculateRemainingTime(timer, serverOffset);

        // Definimos la marca lógica según los segundos exactos
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
          DeviceEventEmitter.emit('refresh_sales', {
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

          // Mostrar modal persistente con info del timer expirado
          setExpiredTimer(timer);
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [user, serverOffset]);

  // Cargar temporizadores iniciales al cambiar de usuario
  useEffect(() => {
    fetchActiveTimers();
  }, [user?.id, fetchActiveTimers]);

  // Listener para eventos SSE
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener("sse_event", (payload: any) => {
      handleSSEEvent(payload);
    });

    return () => {
      subscription.remove();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [handleSSEEvent]);

  const handleDismissExpired = useCallback(() => {
    setExpiredTimer(null);
  }, []);

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

      {/* Modal persistente de tiempo terminado */}
      <Modal visible={!!expiredTimer} animationType="fade" transparent onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#1c1c1e', borderRadius: 24, width: '100%', maxWidth: 380, overflow: 'hidden' }}>
            {/* Header rojo */}
            <View style={{ backgroundColor: '#DC2626', padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginBottom: 4 }}>⏰</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>¡Tiempo Terminado!</Text>
              <Text style={{ color: '#fca5a5', fontSize: 13, marginTop: 2, textAlign: 'center' }}>
                {expiredTimer?.tipoTransaccion === 'servicio'
                  ? 'Servicio completado'
                  : expiredTimer?.tipoTransaccion === 'venta'
                    ? 'Venta completada'
                    : 'Tiempo terminado'}
              </Text>
            </View>

            {/* Info */}
            <View style={{ padding: 20, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>🛏️</Text>
                <View>
                  <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Habitación</Text>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>{expiredTimer?.roomName || '—'}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>👤</Text>
                <View>
                  <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Cliente</Text>
                  <Text style={{ color: '#fff', fontSize: 15 }}>{expiredTimer?.clienteNombre || '—'}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>
                  {expiredTimer?.tipoTransaccion === 'venta' ? '🛒' : '🏠'}
                </Text>
                <View>
                  <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Tipo</Text>
                  <Text style={{ color: '#fff', fontSize: 15, textTransform: 'capitalize' }}>
                    {expiredTimer?.tipoTransaccion === 'servicio'
                      ? 'Servicio'
                      : expiredTimer?.tipoTransaccion === 'venta'
                        ? 'Venta'
                        : '—'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>⏱️</Text>
                <View>
                  <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>Duración</Text>
                  <Text style={{ color: '#fff', fontSize: 15 }}>{expiredTimer?.duration || 0} minutos</Text>
                </View>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>Código:</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace' }}>#{expiredTimer?.servicioCode || '—'}</Text>
                </View>
              </View>
            </View>

            {/* Botón Entendido */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#333' }}>
              <Pressable
                onPress={handleDismissExpired}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#b91c1c' : '#DC2626',
                  paddingVertical: 14,
                  borderRadius: 999,
                  alignItems: 'center',
                })}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Entendido</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
