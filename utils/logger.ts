import * as Sentry from '@sentry/react-native';

const formatPayload = (payload: any) => {
  if (!payload) return undefined;
  if (payload instanceof Error) {
    return {
      message: payload.message,
      name: payload.name,
      stack: payload.stack,
      ...Object.getOwnPropertyNames(payload).reduce((acc, key) => {
        if (key !== 'message' && key !== 'name' && key !== 'stack') {
          (acc as any)[key] = (payload as any)[key];
        }
        return acc;
      }, {} as Record<string, any>),
    };
  }

  if (typeof payload === 'object') {
    return JSON.parse(JSON.stringify(payload, (_, value) => (value === undefined ? null : value)));
  }

  return payload;
};

const makeLogEntry = (level: string, message: string, meta?: Record<string, any>) => ({
  timestamp: new Date().toISOString(),
  level,
  message,
  meta: formatPayload(meta),
});

const captureBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  try {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data: formatPayload(data),
    });
  } catch {
    // Sentry may not be initialized yet.
  }
};

const handleSentryError = (error: any) => {
  try {
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(JSON.stringify(formatPayload(error)));
    }
  } catch {
    // ignore send failures
  }
};

const logger = {
  debug: (message: string, meta?: Record<string, any>) => {
    if (__DEV__) {
      console.debug(JSON.stringify(makeLogEntry('debug', message, meta)));
    }
    captureBreadcrumb(message, 'debug', meta);
  },
  info: (message: string, meta?: Record<string, any>) => {
    console.info(JSON.stringify(makeLogEntry('info', message, meta)));
    captureBreadcrumb(message, 'info', meta);
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify(makeLogEntry('warn', message, meta)));
    captureBreadcrumb(message, 'warning', meta);
  },
  error: (message: string, meta?: Record<string, any>) => {
    console.error(JSON.stringify(makeLogEntry('error', message, meta)));
    captureBreadcrumb(message, 'error', meta);
  },
  captureException: (error: any, meta?: Record<string, any>) => {
    console.error(JSON.stringify(makeLogEntry('error', error?.message || String(error), meta)));
    captureBreadcrumb(error?.message || String(error), 'error', meta);
    handleSentryError(error);
  },
};

export default logger;
