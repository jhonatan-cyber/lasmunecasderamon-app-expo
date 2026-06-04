import logger from "@/utils/logger";
import { API_URL } from "./base-url";
import {
  NetworkError,
  RetryExhaustedError,
  TimeoutError,
  UnauthorizedError,
} from "./errors";
import {
  delay,
  shouldRetry,
} from "./retry";
import {
  ensureTokenInMemory,
  notifyUnauthorized,
} from "./token";

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

export const apiClient = async <T = any>(
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

  if (
    !headers.has("Content-Type") &&
    !(fetchOptions.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const tokenInMemory = await ensureTokenInMemory();

  if (tokenInMemory) {
    headers.set("Authorization", `Bearer ${tokenInMemory}`);
    logger.debug("API token loaded", { hasToken: true });
  } else {
    logger.debug("API token loaded", { hasToken: false });
  }

  // Inyectar automáticamente la fecha del dispositivo en peticiones que envían datos
  let finalBody = fetchOptions.body;
  if (
    ["POST", "PUT", "PATCH"].includes(options.method?.toUpperCase() || "") &&
    typeof fetchOptions.body === "string"
  ) {
    try {
      const bodyObj = JSON.parse(fetchOptions.body);
      // Solo inyectamos si es un objeto y no tiene ya una fecha seteada explícitamente
      if (
        typeof bodyObj === "object" &&
        bodyObj !== null &&
        !bodyObj.device_date
      ) {
        bodyObj.device_date = new Date().toISOString();
        finalBody = JSON.stringify(bodyObj);
      }
    } catch {
      // Si no es JSON, lo dejamos como está
    }
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

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
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
          // Incluir el mensaje del servidor en el error
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
      const durationMs = Date.now() - startTime;
      lastError = err;

      if (!shouldRetry(err) || attempt === maxRetries) {
        logApiCall(endpoint, attempt, maxRetries, undefined, err, durationMs);
        if (err?.name === "AbortError") throw new TimeoutError();
        // Si el error ya es una instancia de Error lanzada arriba (con mensaje de servidor), no la convertimos a NetworkError
        if (
          err instanceof UnauthorizedError ||
          err instanceof TimeoutError ||
          err instanceof NetworkError
        )
          throw err;
        if (!err.type || err.type === "fetch-failed") {
          // Si el mensaje del error NO contiene "network" y viene de una respuesta fallida controlada, mantenemos el mensaje original
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
