export { BASE_URL, API_URL, resolveBaseUrl } from "./base-url";
export {
  attachHttpDetails,
  httpDetailsOf,
  InvalidResponseError,
  NetworkError,
  RetryExhaustedError,
  TimeoutError,
  UnauthorizedError,
} from "./errors";
export type { HttpErrorDetails } from "./errors";
export { apiClient } from "./request";
export { apiClientSafe } from "./client-safe";
export {
  ensureTokenInMemory,
  getTokenInMemory,
  notifyForbidden,
  notifySessionConfirmed,
  notifyUnauthorized,
  refreshAccessToken,
  setForbiddenHandler,
  setSessionConfirmedHandler,
  setTokenInMemory,
  setUnauthorizedHandler,
} from "./token";
