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

  it('un error interrumpe el aviso visible y este vuelve a la cola', () => {
    showToast({ type: 'success', text1: 'Guardado' });
    showToast({ type: 'error', text1: 'Falló' });

    expect(getCurrentNotification()).toMatchObject({ type: 'error', text1: 'Falló' });

    hideToast();
    expect(getCurrentNotification()).toMatchObject({ type: 'success', text1: 'Guardado' });
  });

  it('no interrumpe si la prioridad no es mayor: espera su turno', () => {
    showToast({ type: 'success', text1: 'Guardado' });
    showToast({ type: 'info', text1: 'Detalle' });
    showToast({ type: 'warning', text1: 'Lento' });

    expect(getCurrentNotification()).toMatchObject({ type: 'success', text1: 'Guardado' });

    hideToast();
    expect(getCurrentNotification()).toMatchObject({ text1: 'Detalle' });

    hideToast();
    expect(getCurrentNotification()).toMatchObject({ text1: 'Lento' });

    hideToast();
    expect(getCurrentNotification()).toBeNull();
  });

  it('una orden interrumpe un success pero no un error ya visible', () => {
    showToast({ type: 'success', text1: 'Guardado' });
    showToast({ type: 'order', text1: 'Pedido' });
    expect(getCurrentNotification()).toMatchObject({ text1: 'Pedido' });

    hideToast();
    expect(getCurrentNotification()).toMatchObject({ text1: 'Guardado' });

    showToast({ type: 'error', text1: 'Falló' });
    showToast({ type: 'order', text1: 'Pedido 2' });
    expect(getCurrentNotification()).toMatchObject({ text1: 'Falló' });

    // el error interrumpió un success, así que este vuelve primero a la cola
    hideToast();
    expect(getCurrentNotification()).toMatchObject({ text1: 'Guardado' });

    hideToast();
    expect(getCurrentNotification()).toMatchObject({ text1: 'Pedido 2' });
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
    showToast({ type: 'error', text1: 'Urgente' });
    hideToast();
    unsubscribe();
    showToast({ text1: 'Dos' });

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls.map(([notification]) => notification?.text1 ?? null)).toEqual([
      'Uno',
      'Urgente',
      'Uno',
    ]);
  });

  it('deja de avisar tras desuscribirse', () => {
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
