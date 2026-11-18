import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CajeroEntradasRoute from '@/app/(app)/cajero/entradas';

const mocks = vi.hoisted(() => ({ user: null as { role?: string } | null }));

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <div>{`redirect:${href}`}</div>,
}));

vi.mock('@/app/(app)/garzon/entradas', () => ({
  default: () => <div>entradas-garzon</div>,
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

describe('ruta de entradas del cajero — acceso por rol', () => {
  it.each(['cajero', 'Cajera'])('expulsa al cajero (%s) de la pantalla de registro', (role) => {
    mocks.user = { role };

    render(<CajeroEntradasRoute />);

    expect(screen.getByText('redirect:/(app)/cajero/(tabs)')).toBeDefined();
    expect(screen.queryByText('entradas-garzon')).toBeNull();
  });

  it('mantiene el acceso a administración', () => {
    mocks.user = { role: 'administrador' };

    render(<CajeroEntradasRoute />);

    expect(screen.getByText('entradas-garzon')).toBeDefined();
  });
});
