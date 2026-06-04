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
