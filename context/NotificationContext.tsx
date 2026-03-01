import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
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
    switch (payload.type) {
      case "new_order":
        if (user?.role?.toLowerCase() !== "anfitriona") {
          Toast.show({
            type: "order",
            text1: "🔔 ¡Nuevo Pedido!",
            text2: `${payload.data.codigo} - ${payload.data.cliente}`,
            visibilityTime: 6000,
          });
          showLocalNotification("Nuevo Pedido", `Pedido: ${payload.data.codigo}`);
        }
        break;
      case "new_service_request":
        if (user?.role?.toLowerCase() !== "anfitriona") {
          Toast.show({
            type: "order",
            text1: "🛎️ Solicitud de Servicio",
            text2: `ID: ${payload.data.id} - ${payload.data.descripcion || "Sin descripción"}`,
            visibilityTime: 5000,
          });
          showLocalNotification("Solicitud de Servicio", payload.data.descripcion);
        }
        break;
      case "timer_started":
        const isAssignedStart = payload.data?.anfitrionas_ids?.map(Number).includes(Number(user?.id));
        if (user?.role?.toLowerCase() !== "anfitriona" || isAssignedStart) {
          const roomLabel = payload.data.habitacion_numero || payload.data.habitacion_id || payload.data.roomName || 'asignada';
          Toast.show({
            type: "success",
            text1: "⏱️ Temporizador Iniciado",
            text2: `Habitación: ${roomLabel}`,
          });
        }
        break;
      case "timer_stopped":
        const isAssignedStop = payload.data?.anfitrionas_ids?.map(Number).includes(Number(user?.id));
        if (user?.role?.toLowerCase() !== "anfitriona" || isAssignedStop) {
          const roomLabel = payload.data.habitacion_numero || payload.data.habitacion_id || payload.data.roomName || 'la habitación asignada';
          Toast.show({
            type: "error",
            text1: "🛑 Temporizador Detenido",
            text2: `Sesión finalizada en ${roomLabel}`,
          });
        }
        break;
      case "ping":
        break;
    }
  }, [showLocalNotification]);

  useEffect(() => {
    if (!user?.id) return;

    const sseUrl = `${API_URL}/notifications/sse`;
    console.log("[SSE] Conectando a:", sseUrl);

    let es: EventSource | null = null;
    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("open", () => console.log("[SSE] Conexión abierta"));
      es.addEventListener("message", (event: any) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);
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
