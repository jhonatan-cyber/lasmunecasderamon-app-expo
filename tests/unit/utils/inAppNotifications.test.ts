import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCurrentNotification,
  hideToast,
  showToast,
  subscribeNotifications,
} from '@/utils/inAppNotifications';

function clearAll() {
  while (getCurrentNotification()) hideToast();
}

describe('inAppNotifications', () => {
  beforeEach(clearAll);

  it('muestra el primer aviso y encola el segundo', () => {
    showToast({ type: 'success', text1: 'Guardado' });
    showToast({ type: 'error', text1: 'Falló' });

    expect(getCurrentNotification()).toMatchObject({ type: 'success', text1: 'Guardado' });
  });

  it('al cerrar el visible pasa al siguiente de la cola', () => {
    showToast({ type: 'success', text1: 'Primero' });
    showToast({ type: 'error', text1: 'Segundo' });

    hideToast();
    expect(getCurrentNotification()).toMatchObject({ text1: 'Segundo' });

    hideToast();
    expect(getCurrentNotification()).toBeNull();
  });

  it('aplica info y 4000 ms como valores por defecto', () => {
    showToast({ text1: 'Sin tipo' });

    expect(getCurrentNotification()).toMatchObject({
      type: 'info',
      visibilityTime: 4000,
    });
  });

  it('respeta el visibilityTime explícito', () => {
    showToast({ type: 'warning', text1: 'Lento', visibilityTime: 7000 });

    expect(getCurrentNotification()).toMatchObject({ visibilityTime: 7000 });
  });

  it('avisa a los suscriptores cada vez que cambia el aviso visible', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeNotifications(listener);

    showToast({ text1: 'Uno' });
    hideToast();
    unsubscribe();
    showToast({ text1: 'Dos' });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(null);
  });
});
