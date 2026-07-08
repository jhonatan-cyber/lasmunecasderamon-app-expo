import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import { Platform, Vibration } from "react-native";
import { apiClientSafe } from '@/api/client-safe';

import logger from '@/utils/logger';

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

    const constants = Constants as unknown as ConstantsWithExpoConfig;
    const projectId =
      constants.expoConfig?.extra?.eas?.projectId ||
      constants.easConfig?.projectId;

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
      logger.captureException(e, { context: 'PushNotifications:getPushToken' });
    }
  } else {
    logger.info("Se debe usar un dispositivo físico para notificaciones push");
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
    if (roleLower === "cajero" || roleLower === "administrador" || roleLower === "garzon") {
      const textToSpeak = `${title}. ${body}`;
      Speech.speak(textToSpeak, {
        language: "es-ES", 
        pitch: 1.0,
        rate: 0.9,
      });
    }
  } catch (error) {
    logger.captureException(error, { context: 'PushNotifications:roleLower' });
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

