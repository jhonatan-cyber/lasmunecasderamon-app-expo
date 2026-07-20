import * as Notifications from "expo-notifications";
import React, { createContext, Suspense, useCallback, useContext, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import EventSource from "react-native-sse";
import { showToast, ToastComponent } from '@/utils/toast-lazy';
import { API_URL } from "@/api/client";
import * as Haptics from 'expo-haptics';
import { useAuthStore } from "@/store/authStore";
import {
  emitRefreshAnticipos,
  emitRefreshCuentas,
  emitRefreshRequests,
  emitRefreshSales,
  emitSseEvent,
  isSseControlEvent,
} from "@/utils/realtime";
import type { SSEPayload } from '../types/realtime';
import {
  getUserRole,
  getUserRoleName,
  isCajeroOrAdminRole,
  isCajeroRole,
} from "@/utils/userRole";

import logger from '@/utils/logger';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  showLocalNotification: (title: string, body: string) => Promise<void>;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  
  // ─── Reconexión SSE con exponential backoff ─────────────────
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  
  const INITIAL_RETRY_DELAY = 1000;   // 1 segundo
  const MAX_RETRY_DELAY = 30000;      // 30 segundos
  const BACKOFF_FACTOR = 2;
  const JITTER_MAX = 0.3;             // 30% de jitter para evitar thundering herd

  const showLocalNotification = useCallback(async (title: string, body: string) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { data: "local" },
        },
        trigger: null,
      });
    } catch {

    }
  }, []);

  const handleServerEvent = useCallback((payload: SSEPayload) => {
    const roleName = getUserRoleName(user);
    const lowerRole = getUserRole(user);
    const isCajeroOrAdmin = isCajeroOrAdminRole(user);
    const data = (payload.data || {}) as any;
    const isRequester = String(data.usuario_id || "") === String(user?.id || "");        logger.debug(`[NotificationContext] Rol detectado: ${roleName} (${lowerRole}), ?Es Cajero/Admin?: ${isCajeroOrAdmin}`);

    switch (payload.type) {
      case "new_order":
      case "new_service_request":
        if (isCajeroOrAdmin) {
          const isOrder = payload.type === "new_order";
          const id = isOrder ? data.id : data.id_solicitud || data.id;
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({
            type: "order",
            text1: isOrder ? "¡Nuevo Pedido!" : "Solicitud de Servicio",
            text2: isOrder ? `${data.codigo} - ${data.cliente}` : `ID: ${data.id} - ${data.descripcion || "Sin descripción"}`,
            visibilityTime: 6000,
          });

          showLocalNotification(
            isOrder ? "Nuevo Pedido" : "Solicitud de Servicio",
            isOrder ? `Pedido: ${data.codigo}` : data.descripcion
          );
          emitRefreshRequests(payload);

          if (id) {
            router.push({
              pathname: "/(app)/cajero/solicitudes",
              params: { openId: String(id), type: payload.type }
            } as any);
          }
        }
        break;

      case "new_anticipo_request":
        if (isCajeroOrAdmin) {
          const body = `${data.nick || data.empleado || "Empleado"} solicito un anticipo por $${Number(data.monto || 0).toLocaleString("es-ES")}`;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          showToast({
            type: "info",
            text1: "Nueva solicitud de anticipo",
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification("Nueva solicitud de anticipo", body);
          emitRefreshRequests(payload);
        }
        break;

      case "anticipo_processed": {
        const approved = payload.data?.status === "approved";
        const title = approved ? "Anticipo aceptado" : "Anticipo rechazado";
        const body = `${payload.data?.nick || payload.data?.empleado || "Empleado"} - $${Number(payload.data?.monto || 0).toLocaleString("es-ES")}`;

        if (isCajeroRole(user) || isRequester) {
          Haptics.notificationAsync(
            approved
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning
          );
          showToast({
            type: approved ? "success" : "error",
            text1: title,
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification(title, body);
        }

        if (isCajeroRole(user)) {
          emitRefreshRequests(payload);
        }

        if (isRequester) {
          emitRefreshAnticipos(payload);
        }
        break;
      }

      case "anticipo_delivered":
        if (isCajeroRole(user) || isRequester) {
          const body = `${payload.data?.nick || payload.data?.empleado || "Empleado"} - $${Number(payload.data?.monto || 0).toLocaleString("es-ES")}`;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({
            type: "success",
            text1: "Anticipo entregado",
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification("Anticipo entregado", body);
        }

        if (isCajeroRole(user)) {
          emitRefreshRequests(payload);
        }

        if (isRequester) {
          emitRefreshAnticipos(payload);
        }
        break;

      case "timer_started":
      case "timer_stopped":
      case "timer_resumed":
      case "timer_paused":
      case "timer_updated":
      case "room_occupied":
        break;

      case "sale_created":
      case "sale_updated":
      case "sale_cancelled":
        if (isCajeroOrAdmin) {
          const saleData = (payload.data || {}) as any;
          showToast({
            type: "success",
            text1: "Venta Actualizada",
            text2: `Código: ${saleData.codigo || 'N/A'} - $${Number(saleData.total || 0).toLocaleString('es-ES')}`,
            visibilityTime: 4000,
          });
          emitRefreshSales();
          emitRefreshRequests(); 
        }
        break;

      case "order_deleted":
      case "order_updated":
      case "service_request_approved":
      case "service_request_rejected":
        if (isCajeroOrAdmin) {
          emitRefreshRequests();
        }
        break;

      case "ping":
        break;

      case "anulacion_processed":
        if (isCajeroOrAdmin) {
          const approved = payload.data?.accion === "confirmar";
          const title = approved ? "Solicitud aprobada" : "Solicitud rechazada";
          const body = `${payload.data?.codigo || "N/A"} - ${payload.data?.clienteNombre || "Sin cliente"}`;
          const tipo = payload.data?.tipo;

          Haptics.notificationAsync(
            approved
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning
          );
          showToast({
            type: approved ? "success" : "error",
            text1: title,
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification(title, body);
          emitRefreshRequests(payload);
          if (tipo === "cuenta") {
            emitRefreshCuentas(payload);
          } else if (tipo === "venta") {
            emitRefreshSales(payload);
          }
        }
        break;

      default:
        logger.info('[NotificationContext] Evento SSE no manejado específicamente', { type: payload.type });
    }
  }, [router, showLocalNotification, user]);

  // ─── Conexión SSE ───────────────────────────────────────────
  // Crea el EventSource, maneja mensajes, open y error.
  // En error → cierra el EventSource y programa reconexión.
  const connectSSE = useCallback(() => {
    if (!user?.id) return;

    // Cerrar conexión anterior si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const sseUrl = `${API_URL}/notifications/sse`;
    logger.info('[NotificationContext] Conectando SSE', {
      url: sseUrl,
      attempt: retryCountRef.current + 1
    });

    let es: EventSource | null = null;
    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("message", (event: { data?: string | null }) => {
        if (!event.data) {
          logger.info('[NotificationContext] Evento SSE vacío');
          return;
        }
        try {
          const payload: SSEPayload = JSON.parse(event.data);
          logger.debug('[NotificationContext] Evento SSE recibido', { type: payload.type, id: payload.data?.id || '' });

          if (!isSseControlEvent(payload.type)) {
             emitSseEvent(payload);
          }
          handleServerEvent(payload);
        } catch (err) {
          logger.captureException(err, { context: 'NotificationContext:parseEvent' });
        }
      });

      es.addEventListener("open", () => {
        if (!isMountedRef.current) return;
        retryCountRef.current = 0; // Reset retry count on successful connection
        setIsConnected(true);
        logger.info('[NotificationContext] Conexión SSE establecida con éxito');
        showToast({
            type: "success",
            text1: "Conectado",
            text2: "Notificaciones en tiempo real activas",
            visibilityTime: 2000,
        });
      });

      es.addEventListener("error", () => {
        if (!isMountedRef.current) return;
        logger.warn('[NotificationContext] Error de conexión SSE, reconectando...', {
          attempt: retryCountRef.current + 1
        });
        setIsConnected(false);
        // Cerramos el EventSource para evitar su reconexión automática
        // y controlamos nosotros la reconexión con exponential backoff
        if (es) {
          es.close();
        }
        eventSourceRef.current = null;
        scheduleReconnect();
      });

    } catch (err) {
       logger.captureException(err, { context: 'NotificationContext:connectSSE' });
       if (!isMountedRef.current) return;
       setIsConnected(false);
       scheduleReconnect();
    }
  }, [user?.id, handleServerEvent]);

  // ─── Reconexión con exponential backoff ──────────────────────
  // Función normal (no hook) para evitar stale closures.
  // Siempre usa la última versión de connectSSE del closure.
  function scheduleReconnect() {
    if (!isMountedRef.current) return;

    const attempt = retryCountRef.current + 1;
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(BACKOFF_FACTOR, retryCountRef.current),
      MAX_RETRY_DELAY
    );
    // Agregar jitter: ±30% aleatorio para evitar thundering herd
    const jitter = delay * JITTER_MAX * (Math.random() * 2 - 1);
    const finalDelay = Math.round(delay + jitter);

    retryCountRef.current = attempt;

    logger.info('[NotificationContext] Programando reconexión SSE', {
      attempt,
      delayMs: finalDelay
    });

    retryTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        connectSSE();
      }
    }, finalDelay);
  }

  useEffect(() => {
    // Marcamos como mounted al inicio
    isMountedRef.current = true;
    
    if (!user?.id) return;
    
    // Conectar SSE con reconexión automática (exponential backoff)
    connectSSE();

    return () => {
      // Limpieza completa al desmontar
      isMountedRef.current = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      retryCountRef.current = 0;
      setIsConnected(false);
    };
  }, [user?.id, connectSSE]);

  return (
    <NotificationContext.Provider value={{ showLocalNotification, isConnected }}>
      {children}
      <Suspense fallback={null}>
        <ToastComponent position="top" topOffset={60} />
      </Suspense>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
