import * as Sentry from '@sentry/react-native';
import { formatPayload, makeLogEntry } from '@lasmunecasderamon/utils';

const captureBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  try {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data: formatPayload(data) as Record<string, any> | undefined,
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
