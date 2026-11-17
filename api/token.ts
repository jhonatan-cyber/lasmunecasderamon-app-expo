import { API_URL } from "./base-url";
import { TokenStorage } from "@/utils/tokenStorage";
import logger from "@/utils/logger";
import { attachHttpDetails, InvalidResponseError, NetworkError, TimeoutError } from './errors';

// Cada instancia de la app (web/móvil) tiene su propio token en storage.
// En desarrollo con Metro, web y móvil comparten el mismo proceso JS,
// por lo que una variable global se compartiría entre instancias.
// Para evitarlo, siempre leemos del storage que es específico por plataforma.
// Los handlers usan Sets para soportar múltiples suscriptores (una por instancia).
let onUnauthorizedHandlers: Set<() => void> = new Set();
let onForbiddenHandlers: Set<() => void> = new Set();
let onSessionConfirmedHandlers: Set<() => void> = new Set();
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export function setTokenInMemory(_token: string | null) {
  // No-op: ya no cacheamos en memoria para evitar compartir token entre
  // instancias en desarrollo. El token se lee directamente del storage.
}

export async function getTokenInMemoryAsync(): Promise<string | null> {
  // Lee el token del storage para evitar compartir entre instancias en desarrollo.
  return TokenStorage.getToken();
}

export function getTokenInMemory(): string | null {
  // Sincrono: devuelve null para forzar a los llamadores a usar la versión async.
  // Los llamadores sincronicos se actualizaron para usar getTokenInMemoryAsync.
  return null;
}

export async function ensureTokenInMemory(): Promise<string | null> {
  // Siempre leemos del storage para evitar compartir token entre instancias
  // en desarrollo (web y móvil comparten el mismo proceso Metro).
  return TokenStorage.getToken();
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorizedHandlers.add(handler);
  // Retorna una función para remover el handler (útil para cleanup)
  return () => onUnauthorizedHandlers.delete(handler);
}

export function notifyUnauthorized() {
  onUnauthorizedHandlers.forEach(h => h());
}

/**
 * Callback para 403 (autenticado pero sin permiso): suele ser rol revocado
 * o borrado. No implica renovar el token, sino revalidar la sesión contra
 * /auth/me (lo registra el authStore).
 */
export function setForbiddenHandler(handler: () => void) {
  onForbiddenHandlers.add(handler);
  return () => onForbiddenHandlers.delete(handler);
}

export function notifyForbidden() {
  onForbiddenHandlers.forEach(h => h());
}

/**
 * Callback que se dispara cuando el servidor **aceptó** una petición
 * autenticada. Es la señal de que la sesión sigue viva, así que reinicia la
 * ventana de gracia offline (`utils/offlineSession`).
 */
export function setSessionConfirmedHandler(handler: () => void) {
  onSessionConfirmedHandlers.add(handler);
  return () => onSessionConfirmedHandlers.delete(handler);
}

export function notifySessionConfirmed() {
  onSessionConfirmedHandlers.forEach(h => h());
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
          return false;
        }
        throw attachHttpDetails(new NetworkError('No se pudo renovar la sesión. Intenta nuevamente.'), {
          status: response.status, body: null
        });
      }

      const data = await response.json();
      if (data?.success === true && typeof data.token === 'string' && data.token.length > 0) {
        // Guardar nuevo access token en storage (no en memoria para evitar
        // compartir entre instancias en desarrollo).
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
