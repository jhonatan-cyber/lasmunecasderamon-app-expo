import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { DeviceEventEmitter } from "react-native";
import { useRouter } from "expo-router";
import EventSource from "react-native-sse";
import Toast from "react-native-toast-message";
import { API_URL } from "@/api/client";
import * as Haptics from 'expo-haptics';
import { useAuthStore } from "@/store/authStore";
import { toastConfig } from "@/utils/toast-config";

import logger from '@/utils/logger';
// Configuración de notificaciones en el nivel superior (fuera del componente)
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

  const handleServerEvent = useCallback((payload: any) => {
    // Detección robusta del nombre del rol
    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
    const lowerRole = roleName?.toLowerCase();
    const isCajero = ["cajero", "cajera"].includes(lowerRole);
    const isCajeroOrAdmin = ["cajero", "cajera", "administrador", "administradora"].includes(lowerRole);
    const isRequester = String(payload?.data?.usuario_id || "") === String(user?.id || "");

    logger.info(`[NotificationContext] Rol detectado: ${roleName} (${lowerRole}), ?Es Cajero/Admin?: ${isCajeroOrAdmin}`);



    switch (payload.type) {
      case "new_order":
      case "new_service_request":
        if (isCajeroOrAdmin) {
          const isOrder = payload.type === "new_order";
          const id = isOrder ? payload.data.id : payload.data.id_solicitud || payload.data.id;
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Toast.show({
            type: "order",
            text1: isOrder ? "¡Nuevo Pedido!" : "Solicitud de Servicio",
            text2: isOrder ? `${payload.data.codigo} - ${payload.data.cliente}` : `ID: ${payload.data.id} - ${payload.data.descripcion || "Sin descripción"}`,
            visibilityTime: 6000,
          });

          showLocalNotification(
            isOrder ? "Nuevo Pedido" : "Solicitud de Servicio",
            isOrder ? `Pedido: ${payload.data.codigo}` : payload.data.descripcion
          );
          DeviceEventEmitter.emit("refresh_requests", payload);

          // Navegar automáticamente a solicitudes para procesar el pedido/servicio
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
          const body = `${payload.data?.nick || payload.data?.empleado || "Empleado"} solicito un anticipo por $${Number(payload.data?.monto || 0).toLocaleString("es-ES")}`;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Toast.show({
            type: "info",
            text1: "Nueva solicitud de anticipo",
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification("Nueva solicitud de anticipo", body);
          DeviceEventEmitter.emit("refresh_requests", payload);
        }
        break;

      case "anticipo_processed": {
        const approved = payload.data?.status === "approved";
        const title = approved ? "Anticipo aceptado" : "Anticipo rechazado";
        const body = `${payload.data?.nick || payload.data?.empleado || "Empleado"} - $${Number(payload.data?.monto || 0).toLocaleString("es-ES")}`;

        if (isCajero || isRequester) {
          Haptics.notificationAsync(
            approved
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning
          );
          Toast.show({
            type: approved ? "success" : "error",
            text1: title,
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification(title, body);
        }

        if (isCajero) {
          DeviceEventEmitter.emit("refresh_requests", payload);
        }

        if (isRequester) {
          DeviceEventEmitter.emit("refresh_anticipos", payload);
        }
        break;
      }

      case "anticipo_delivered":
        if (isCajero || isRequester) {
          const body = `${payload.data?.nick || payload.data?.empleado || "Empleado"} - $${Number(payload.data?.monto || 0).toLocaleString("es-ES")}`;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Toast.show({
            type: "success",
            text1: "Anticipo entregado",
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification("Anticipo entregado", body);
        }

        if (isCajero) {
          DeviceEventEmitter.emit("refresh_requests", payload);
        }

        if (isRequester) {
          DeviceEventEmitter.emit("refresh_anticipos", payload);
        }
        break;

      case "timer_started":
      case "timer_stopped":
      case "timer_resumed":
      case "timer_paused":
      case "timer_updated":
      case "room_occupied":
     
      if (payload.type === "timer_started") {
          const isAssigned = payload.data?.anfitrionas_ids?.map(Number).includes(Number(user?.id));
          if (lowerRole !== "anfitriona" || isAssigned) {
            // Toast.show({ type: "success", text1: "Temporizador Iniciado" });
          }
        } else if (payload.type === "timer_stopped") {
          const isAssigned = payload.data?.anfitrionas_ids?.map(Number).includes(Number(user?.id));
          if (lowerRole !== "anfitriona" || isAssigned) {
            // Toast.show({ type: "error", text1: "Temporizador Detenido" });
          }
        }
        break;

      case "sale_created":
      case "sale_updated":
      case "sale_cancelled":
        if (isCajeroOrAdmin) {
          Toast.show({
            type: "success",
            text1: "Venta Actualizada",
            text2: `Código: ${payload.data?.codigo || 'N/A'} - $${payload.data?.total?.toLocaleString('es-ES') || '0'}` ,
            visibilityTime: 4000,
          });
          DeviceEventEmitter.emit("refresh_sales");
          DeviceEventEmitter.emit("refresh_requests"); // Por si venía de un pedido
        }
        break;

      case "order_deleted":
      case "order_updated":
      case "service_request_approved":
      case "service_request_rejected":
        if (isCajeroOrAdmin) {
          DeviceEventEmitter.emit("refresh_requests");
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
          Toast.show({
            type: approved ? "success" : "error",
            text1: title,
            text2: body,
            visibilityTime: 5000,
          });
          showLocalNotification(title, body);
          DeviceEventEmitter.emit("refresh_requests", payload);
          if (tipo === "cuenta") {
            DeviceEventEmitter.emit("refresh_cuentas", payload);
          } else if (tipo === "venta") {
            DeviceEventEmitter.emit("refresh_sales", payload);
          }
        }
        break;

      default:
        logger.info('[NotificationContext] Evento SSE no manejado específicamente', { type: payload.type });
    }
  }, [router, showLocalNotification, user]);

  useEffect(() => {
    if (!user?.id) return;

    const sseUrl = `${API_URL}/notifications/sse`;
    logger.info('[NotificationContext] Intentando conectar SSE', { url: sseUrl });
    let es: EventSource | null = null;
    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("message", (event: any) => {
        if (!event.data) {
          logger.info('[NotificationContext] Evento SSE vacío');
          return;
        }
        try {
          const payload = JSON.parse(event.data);
          logger.info('[NotificationContext] Evento SSE recibido', { type: payload.type, id: payload.data?.id || '' });
          
          // No emitimos eventos de control para evitar bucles de refresco en dashboards
          if (payload.type !== 'connected' && payload.type !== 'ping') {
             DeviceEventEmitter.emit("sse_event", payload);
          }
          handleServerEvent(payload);
        } catch (err) {
          logger.captureException(err, { context: 'NotificationContext:parseEvent' });
        }
      });

      es.addEventListener("open", () => {
        logger.info('[NotificationContext] Conexión SSE establecida con éxito');
        setIsConnected(true);
        Toast.show({
            type: "info",
            text1: "SSE Conectado",
            text2: "Recibiendo notificaciones en tiempo real",
            visibilityTime: 2000,
        });
      });

      es.addEventListener("error", (err: any) => {
        logger.warn('[NotificationContext] Error de conexión SSE', { error: JSON.stringify(err) });
        setIsConnected(false);
      });

    } catch (err) {
       logger.captureException(err, { context: 'NotificationContext:connectSSE' });
    }

    return () => {
      if (es) {
        es.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user?.id, handleServerEvent]);

  return (
    <NotificationContext.Provider value={{ showLocalNotification, isConnected }}>
      {children}
      <Toast config={toastConfig} position="top" topOffset={60} />
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
