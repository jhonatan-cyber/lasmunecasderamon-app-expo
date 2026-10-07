import { addBreadcrumb, captureException, captureMessage } from '@/utils/sentry';
import { formatPayload, makeLogEntry } from '@lasmunecasderamon/utils';
import {
  NetworkError,
  RetryExhaustedError,
  TimeoutError,
  UnauthorizedError,
} from '@/api/errors';

/**
 * Errores esperables en un fetch de fondo (refresh de pantalla, SSE, etc.):
 * sin red, timeout, reintentos agotados, abort por unmount o 401 (la sesión
 * la gestiona el authStore). No son bugs: se loguean en debug y NO deben
 * disparar console.error/Sentry (en dev, console.error abre la caja roja).
 */
const isExpectedFetchError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const name = (error as Error)?.name;
  if (name === 'AbortError') return true;
  return (
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    error instanceof RetryExhaustedError ||
    error instanceof UnauthorizedError ||
    name === 'NetworkError' ||
    name === 'TimeoutError' ||
    name === 'RetryExhaustedError' ||
    name === 'UnauthorizedError'
  );
};

/**
 * Claves que nunca viajan a Sentry/breadcrumbs (credenciales, tokens, PII de
 * cobro). Se enmascaran en `meta` antes de cualquier reporte.
 */
const SENSITIVE_KEY_PATTERN = /(authorization|token|password|passwd|secret|codigo|qr_token|device_date)/i;
const SCRUBBED = '[redacted]';

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (value instanceof Error) return value.message;
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? SCRUBBED : scrubValue(item, depth + 1);
    }
    return out;
  }
  return value;
}

const scrubMeta = (meta?: Record<string, any>): Record<string, any> | undefined =>
  meta === undefined ? undefined : (scrubValue(meta) as Record<string, any>);

const captureBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  addBreadcrumb({
    message,
    category,
    level: 'info',
    data: formatPayload(scrubMeta(data)) as Record<string, any> | undefined,
  });
};

const handleSentryError = (error: any) => {
  if (error instanceof Error) {
    captureException(error);
  } else {
    captureMessage(JSON.stringify(formatPayload(scrubValue(error))));
  }
};

const logger = {
  // debug/info: solo consola local, SIN breadcrumb (quemaban cuota de Sentry
  // con ruido de arranque/SSE: cada log era un breadcrumb).
  debug: (message: string, meta?: Record<string, any>) => {
    if (__DEV__) {
      console.debug(JSON.stringify(makeLogEntry('debug', message, scrubMeta(meta))));
    }
  },
  info: (message: string, meta?: Record<string, any>) => {
    console.info(JSON.stringify(makeLogEntry('info', message, scrubMeta(meta))));
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify(makeLogEntry('warn', message, scrubMeta(meta))));
    captureBreadcrumb(message, 'warning', meta);
  },
  error: (message: string, meta?: Record<string, any>) => {
    console.error(JSON.stringify(makeLogEntry('error', message, scrubMeta(meta))));
    captureBreadcrumb(message, 'error', meta);
  },
  captureException: (error: any, meta?: Record<string, any>) => {
    const scrubbed = scrubMeta(meta);
    console.error(JSON.stringify(makeLogEntry('error', error?.message || String(error), scrubbed)));
    captureBreadcrumb(error?.message || String(error), 'error', scrubbed);
    handleSentryError(error);
  },
  /**
   * Para fetches de fondo: lo esperable (sin red, timeout, abort, 401) va a
   * debug en silencio — la pantalla sigue con datos cacheados. Solo lo
   * inesperado sube a captureException (caja roja + Sentry).
   */
  fetchError: (error: any, meta?: Record<string, any>) => {
    if (isExpectedFetchError(error)) {
      if (__DEV__) {
        console.debug(
          JSON.stringify(makeLogEntry('debug', error?.message || String(error), scrubMeta(meta))),
        );
      }
      return;
    }
    logger.captureException(error, meta);
  },
};

export default logger;
