import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  PROD_API_BASE_URL,
  API_PREFIX,
  WEB_PORT,
} from "@lasmunecasderamon/config";
import logger from "@/utils/logger";

const resolveDevBaseUrl = (): string => {
  if (Platform.OS === "web") {
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `http://${hostname}:${WEB_PORT}`;
  }

  const hostCandidates = [
    (Constants as any)?.expoConfig?.hostUri,
    (Constants as any)?.expoGoConfig?.debuggerHost,
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any)?.manifest?.debuggerHost,
    (Constants as any)?.manifest?.hostUri,
    (Constants as any)?.linkingUri,
  ].filter(Boolean) as string[];

  const extractHost = (value: string) => {
    const normalized = value.replace(/^[a-zA-Z]+:\/\//, "");
    return normalized.split("/")[0]?.split(":")[0];
  };

  const localIP = hostCandidates.map(extractHost).find(Boolean);

  if (localIP) {
    return `http://${localIP}:${WEB_PORT}`;
  }

  return `http://localhost:${WEB_PORT}`;
};

export const resolveBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!__DEV__) {
    return envUrl || PROD_API_BASE_URL;
  }

  if (envUrl) {
    return envUrl;
  }

  return resolveDevBaseUrl();
};

export const BASE_URL = resolveBaseUrl();
export const API_URL = `${BASE_URL}${API_PREFIX}`;

if (__DEV__) {
  logger.debug("API base URL", { baseUrl: BASE_URL, apiUrl: API_URL });
}
