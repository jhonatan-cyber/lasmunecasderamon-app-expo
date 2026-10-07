import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import type * as NotificationsType from "expo-notifications";
import * as Speech from "expo-speech";
import { Platform, Vibration } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClientSafe } from '@/api/client-safe';

import logger from '@/utils/logger';

/** Preferencia de alertas por voz (TTS). Default true = comportamiento actual. */
const VOICE_ALERTS_KEY = 'voice_alerts_enabled';

export async function isVoiceAlertsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(VOICE_ALERTS_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export async function setVoiceAlertsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(VOICE_ALERTS_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    logger.fetchError(e, { context: 'PushNotifications:setVoiceAlerts' });
  }
}

// ─── Expo Go safe-load ─────────────────────────────────────────────
// Desde SDK 53, `expo-notifications` (push remoto Android) fue eliminado de
// Expo Go: el simple `import "expo-notifications"` lanza Uncaught Error.
// Por eso NO hay import estático: se carga con require() perezoso dentro
// de try/catch, y en Expo Go / web se devuelve null (push desactivado,
// la app sigue funcionando con SSE + toast + voz).
type NotificationsModule = typeof NotificationsType;

let cachedNotifications: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (cachedNotifications !== undefined) return cachedNotifications;

  try {
    if (Platform.OS === "web") {
      cachedNotifications = null;
      return null;
    }
    if (Constants.appOwnership === "expo") {
      cachedNotifications = null;
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-notifications") as NotificationsModule & { default?: NotificationsModule };
    cachedNotifications = mod?.default ?? mod ?? null;
    return cachedNotifications;
  } catch {
    cachedNotifications = null;
    return null;
  }
}

export function isPushAvailable(): boolean {
  return getNotifications() != null;
}

/** Expo Constants extended with runtime app config fields not in the published types */
interface ConstantsWithExpoConfig {
  appOwnership: string | null;
  easConfig?: { projectId?: string };
  expoConfig?: {
    extra?: {
      eas?: {
        projectId?: string;
      };
    };
  };
}
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {

  const isExpoGo = Constants.appOwnership === "expo";

  if (Platform.OS === "web" || isExpoGo) {

    return null;
  }

  const N = getNotifications();
  if (!N) return null;

  let token: string | null = null;

  if (Device.isDevice) {
    const { status: existingStatus } =
      await N.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const constants = Constants as unknown as ConstantsWithExpoConfig;
    const projectId =
      constants.expoConfig?.extra?.eas?.projectId ||
      constants.easConfig?.projectId;

    if (!projectId) {

      return null;
    }

    try {
      const expoToken = await N.getExpoPushTokenAsync({
        projectId,
      });
      token = expoToken.data;
      if (token) {
        await saveTokenToServer(token);
      }
    } catch (e) {
      logger.captureException(e, { context: 'PushNotifications:getPushToken' });
    }
  } else {
    logger.info("Se debe usar un dispositivo físico para notificaciones push");
  }

  if (Platform.OS === "android") {
    try {
      await N.setNotificationChannelAsync("default", {
        name: "default",
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#E11D48",
      });
    } catch (e) {
      logger.debug("[PushNotifications] No se pudo crear canal Android", { e });
    }
  }

  return token;
}

async function saveTokenToServer(token: string) {
  try {
    const response = await apiClientSafe("/notifications", {
      method: "POST",
      body: JSON.stringify({
        token,
        deviceType: Platform.OS,
      }),
    });

    if (response.success) {
      
    } else {
      logger.error("❌ Error registrando push token:", { message: response.message });
    }
  } catch (error) {
    logger.captureException(error, { context: 'PushNotifications:saveToken' });
  }
}


export async function triggerNotificationEffects(
  title: string,
  body: string,
  role?: string,
  isPriority: boolean = false
) {
  try {
    
    if (isPriority) {
      
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    
    const roleLower = (role || "").toLowerCase();
    if (roleLower === "cajero" || roleLower === "administrador" || roleLower === "garzon" || roleLower === "barman") {
      // TTS con opt-out por usuario (perfil → "Alertas por voz"): evita PII
      // en voz alta donde no se quiere. Default activado (comportamiento actual).
      if (await isVoiceAlertsEnabled()) {
        const textToSpeak = `${title}. ${body}`;
        Speech.speak(textToSpeak, {
          language: "es-ES",
          pitch: 1.0,
          rate: 0.9,
        });
      }
    }
  } catch (error) {
    logger.captureException(error, { context: 'PushNotifications:roleLower' });
  }
}

export function configureNotifications() {
  const N = getNotifications();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async (_notification: NotificationsType.Notification) => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    logger.debug("[PushNotifications] configureNotifications omitido (Expo Go)", { e });
  }
}

export async function scheduleLocalNotificationAsync(
  title: string,
  body: string,
): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: { title, body, data: { data: "local" } },
      trigger: null,
    });
  } catch {
    // Expo Go / sin soporte: no-op, el toast/SSE ya avisa.
  }
}

export function addNotificationReceivedListener(
  cb: (n: NotificationsType.Notification) => void,
): { remove: () => void } | null {
  const N = getNotifications();
  if (!N) return null;
  try {
    return N.addNotificationReceivedListener(cb);
  } catch {
    return null;
  }
}

export function addNotificationResponseReceivedListener(
  cb: (r: NotificationsType.NotificationResponse) => void,
): { remove: () => void } | null {
  const N = getNotifications();
  if (!N) return null;
  try {
    return N.addNotificationResponseReceivedListener(cb);
  } catch {
    return null;
  }
}

