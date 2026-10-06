export class InvalidResponseError extends Error {
  code = "INVALID_RESPONSE";
  constructor(message = "El servidor devolvió una respuesta JSON inválida.") {
    super(message);
    this.name = "InvalidResponseError";
  }
}

export class UnauthorizedError extends Error {
  code = "UNAUTHORIZED";
  constructor(message = "Sesión inválida o expirada") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class TimeoutError extends Error {
  code = "TIMEOUT";
  constructor(message = "La petición tardó demasiado. Verifica tu conexión.") {
    super(message);
    this.name = "TimeoutError";
  }
}

export class NetworkError extends Error {
  code = "NETWORK_ERROR";
  constructor(
    message = __DEV__
      ? "Error de conexión con el servidor local. Verifica que el servidor esté corriendo y en la misma red."
      : "Error de conexión. Verifica tu internet e intenta nuevamente.",
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class RetryExhaustedError extends Error {
  code = "RETRY_EXHAUSTED";
  constructor(message = "Se agotaron los reintentos de conexión.") {
    super(message);
    this.name = "RetryExhaustedError";
  }
}

/** Lo que el servidor contestó cuando rechazó la petición. */
export interface HttpErrorDetails {
  status: number;
  /** Cuerpo crudo de la respuesta: ahí está el motivo concreto del rechazo. */
  body: unknown;
}

/**
 * El error viaja con el status y el cuerpo como propiedad **no enumerable y con
 * símbolo**: siguen accesibles para quien sepa leerlos (la cola de intenciones),
 * pero no aparecen en `JSON.stringify` ni en los logs de Sentry, así que no se
 * filtran cuerpos de respuesta al reportar un error.
 */
const HTTP_DETAILS = Symbol.for("lasmunecasderamon.httpDetails");

export function attachHttpDetails<T extends Error>(error: T, details: HttpErrorDetails): T {
  Object.defineProperty(error, HTTP_DETAILS, {
    value: details,
    enumerable: false,
    configurable: true
  });
  return error;
}

export function httpDetailsOf(error: unknown): HttpErrorDetails | null {
  if (!error || typeof error !== "object") return null;

  const details = (error as Record<symbol, unknown>)[HTTP_DETAILS];
  if (!details || typeof details !== "object") return null;

  const { status, body } = details as HttpErrorDetails;
  return typeof status === "number" ? { status, body } : null;
}
