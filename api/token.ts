import { API_URL } from "./base-url";
import { TokenStorage } from "@/utils/tokenStorage";
import logger from "@/utils/logger";

let tokenInMemory: string | null = null;
let onUnauthorized: (() => void) | null = null;
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
 * Intenta renovar el access token usando el refresh token almacenado.
 * Usa un mutex para evitar múltiples refresh simultáneos.
 * Retorna true si se renovó exitosamente, false si falló.
 */
export async function refreshAccessToken(): Promise<boolean> {
  // Si ya hay un refresh en curso, esperar a que termine
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const storedRefreshToken = await TokenStorage.getRefreshToken();
      if (!storedRefreshToken) {
        logger.warn('[refreshAccessToken] No hay refresh token almacenado');
        return false;
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-refresh-token': storedRefreshToken
        }
      });

      if (!response.ok) {
        logger.warn('[refreshAccessToken] Error al refrescar token', {
          status: response.status
        });
        await TokenStorage.removeTokens();
        return false;
      }

      const data = await response.json();
      if (data.success && data.token) {
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
      await TokenStorage.removeTokens();
      return false;
    } catch (error) {
      logger.captureException(error, {
        context: 'refreshAccessToken'
      });
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
