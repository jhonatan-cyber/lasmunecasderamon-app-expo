import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyInBackground } from '@/context/notifications/systemNotifications';

const mocks = vi.hoisted(() => ({
  appState: { currentState: 'active' as string },
  schedule: vi.fn(),
}));

vi.mock('react-native', () => ({ AppState: mocks.appState }));
vi.mock('@/services/pushNotifications', () => ({
  scheduleLocalNotificationAsync: mocks.schedule,
}));

describe('notifyInBackground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appState.currentState = 'active';
  });

  it('no agenda notificación del sistema con la app en primer plano', async () => {
    await notifyInBackground('Nuevo pedido', 'Mesa 4');

    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it('agenda la notificación del sistema cuando la app está en segundo plano', async () => {
    mocks.appState.currentState = 'background';

    await notifyInBackground('Nuevo pedido', 'Mesa 4');

    expect(mocks.schedule).toHaveBeenCalledExactlyOnceWith('Nuevo pedido', 'Mesa 4');
  });
});
