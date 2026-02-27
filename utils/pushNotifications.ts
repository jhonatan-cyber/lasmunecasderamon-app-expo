import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { apiClient } from "../api/client";

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (Platform.OS === "web") {
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
      console.error('❌ Error: No se encontró "projectId" en app.json');
      console.warn(
        "Para usar notificaciones push de Expo, debes:\n1. Iniciar sesión en expo: npx expo login\n2. Inicializar el proyecto EAS: npx eas project:init\n3. Esto agregará un projectId a tu app.json",
      );
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
      lightColor: "#8B5CF6",
    });
  }

  return token;
}

async function saveTokenToServer(token: string) {
  try {
    const response = await apiClient("/notifications/register-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    });

    if (response.success) {
      console.log("✅ Push token registrado en el servidor");
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
) {
  try {
    // 1. Respuesta táctica (Vibración)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // 2. Si el usuario es Cajero, leer la notificación en voz alta (TTS)
    const roleLower = (role || "").toLowerCase();
    if (roleLower === "cajero" || roleLower === "administrador") {
      const textToSpeak = `${title}. ${body}`;
      Speech.speak(textToSpeak, {
        language: "es-US",
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
