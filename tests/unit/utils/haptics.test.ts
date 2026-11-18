import { beforeEach, describe, expect, it, vi } from 'vitest';

import { haptic } from '@/utils/haptics';

const h = vi.hoisted(() => ({
  os: 'ios',
  impact: vi.fn(),
  selection: vi.fn(),
  notification: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return h.os;
    },
  },
}));

vi.mock('expo-haptics', () => ({
  impactAsync: h.impact,
  selectionAsync: h.selection,
  notificationAsync: h.notification,
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

beforeEach(() => {
  h.os = 'ios';
  h.impact.mockReset().mockResolvedValue(undefined);
  h.selection.mockReset().mockResolvedValue(undefined);
  h.notification.mockReset().mockResolvedValue(undefined);
});

describe('haptic', () => {
  it('vibra suave en cada toque', () => {
    haptic.tap();
    expect(h.impact).toHaveBeenCalledWith('light');
  });

  it('da un golpe medio al confirmar una acción', () => {
    haptic.confirm();
    expect(h.impact).toHaveBeenCalledWith('medium');
  });

  it('usa feedback de selección al cambiar pestañas', () => {
    haptic.select();
    expect(h.selection).toHaveBeenCalledTimes(1);
  });

  it('marca resultado con notificación de éxito o error', () => {
    haptic.success();
    haptic.error();
    expect(h.notification).toHaveBeenNthCalledWith(1, 'success');
    expect(h.notification).toHaveBeenNthCalledWith(2, 'error');
  });

  it('no hace nada en web', () => {
    h.os = 'web';
    haptic.tap();
    haptic.confirm();
    haptic.select();
    haptic.success();
    haptic.error();
    expect(h.impact).not.toHaveBeenCalled();
    expect(h.selection).not.toHaveBeenCalled();
    expect(h.notification).not.toHaveBeenCalled();
  });

  it('silencia rechazos del motor nativo sin romper la UI', async () => {
    h.impact.mockRejectedValue(new Error('sin motor háptico'));
    expect(() => haptic.tap()).not.toThrow();
    await Promise.resolve();
  });
});
