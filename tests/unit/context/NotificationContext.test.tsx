import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '@/context/NotificationContext';

const h = vi.hoisted(() => ({
  appStateListeners: [] as ((state: string) => void)[],
  instances: [] as { close: ReturnType<typeof vi.fn>; handlers: Record<string, (e?: unknown) => void> }[],
  handleNotificationEvent: vi.fn(),
  emitSseEvent: vi.fn(),
}));

vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: (_type: string, listener: (state: string) => void) => {
      h.appStateListeners.push(listener);
      return { remove: () => { h.appStateListeners = h.appStateListeners.filter(l => l !== listener); } };
    },
  },
}));

vi.mock('react-native-sse', () => {
  return {
    default: class FakeEventSource {
      close = vi.fn();
      handlers: Record<string, (e?: unknown) => void> = {};
      constructor() {
        h.instances.push(this);
      }
      addEventListener(type: string, handler: (e?: unknown) => void) {
        this.handlers[type] = handler;
      }
    },
  };
});

vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 7, rol: 'cajero' } }),
}));
vi.mock('@/api/client', () => ({ API_URL: 'http://api.test' }));
vi.mock('@/api/token', () => ({
  ensureTokenInMemory: vi.fn(() => Promise.resolve('token')),
  refreshAccessToken: vi.fn(() => Promise.resolve(true)),
}));
vi.mock('@/services/connectivity', () => ({
  connectivity: {
    start: vi.fn(() => Promise.resolve('online')),
    subscribe: vi.fn(() => () => {}),
    isOffline: vi.fn(() => false),
  },
}));
vi.mock('@/services/pushNotifications', () => ({
  configureNotifications: vi.fn(),
  registerForPushNotificationsAsync: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('@/utils/realtime', () => ({
  emitSseEvent: h.emitSseEvent,
  isSseControlEvent: vi.fn(() => false),
}));
vi.mock('@/context/notifications/handleServerEvent', () => ({
  handleNotificationEvent: h.handleNotificationEvent,
}));
vi.mock('@/context/notifications/systemNotifications', () => ({
  notifyInBackground: vi.fn(),
}));
vi.mock('@/components/ui/NotificationBanner', () => ({
  NotificationBanner: () => null,
}));

beforeEach(() => {
  h.appStateListeners = [];
  h.instances = [];
  h.handleNotificationEvent.mockClear();
  h.emitSseEvent.mockClear();
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderConnected() {
  render(
    <NotificationProvider>
      <div>contenido</div>
    </NotificationProvider>,
  );
  await waitFor(() => expect(h.instances).toHaveLength(1));
}

function emitAppState(state: string) {
  act(() => {
    for (const listener of [...h.appStateListeners]) listener(state);
  });
}

describe('NotificationContext: ciclo de vida del SSE según el estado de la app', () => {
  it('entrega al manejador el payload recibido por SSE', async () => {
    await renderConnected();
    const payload = { type: 'new_order', data: { id: 42, codigo: 'PED-42' } };

    act(() => {
      h.instances[0].handlers.message({ data: JSON.stringify(payload) });
    });

    expect(h.handleNotificationEvent).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({ user: { id: 7, rol: 'cajero' } }),
    );
    expect(h.emitSseEvent).toHaveBeenCalledWith(payload);
  });

  it('cierra la conexión al pasar a segundo plano', async () => {
    await renderConnected();

    emitAppState('background');

    expect(h.instances[0].close).toHaveBeenCalledTimes(1);
  });

  it('vuelve a conectar al regresar a primer plano', async () => {
    await renderConnected();
    emitAppState('background');
    h.instances[0].close.mockClear();

    emitAppState('active');

    await waitFor(() => expect(h.instances).toHaveLength(2));
  });

  it('no cierra la conexión con app inactiva transitoria', async () => {
    await renderConnected();

    emitAppState('inactive');

    expect(h.instances[0].close).not.toHaveBeenCalled();
  });
});
