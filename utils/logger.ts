import { addBreadcrumb, captureException, captureMessage } from '@/utils/sentry';
import { formatPayload, makeLogEntry } from '@lasmunecasderamon/utils';

const captureBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  addBreadcrumb({
    message,
    category,
    level: 'info',
    data: formatPayload(data) as Record<string, any> | undefined,
  });
};

const handleSentryError = (error: any) => {
  if (error instanceof Error) {
    captureException(error);
  } else {
    captureMessage(JSON.stringify(formatPayload(error)));
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
