import type { ApiRes } from "@/types/api";
import logger from "@/utils/logger";
import { API_URL } from "./base-url";
import {
  NetworkError,
  RetryExhaustedError,
  TimeoutError,
  UnauthorizedError,
} from "./errors";
import { delay, shouldRetry } from "./retry";
import {
  ensureTokenInMemory,
  getTokenInMemory,
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
  const onInternalAbort = () => {}; // No necesitamos abortar el external

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
      clearTimeout(timeoutId);
      cleanupSignals();
      const durationMs = Date.now() - startTime;

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        // Intentar refresh token automático (excepto para el propio endpoint de refresh)
        if (!endpoint.includes('/auth/refresh')) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Token renovado — actualizar header y reintentar
            headers.set('Authorization', `Bearer ${getTokenInMemory()}`);
            config.headers = headers;
            logApiCall(endpoint, attempt, maxRetries, response.status, undefined, durationMs);
            // Continuar al siguiente intento con el header actualizado
            lastError = new Error('Token refreshed, retrying...');
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
          throw new Error(serverMessage);
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
