import { API_URL } from "./base-url";
import { TokenStorage } from "@/utils/tokenStorage";
import logger from "@/utils/logger";
import { attachHttpDetails, InvalidResponseError, NetworkError, TimeoutError } from './errors';

let tokenInMemory: string | null = null;
let onUnauthorized: (() => void) | null = null;
let onForbidden: (() => void) | null = null;
let onSessionConfirmed: (() => void) | null = null;
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export function setTokenInMemory(token: string | null) {
  tokenInMemory = token;
}

export function getTokenInMemory(): string | null {
  return tokenInMemory;
}

export async function ensureTokenInMemory(): Promise<string | null> {
  if (!tokenInMemory) {
    tokenInMemory = await TokenStorage.getToken();
  }

  return tokenInMemory;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function notifyUnauthorized() {
  onUnauthorized?.();
}

/**
 * Callback para 403 (autenticado pero sin permiso): suele ser rol revocado
 * o borrado. No implica renovar el token, sino revalidar la sesión contra
 * /auth/me (lo registra el authStore).
 */
export function setForbiddenHandler(handler: () => void) {
  onForbidden = handler;
}

export function notifyForbidden() {
  onForbidden?.();
}

/**
 * Callback que se dispara cuando el servidor **aceptó** una petición
 * autenticada. Es la señal de que la sesión sigue viva, así que reinicia la
 * ventana de gracia offline (`utils/offlineSession`).
 */
export function setSessionConfirmedHandler(handler: () => void) {
  onSessionConfirmed = handler;
}

export function notifySessionConfirmed() {
  onSessionConfirmed?.();
}

/**
 * Intenta renovar el access token usando el refresh token almacenado.
 * Usa un mutex para evitar múltiples refresh simultáneos.
 * Retorna false si no hay sesión renovable o el servidor la rechazó.
 * Los fallos temporales lanzan un error y conservan las credenciales.
 */
export async function refreshAccessToken(): Promise<boolean> {
  // Si ya hay un refresh en curso, esperar a que termine
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const storedRefreshToken = await TokenStorage.getRefreshToken();
      if (!storedRefreshToken) {
        // Estado normal sin sesión (instalación fresca / logout): no es un
        // warning. Se loguea en debug para no disparar la caja amarilla de Expo.
        logger.debug('[refreshAccessToken] No hay refresh token almacenado');
        return false;
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-refresh-token': storedRefreshToken
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Sesión expirada/revocada: flujo esperado, no warning (evita la
          // caja amarilla de Expo al abrir la app sin sesión válida).
          logger.debug('[refreshAccessToken] Sesión no renovable', {
            status: response.status
          });
          await TokenStorage.removeTokens();
          tokenInMemory = null;
          return false;
        }
        throw attachHttpDetails(new NetworkError('No se pudo renovar la sesión. Intenta nuevamente.'), {
          status: response.status, body: null
        });
      }

      const data = await response.json();
      if (data?.success === true && typeof data.token === 'string' && data.token.length > 0) {
        // Guardar nuevo access token
        tokenInMemory = data.token;
        await TokenStorage.saveToken(data.token);

        // Si el servidor devolvió un nuevo refresh token (rotation), guardarlo
        if (data.refreshToken) {
          await TokenStorage.saveRefreshToken(data.refreshToken);
        }

        logger.info('[refreshAccessToken] Token renovado exitosamente');
        return true;
      }

      logger.warn('[refreshAccessToken] Respuesta inválida del servidor');
      throw new InvalidResponseError('El servidor devolvió una respuesta inválida al renovar la sesión.');
    } catch (error) {
      logger.captureException(error, {
        context: 'refreshAccessToken'
      });
      if ((error as Error)?.name === 'AbortError') throw new TimeoutError();
      if (error instanceof SyntaxError) throw new InvalidResponseError();
      if (error instanceof TypeError) throw new NetworkError();
      throw error;
    } finally {
      clearTimeout(timeoutId);
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
