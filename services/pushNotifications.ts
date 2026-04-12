import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import { Platform, Vibration } from "react-native";
import { apiClient } from "@/api/client";

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  // En Expo Go (appOwnership === 'expo') las push remotas ya no están soportadas.
  const isExpoGo = Constants.appOwnership === "expo";

  if (Platform.OS === "web" || isExpoGo) {
   
    return null;
  }

  let token: string | null = null;

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const projectId =
      (Constants as any).expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    if (!projectId) {
      
      return null;
    }

    try {
      const expoToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = expoToken.data;
      if (token) {
        await saveTokenToServer(token);
      }
    } catch (e) {
      console.error("❌ Error obteniendo push token:", e);
    }
  } else {
    console.log("Se debe usar un dispositivo físico para notificaciones push");
  }

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#E11D48",
    });
  }

  return token;
}

async function saveTokenToServer(token: string) {
  try {
    const response = await apiClient("/notifications", {
      method: "POST",
      body: JSON.stringify({
        token,
        deviceType: Platform.OS,
      }),
    });

    if (response.success) {
      
    } else {
      console.error("❌ Error registrando push token:", response.message);
    }
  } catch (error) {
    console.error("❌ Error de red registrando push token:", error);
  }
}

/**
 * Dispara efectos visuales, táctiles y sonoros (TTS) según el tipo de notificación
 */
export async function triggerNotificationEffects(
  title: string,
  body: string,
  role?: string,
  isPriority: boolean = false
) {
  try {
    // 1. Respuesta táctica (Vibración)
    if (isPriority) {
      // Patrón agresivo para llamados: vibrar 500ms, pausa 200ms, vibrar 500ms...
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // 2. Si el usuario es Staff, leer la notificación en voz alta (TTS)
    const roleLower = (role || "").toLowerCase();
    if (roleLower === "cajero" || roleLower === "administrador" || roleLower === "garzon") {
      const textToSpeak = `${title}. ${body}`;
      Speech.speak(textToSpeak, {
        language: "es-ES", // Cambiado a es-ES para mejor acento local si está disponible
        pitch: 1.0,
        rate: 0.9,
      });
    }
  } catch (error) {
    console.error("[NOTIF EFFECTS] Error:", error);
  }
}

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async (_notification: Notifications.Notification) => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

