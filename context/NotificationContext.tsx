import Constants, { ExecutionEnvironment } from "expo-constants";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { Platform, Text, View } from "react-native";
import EventSource from "react-native-sse";
import Toast, {
  BaseToast,
  ErrorToast,
  ToastConfig,
} from "react-native-toast-message";
import { API_URL } from "../api/client";
import { PremiumAlert } from "../components/PremiumAlert";
import { useAuthStore } from "../store/authStore";
import { registerForPushNotificationsAsync } from "../utils/pushNotifications";
import { toastConfig } from "../utils/toast-config";

interface NotificationContextType {
  // Aquí podemos agregar funciones como registrar para notificaciones push si fuera necesario
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const user = useAuthStore((state) => state.user);
  const eventSourceRef = useRef<EventSource | null>(null);
  useEffect(() => {
    // Se ha desactivado la solicitud automática para evitar molestias al usuario.
    // Las notificaciones pueden activarse manualmente desde el perfil.
    /*
        const checkAndRegister = async () => {
            if (Platform.OS === 'web' || !Device.isDevice || !user) return;
            await registerForPushNotificationsAsync();
        };
        checkAndRegister();
        */
  }, [user]);

  useEffect(() => {
    // ... (resto del useEffect de SSE y configuración permanece igual)
    // En SDK 53+, las notificaciones remotas no funcionan en Expo Go (Android).
    // Usamos require dinámico para evitar el error al cargar el módulo si estamos en Expo Go.
    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

    if (isExpoGo) {
      console.warn(
        '[Notifications] Estás ejecutando en Expo Go. Las notificaciones push (remotas) de Android no son compatibles en Expo Go desde el SDK 53. Para soporte completo de notificaciones, usa un "Development Build".',
      );
    }

    const Notifications = require("expo-notifications");

    // Configuración de notificaciones locales (solo para alertas en primer plano)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Solo conectar si el usuario tiene ID
    if (!user?.id) return;

    // Conectar a SSE
    const sseUrl = `${API_URL.replace("/api", "")}/api/notifications/sse`;
    console.log("[SSE] Conectando a:", sseUrl);

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener("open", () => {
      console.log("[SSE] Conexión abierta");
    });

    es.addEventListener("message", (event: any) => {
      if (!event.data) return;
      try {
        const payload = JSON.parse(event.data);
        console.log("[SSE] Evento recibido:", payload.type);
        handleServerEvent(payload);
      } catch (err) {
        console.error("[SSE] Error parseando mensaje:", err);
      }
    });

    es.addEventListener("error", (event) => {
      console.error("[SSE] Error de conexión:", event);
    });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user?.id]);

  const handleServerEvent = (payload: any) => {
    switch (payload.type) {
      case "new_order":
        console.log("[SSE] Nuevo pedido:", payload.data);
        Toast.show({
          type: "order",
          text1: "🔔 ¡Nuevo Pedido!",
          text2: `${payload.data.codigo} - ${payload.data.cliente}`,
          visibilityTime: 6000,
          autoHide: true,
          topOffset: 50,
        });
        showLocalNotification(
          "Nuevo Pedido",
          `Se ha creado el pedido ${payload.data.codigo}`,
        );
        break;
      case "new_service_request":
        console.log("[SSE] Nueva solicitud de servicio:", payload.data);
        Toast.show({
          type: "order",
          text1: "🛎️ Solicitud de Servicio",
          text2: `ID: ${payload.data.id} - ${payload.data.descripcion || "Sin descripción"}`,
          visibilityTime: 5000,
        });
        showLocalNotification(
          "Solicitud de Servicio",
          `Nueva solicitud: ${payload.data.descripcion}`,
        );
        break;
      case "timer_started":
        Toast.show({
          type: "success",
          text1: "⏱️ Temporizador Iniciado",
          text2: `Habitación: ${payload.data.habitacion_numero || payload.data.habitacion_id}`,
        });
        break;
      case "timer_stopped":
        Toast.show({
          type: "error",
          text1: "🛑 Temporizador Detenido",
          text2: `La sesión en ${payload.data.habitacion_numero || payload.data.habitacion_id} ha finalizado.`,
        });
        break;
      case "order_updated":
        if (payload.data.estado === 0) {
          Toast.show({
            type: "success",
            text1: "Pedido Procesado",
            text2: `El pedido ${payload.data.id} ha sido completado.`,
          });
        }
        break;
      case "ping":
        // Silencioso
        break;
    }
  };

  const showLocalNotification = async (title: string, body: string) => {
    try {
      const Notifications = require("expo-notifications");
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { data: "goes here" },
        },
        trigger: null, // instantánea
      });
    } catch (err) {
      console.warn(
        "[Notifications] Error al programar notificación local:",
        err,
      );
    }
  };

  return (
    <NotificationContext.Provider value={{}}>
      {children}
      <Toast config={toastConfig} position="top" topOffset={60} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
};
