import type { ApiRes } from "@/types/api";
import { createQueueId } from "@/utils/ids";
import logger from "@/utils/logger";
import { API_URL } from "./base-url";
import {
  attachHttpDetails,
  InvalidResponseError,
  NetworkError,
  RetryExhaustedError,
  TimeoutError,
  UnauthorizedError,
} from "./errors";
import { delay, shouldRetry } from "./retry";
import {
  ensureTokenInMemory,
  getTokenInMemory,
  notifyForbidden,
  notifySessionConfirmed,
  notifyUnauthorized,
  refreshAccessToken
} from "./token";

/**
 * Combina un AbortSignal externo con un controller interno.
 * Cuando cualquiera de los dos se aborta, el combinedSignal también se aborta.
 */
function combineSignals(
  externalSignal: AbortSignal | null | undefined,
  internalController: AbortController,
): { signal: AbortSignal; cleanup: () => void } {
  if (!externalSignal) {
    return { signal: internalController.signal, cleanup: () => {} };
  }

  // Si el external ya está abortado, abortamos el interno inmediatamente
  if (externalSignal.aborted) {
    internalController.abort();
    return { signal: internalController.signal, cleanup: () => {} };
  }

  const onExternalAbort = () => internalController.abort();

  externalSignal.addEventListener('abort', onExternalAbort, { once: true });

  return {
    signal: internalController.signal,
    cleanup: () => {
      externalSignal.removeEventListener('abort', onExternalAbort);
    },
  };
}
const logApiCall = (
  endpoint: string,
  attempt: number,
  maxRetries: number,
  status?: number,
  error?: any,
  durationMs?: number,
) => {
  const logEntry = {
    endpoint,
    url: `${API_URL}${endpoint}`,
    attempt: attempt + 1,
    maxRetries: maxRetries + 1,
    status,
    error: error
      ? {
          message: error.message,
          code: error.code,
          name: error.name,
          type: error.type,
          stack: error.stack,
        }
      : undefined,
    durationMs,
  };

  logger.debug("API call", logEntry);
};

export const apiClient = async <T = ApiRes<unknown>>(
  endpoint: string,
  options: RequestInit & { timeout?: number; retries?: number } = {},
): Promise<T> => {
  const defaultRetries = __DEV__ ? 1 : 3;
  const {
    timeout: customTimeout,
    retries: maxRetries = defaultRetries,
    ...fetchOptions
  } = options;
  const url = `${API_URL}${endpoint}`;
  logger.debug("API request", { url, endpoint });
  const headers = new Headers(fetchOptions.headers || {});
  const isFormData =
    fetchOptions.body &&
    typeof fetchOptions.body === "object" &&
    typeof (fetchOptions.body as any).append === "function";

  if (!headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const tokenInMemory = await ensureTokenInMemory();

  if (tokenInMemory) {
    headers.set("Authorization", `Bearer ${tokenInMemory}`);
    logger.debug("API token loaded", { hasToken: true });
  } else {
    logger.debug("API token loaded", { hasToken: false });
  }

  // Idempotencia global: todo POST/PUT/PATCH lleva x-idempotency-key estable
  // durante sus reintentos. Si el timeout deja la respuesta en el aire y el
  // retry reenvía, el servidor deduplica en vez de cobrar dos veces. No se
  // pisa una clave ya puesta (outbox pone la suya por intención).
  // FormData queda fuera: el upload con reintento lo gestiona su propio flujo.
  if (
    ["POST", "PUT", "PATCH"].includes(fetchOptions.method?.toUpperCase() || "") &&
    !isFormData &&
    !headers.has("x-idempotency-key")
  ) {
    headers.set("x-idempotency-key", createQueueId());
  }

  let finalBody = fetchOptions.body;
  if (
    ["POST", "PUT", "PATCH"].includes(options.method?.toUpperCase() || "") &&
    typeof fetchOptions.body === "string"
  ) {
    try {
      const bodyObj = JSON.parse(fetchOptions.body);

      if (
        typeof bodyObj === "object" &&
        bodyObj !== null &&
        !bodyObj.device_date
      ) {
        bodyObj.device_date = new Date().toISOString();
        finalBody = JSON.stringify(bodyObj);
      }
    } catch {}
  }

  const config: RequestInit = {
    ...fetchOptions,
    body: finalBody,
    headers,
  };

  let lastError: any = null;
  let sessionRetried = false;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      customTimeout ?? 10000,
    );

    // Combinar signal externo (de AbortController del hook) con timeout interno
    const { signal: combinedSignal, cleanup: cleanupSignals } = combineSignals(
      (config as any).signal,
      controller,
    );

    try {
      const response = await fetch(url, {
        ...config,
        signal: combinedSignal,
      });
      const durationMs = Date.now() - startTime;

      const data = response.status === 204 ? {} : await response.json().catch((error: unknown) => {
        if ((error as Error)?.name === 'AbortError') throw error;
        if (response.ok) throw new InvalidResponseError();
        return {};
      });
      clearTimeout(timeoutId);
      cleanupSignals();

      if (response.status === 401) {
        // Intentar refresh token automático (excepto para el propio endpoint de refresh)
        if (!sessionRetried && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
          const currentToken = getTokenInMemory();
          const refreshed = (currentToken && headers.get('Authorization') !== `Bearer ${currentToken}`)
            || await refreshAccessToken();
          if (refreshed) {
            sessionRetried = true;
            // Token renovado — actualizar header y reintentar
            headers.set('Authorization', `Bearer ${getTokenInMemory()}`);
            config.headers = headers;
            logApiCall(endpoint, attempt, maxRetries, response.status, undefined, durationMs);
            // El reenvío de sesión tiene su propio presupuesto, incluso con retries=0.
            attempt--;
            continue;
          }
        }

        notifyUnauthorized();
        logApiCall(
          endpoint,
          attempt,
          maxRetries,
          response.status,
          undefined,
          durationMs,
        );
        throw new UnauthorizedError(
          data.error || data.message || "Sesión inválida o expirada",
        );
      }

      if (response.status === 403) {
        // Autenticado pero sin permiso: no es un token vencido (no se reintenta
        // ni se renueva), suele ser rol revocado/borrado. Se avisa para que el
        // authStore revalide la sesión contra /auth/me.
        logApiCall(endpoint, attempt, maxRetries, response.status, undefined, durationMs);
        notifyForbidden();
        const serverMessage =
          data.message || data.error || "Sin permiso para esta acción";
        throw attachHttpDetails(new Error(serverMessage), {
          status: response.status,
          body: data,
        });
      }

      if (!response.ok) {
        if (!shouldRetry(null, response.status) || attempt === maxRetries) {
          logApiCall(
            endpoint,
            attempt,
            maxRetries,
            response.status,
            undefined,
            durationMs,
          );

          const serverMessage =
            data.message || data.error || `Error ${response.status}`;
          // El status y el cuerpo viajan con el error: `message` suele ser el
          // genérico ("Error de validación") y el motivo útil está adentro.
          throw attachHttpDetails(new Error(serverMessage), {
            status: response.status,
            body: data,
          });
        }
        lastError = new Error(
          data.error || data.message || "Error en la petición API",
        );
        logApiCall(
          endpoint,
          attempt,
          maxRetries,
          response.status,
          lastError,
          durationMs,
        );
        if (attempt < maxRetries) {
          await delay(500);
          continue;
        }
      }

      logApiCall(
        endpoint,
        attempt,
        maxRetries,
        response.status,
        undefined,
        durationMs,
      );
      // Respuesta 2xx: el servidor reconoció la sesión. Es lo que reinicia la
      // ventana de gracia del modo offline (no el mero paso del tiempo).
      notifySessionConfirmed();
      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      cleanupSignals();
      const durationMs = Date.now() - startTime;
      lastError = err;

      if (!shouldRetry(err) || attempt === maxRetries) {
        logApiCall(endpoint, attempt, maxRetries, undefined, err, durationMs);
        if (err?.name === "AbortError") throw new TimeoutError();

        if (
          err instanceof UnauthorizedError ||
          err instanceof TimeoutError ||
          err instanceof NetworkError
        )
          throw err;
        if (!err.type || err.type === "fetch-failed") {
          if (err.message && !err.message.toLowerCase().includes("fetch")) {
            throw err;
          }
          throw new NetworkError();
        }
        throw err;
      }

      logApiCall(endpoint, attempt, maxRetries, undefined, err, durationMs);
      if (attempt < maxRetries) {
        await delay(Math.min(1000 * 2 ** attempt, 10000));
      }
    }
  }

  throw lastError || new RetryExhaustedError();
};
