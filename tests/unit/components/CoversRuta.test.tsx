import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CajeroCoversRoute from '@/app/(app)/cajero/covers';

const mocks = vi.hoisted(() => ({ user: null as { role?: string } | null }));

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <div>{`redirect:${href}`}</div>,
}));

vi.mock('@/components/screens/CoversScreen', () => ({
  CoversScreen: () => <div>covers-screen</div>,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: typeof mocks.user }) => unknown) =>
    selector({ user: mocks.user }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  mocks.user = null;
});

describe('ruta de covers del cajero — acceso por rol', () => {
  it.each(['cajero', 'Cajera'])('expulsa al cajero (%s) de covers', (role) => {
    mocks.user = { role };

    render(<CajeroCoversRoute />);

    expect(screen.getByText('redirect:/(app)/cajero/(tabs)')).toBeDefined();
    expect(screen.queryByText('covers-screen')).toBeNull();
  });

  it('mantiene el acceso a administración', () => {
    mocks.user = { role: 'administrador' };

    render(<CajeroCoversRoute />);
    expect(screen.getByText('covers-screen')).toBeDefined();
  });
});
