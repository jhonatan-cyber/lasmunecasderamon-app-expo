import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

vi.mock('react-native', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

const format = (value: number) => String(Math.round(value));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('AnimatedNumber', () => {
  it('muestra el valor de entrada sin esperar animación', () => {
    render(<AnimatedNumber value={1500} format={format} />);
    expect(screen.getByText('1500')).toBeTruthy();
  });

  it('cuenta desde el valor anterior hasta el nuevo', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(Date.now()), 16) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

    const { rerender } = render(<AnimatedNumber value={0} format={format} duration={500} />);
    rerender(<AnimatedNumber value={100} format={format} duration={500} />);

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    const mid = Number(screen.getByText(/\d+/).textContent);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('no anima si el valor no cambió', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    const { rerender } = render(<AnimatedNumber value={42} format={format} />);
    rerender(<AnimatedNumber value={42} format={format} />);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(screen.getByText('42')).toBeTruthy();
  });
});
