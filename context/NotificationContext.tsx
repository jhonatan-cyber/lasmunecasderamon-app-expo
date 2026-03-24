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
    } catch (err) {
      
    }
  }, []);

  const handleServerEvent = useCallback((payload: any) => {
    // Detección robusta del nombre del rol
    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
    const lowerRole = roleName?.toLowerCase();
    const isCajeroOrAdmin = ["cajero", "cajera", "administrador", "administradora"].includes(lowerRole);

    console.log(`[NotificationContext] 👤 Rol detectado: ${roleName} (${lowerRole}), ¿Es Cajero/Admin?: ${isCajeroOrAdmin}`);



    switch (payload.type) {
      case "new_order":
      case "new_service_request":
        if (isCajeroOrAdmin) {
          const isOrder = payload.type === "new_order";
          const id = isOrder ? payload.data.id : payload.data.id_solicitud || payload.data.id;
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Toast.show({
            type: "order",
            text1: isOrder ? "🔔 ¡Nuevo Pedido!" : "🛎️ Solicitud de Servicio",
            text2: isOrder ? `${payload.data.codigo} - ${payload.data.cliente}` : `ID: ${payload.data.id} - ${payload.data.descripcion || "Sin descripción"}`,
            visibilityTime: 6000,
            onPress: () => {
              if (id) {
                router.push({
                  pathname: "/(app)/cajero/solicitudes",
                  params: { openId: id, type: payload.type }
                } as any);
                Toast.hide();
              }
            }
          });

          showLocalNotification(
            isOrder ? "Nuevo Pedido" : "Solicitud de Servicio",
            isOrder ? `Pedido: ${payload.data.codigo}` : payload.data.descripcion
          );
          DeviceEventEmitter.emit("refresh_requests", payload);
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
            const roomLabel = payload.data.habitacion_numero || payload.data.habitacion_id || payload.data.roomName || 'asignada';
            // Toast.show({ type: "success", text1: "⏱️ Temporizador Iniciado", text2: `Habitación: ${roomLabel}` });
          }
        } else if (payload.type === "timer_stopped") {
          const isAssigned = payload.data?.anfitrionas_ids?.map(Number).includes(Number(user?.id));
          if (lowerRole !== "anfitriona" || isAssigned) {
            const roomLabel = payload.data.habitacion_numero || payload.data.habitacion_id || payload.data.roomName || 'asignada';
            // Toast.show({ type: "error", text1: "🛑 Temporizador Detenido", text2: `Sesión finalizada en ${roomLabel}` });
          }
        }
        break;

      case "sale_created":
      case "sale_updated":
      case "sale_cancelled":
        if (isCajeroOrAdmin) {
          Toast.show({
            type: "success",
            text1: "💰 Venta Actualizada",
            text2: `Código: ${payload.data?.codigo || 'N/A'} - $${payload.data?.total?.toLocaleString('es-ES') || '0'}`,
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
      case "room_occupied":
        if (isCajeroOrAdmin) {
          DeviceEventEmitter.emit("refresh_requests");
        }
        break;

      case "ping":
        break;

      default:
        console.log('[NotificationContext] ℹ️ Evento SSE no manejado específicamente:', payload.type);
    }
  }, [showLocalNotification, user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id) return;

    const sseUrl = `${API_URL}/notifications/sse`;
    console.log('[NotificationContext] 🚀 Intentando conectar SSE a:', sseUrl);
    let es: EventSource | null = null;
    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("message", (event: any) => {
        if (!event.data) {
          console.log('[NotificationContext] ⚠️ Evento SSE vacío');
          return;
        }
        try {
          const payload = JSON.parse(event.data);
          console.log('[NotificationContext] 🔔 Evento SSE recibido:', payload.type, payload.data?.id || '');
          
          // No emitimos eventos de control para evitar bucles de refresco en dashboards
          if (payload.type !== 'connected' && payload.type !== 'ping') {
             DeviceEventEmitter.emit("sse_event", payload);
          }
          handleServerEvent(payload);
        } catch (err) {
          console.error('[NotificationContext] ❌ Error parseando datos SSE:', err);
        }
      });

      es.addEventListener("open", () => {
        console.log('[NotificationContext] ✅ Conexión SSE establecida con éxito');
        setIsConnected(true);
        Toast.show({
            type: "info",
            text1: "SSE Conectado",
            text2: "Recibiendo notificaciones en tiempo real",
            visibilityTime: 2000,
        });
      });

      es.addEventListener("error", (err: any) => {
        console.error('[NotificationContext] ❌ Error de conexión SSE:', JSON.stringify(err));
        setIsConnected(false);
      });

    } catch (err) {
       console.error('[NotificationContext] ❌ Error fatal al crear EventSource:', err);
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

