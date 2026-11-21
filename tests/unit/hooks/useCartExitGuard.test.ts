import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartExitGuard } from '@/hooks/useCartExitGuard';

const preventRemove = vi.hoisted(() => ({
  enabled: false,
  callback: null as null | ((options: { repeat: () => void }) => void),
}));

vi.mock('expo-router', () => ({
  usePreventRemove: (
    enabled: boolean,
    callback: (options: { repeat: () => void }) => void,
  ) => {
    preventRemove.enabled = enabled;
    preventRemove.callback = callback;
  },
}));

describe('useCartExitGuard', () => {
  beforeEach(() => {
    preventRemove.enabled = false;
    preventRemove.callback = null;
  });

  it('activa la prevención solo cuando hay carrito sin guardar', () => {
    renderHook(() => useCartExitGuard({ enabled: false }));

    expect(preventRemove.enabled).toBe(false);
  });

  it('muestra el diálogo cuando la navegación fue bloqueada', () => {
    const { result } = renderHook(() =>
      useCartExitGuard({ enabled: true, onDiscard: vi.fn() }),
    );

    expect(result.current.discardPromptVisible).toBe(false);

    act(() => preventRemove.callback?.({ repeat: vi.fn() }));

    expect(result.current.discardPromptVisible).toBe(true);
  });

  it('al confirmar limpia y repite la navegación bloqueada', () => {
    const onDiscard = vi.fn();
    const repeat = vi.fn();
    const { result } = renderHook(() =>
      useCartExitGuard({ enabled: true, onDiscard }),
    );

    act(() => preventRemove.callback?.({ repeat }));
    act(() => result.current.confirmDiscard());

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(repeat).toHaveBeenCalledTimes(1);
    expect(onDiscard.mock.invocationCallOrder[0]).toBeLessThan(
      repeat.mock.invocationCallOrder[0],
    );
    expect(result.current.discardPromptVisible).toBe(false);
  });

  it('al cancelar no limpia ni navega', () => {
    const onDiscard = vi.fn();
    const repeat = vi.fn();
    const { result } = renderHook(() =>
      useCartExitGuard({ enabled: true, onDiscard }),
    );

    act(() => preventRemove.callback?.({ repeat }));
    act(() => result.current.cancelDiscard());

    expect(onDiscard).not.toHaveBeenCalled();
    expect(repeat).not.toHaveBeenCalled();
    expect(result.current.discardPromptVisible).toBe(false);
  });
});
