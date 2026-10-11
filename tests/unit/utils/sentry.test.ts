import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  init: vi.fn(), addBreadcrumb: vi.fn(), captureException: vi.fn(), captureMessage: vi.fn(),
}));
vi.mock('@sentry/react-native', () => sdk);

beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllEnvs());

it('sin DSN no inicializa ni reporta eventos', async () => {
  vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', '');
  const sentry = await import('@/utils/sentry');
  await sentry.initSentry();
  await sentry.addBreadcrumb({ message: 'Prueba' });
  await sentry.captureException(new Error('Prueba'));
  await sentry.captureMessage('Prueba');
  expect(sentry.isSentryEnabled()).toBe(false);
  for (const mock of Object.values(sdk)) expect(mock).not.toHaveBeenCalled();
});

it('inicializa una vez y reporta errores sin adjuntar datos personales o consola', async () => {
  const sentry = await import('@/utils/sentry');
  await sentry.initSentry({ dsn: 'https://public@example.com/1' });
  await sentry.initSentry({ dsn: 'https://public@example.com/1' });
  expect(sdk.init).toHaveBeenCalledTimes(1);
  const options = sdk.init.mock.calls[0][0];
  expect(options).toMatchObject({ sendDefaultPii: false, tracesSampleRate: 0, attachScreenshot: false });
  expect(options.beforeBreadcrumb({ category: 'console', message: 'Datos privados' })).toBeNull();
  const error = new Error('Prueba controlada');
  await sentry.captureException(error);
  expect(sdk.captureException).toHaveBeenCalledWith(error);
  expect(sentry.isSentryEnabled()).toBe(true);
});
