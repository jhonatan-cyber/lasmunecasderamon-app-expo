import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { DeviceEventEmitter } from "react-native";
import EventSource from "react-native-sse";
import Toast from "react-native-toast-message";
import { API_URL } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { toastConfig } from "../utils/toast-config";

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
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = useAuthStore((state) => state.user);
  const eventSourceRef = useRef<EventSource | null>(null);

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
      console.warn("[Notifications] Error:", err);
    }
  }, []);

  const handleServerEvent = useCallback((payload: any) => {
    // Detección robusta del nombre del rol
    const roleName = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
    const lowerRole = roleName?.toLowerCase();
    const isCajeroOrAdmin = lowerRole === "cajero" || lowerRole === "administrador";

    console.log(`[SSE] Evento '${payload.type}' recibido para rol: ${lowerRole}`);

    switch (payload.type) {
      case "new_order":
      case "new_service_request":
        if (lowerRole !== "anfitriona") {
          const isOrder = payload.type === "new_order";
          Toast.show({
            type: "order",
            text1: isOrder ? "🔔 ¡Nuevo Pedido!" : "🛎️ Solicitud de Servicio",
            text2: isOrder ? `${payload.data.codigo} - ${payload.data.cliente}` : `ID: ${payload.data.id} - ${payload.data.descripcion || "Sin descripción"}`,
            visibilityTime: 6000,
          });
          showLocalNotification(
            isOrder ? "Nuevo Pedido" : "Solicitud de Servicio",
            isOrder ? `Pedido: ${payload.data.codigo}` : payload.data.descripcion
          );
          DeviceEventEmitter.emit("refresh_requests");
        }
        break;

      case "timer_started":
      case "timer_stopped":
      case "timer_resumed":
      case "timer_paused":
      case "timer_updated":
      case "room_occupied":
        // NOTA: No emitimos refresh_sales aquí para evitar duplicación, 
        // ya que TimerContext.tsx se encarga de emitir refresh_sales con los metadatos necesarios
        // para mostrar los modales de notificación al cajero.

        // Mantener lógica de avisos visuales sutiles (Toasts)
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
        if (isCajeroOrAdmin) {
          DeviceEventEmitter.emit("refresh_requests");
        }
        break;

      case "ping":
        break;
    }
  }, [showLocalNotification, user]);

  useEffect(() => {
    if (!user?.id) return;

    const sseUrl = `${API_URL}/notifications/sse`;
    let es: EventSource | null = null;
    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("open", () => console.log("[SSE] Conexión abierta"));
      es.addEventListener("message", (event: any) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);
          DeviceEventEmitter.emit("sse_event", payload);
          handleServerEvent(payload);
        } catch (err) {
          console.error("[SSE] Parse error:", err);
        }
      });
      es.addEventListener("error", (event: any) => console.error("[SSE] Error:", event));
    } catch (err) {
      console.error("[SSE] Init error:", err);
    }

    return () => {
      if (es) {
        es.close();
        eventSourceRef.current = null;
      }
    };
  }, [user?.id, handleServerEvent]);

  return (
    <NotificationContext.Provider value={{ showLocalNotification }}>
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
