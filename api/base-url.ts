import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  PROD_API_BASE_URL,
  API_PREFIX,
  WEB_PORT,
} from "@lasmunecasderamon/config";
import logger from "@/utils/logger";

/**
 * URL base de la API. En desarrollo el host correcto depende de quién corre la
 * app: `localhost` sirve en web y en el simulador de iOS, pero en un emulador
 * Android (o un teléfono) es el propio dispositivo. Por eso el host se resuelve
 * en tiempo de ejecución a partir del dev server de Metro, en vez de quedar
 * clavado en `EXPO_PUBLIC_API_BASE_URL` del `.env`.
 */

/** Hosts que, vistos desde el dispositivo, son el propio dispositivo. */
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"];

/** Alias del emulador de Android (AVD de Android Studio) hacia la máquina host. */
const ANDROID_EMULATOR_HOST = "10.0.2.2";

export const isLoopbackHost = (hostname: string): boolean =>
  LOOPBACK_HOSTS.includes(hostname.trim().toLowerCase());

/** Quita el esquema y todo lo que sigue al host, sin depender de `URL`. */
const authorityOf = (value: string): string =>
  value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0] ?? "";

/** Separa host y puerto de una URL base; sin puerto explícito devuelve `null`. */
export const parseBaseUrl = (value: string): { host: string; port: string | null } => {
  const [host, port] = authorityOf(value).split(":");
  return { host: host ?? "", port: port || null };
};

/**
 * Host por el que *este* dispositivo alcanza la API de desarrollo. Puro y con
 * las pistas inyectadas para poder probar cada caso sin device real:
 *
 * - web: el mismo host que sirvió la app.
 * - emulador o teléfono: la IP del dev server (Metro), que por definición le llega.
 * - sin pista, o con el dev server en loopback: el alias del emulador Android
 *   (`adb reverse tcp:3000 tcp:3000` es la alternativa en un teléfono por USB).
 */
export const pickDevHost = ({
  platform,
  devServerHost,
  webHostname,
}: {
  platform: string;
  devServerHost?: string | null;
  webHostname?: string | null;
}): string => {
  if (platform === "web") return webHostname || "localhost";
  if (devServerHost && !isLoopbackHost(devServerHost)) return devServerHost;
  return platform === "android" ? ANDROID_EMULATOR_HOST : "localhost";
};

/** Decide la URL base de la API para el entorno actual. */
export const pickBaseUrl = ({
  isDev,
  envUrl,
  platform,
  devServerHost,
  webHostname,
}: {
  isDev: boolean;
  envUrl?: string | null;
  platform: string;
  devServerHost?: string | null;
  webHostname?: string | null;
}): string => {
  const configured = envUrl?.trim();

  if (!isDev) return configured || PROD_API_BASE_URL;

  // Un host que no es loopback apunta a otro lado a propósito (staging, otra
  // máquina de la red): se respeta tal cual, con su puerto.
  if (configured && !isLoopbackHost(parseBaseUrl(configured).host)) return configured;

  // Con loopback sólo se cambia el host: se conserva el puerto configurado, que
  // es donde escucha la API (`WEB_PORT` si el `.env` no lo dice).
  const port = (configured && parseBaseUrl(configured).port) || WEB_PORT;
  const host = pickDevHost({ platform, devServerHost, webHostname });

  return `http://${host}:${port}`;
};

/** Host del dev server tal como lo ve el dispositivo, o `null` si no hay pista. */
const currentDevServerHost = (): string | null => {
  const hostCandidates = [
    (Constants as any)?.expoConfig?.hostUri,
    (Constants as any)?.expoGoConfig?.debuggerHost,
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any)?.manifest?.debuggerHost,
    (Constants as any)?.manifest?.hostUri,
    (Constants as any)?.linkingUri,
  ].filter(Boolean) as string[];

  return hostCandidates.map((value) => authorityOf(value).split(":")[0] ?? "").find(Boolean) ?? null;
};

export const resolveBaseUrl = (): string =>
  pickBaseUrl({
    isDev: __DEV__,
    envUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    platform: Platform.OS,
    devServerHost: currentDevServerHost(),
    webHostname: typeof window !== "undefined" ? window.location.hostname : null,
  });

export const BASE_URL = resolveBaseUrl();
export const API_URL = `${BASE_URL}${API_PREFIX}`;

if (__DEV__) {
  logger.debug("API base URL", { baseUrl: BASE_URL, apiUrl: API_URL });
}
