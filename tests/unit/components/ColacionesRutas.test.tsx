import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CajeroColacionesRoute from '@/app/(app)/cajero/colaciones';
import AnfitrionaColacionesRoute from '@/app/(app)/anfitriona/colaciones';

const mocks = vi.hoisted(() => ({ user: null as { role?: string } | null }));

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <div>{`redirect:${href}`}</div>,
}));

vi.mock('@/components/screens/ColacionesScreen', () => ({
  default: () => <div>colaciones-cajero</div>,
}));

vi.mock('@/components/screens/ColacionesScreenAnfitriona', () => ({
  default: () => <div>colaciones-anfitriona</div>,
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

describe('rutas de colaciones — acceso por rol', () => {
  it('expulsa al garzón de la pantalla de cajero', () => {
    mocks.user = { role: 'Garzon' };

    render(<CajeroColacionesRoute />);

    expect(screen.getByText('redirect:/(app)/garzon/(tabs)')).toBeDefined();
    expect(screen.queryByText('colaciones-cajero')).toBeNull();
  });

  it('expulsa al garzón de la pantalla de anfitriona', () => {
    mocks.user = { role: 'garzon' };

    render(<AnfitrionaColacionesRoute />);

    expect(screen.getByText('redirect:/(app)/garzon/(tabs)')).toBeDefined();
    expect(screen.queryByText('colaciones-anfitriona')).toBeNull();
  });

  it('mantiene el acceso para cajero y administración', () => {
    mocks.user = { role: 'cajero' };
    const cajero = render(<CajeroColacionesRoute />);
    expect(screen.getByText('colaciones-cajero')).toBeDefined();
    cajero.unmount();

    mocks.user = { role: 'administrador' };
    render(<CajeroColacionesRoute />);
    expect(screen.getByText('colaciones-cajero')).toBeDefined();
  });

  it.each(['anfitriona', ' Anfitriona '])(
    'expulsa a la anfitriona (%s) de la pantalla de cajero',
    (role) => {
      mocks.user = { role };

      render(<CajeroColacionesRoute />);

      expect(screen.getByText('redirect:/(app)/anfitriona/(tabs)')).toBeDefined();
      expect(screen.queryByText('colaciones-cajero')).toBeNull();
    },
  );

  it('expulsa a la anfitriona de su propia pantalla de registro', () => {
    mocks.user = { role: 'anfitriona' };

    render(<AnfitrionaColacionesRoute />);

    expect(screen.getByText('redirect:/(app)/anfitriona/(tabs)')).toBeDefined();
    expect(screen.queryByText('colaciones-anfitriona')).toBeNull();
  });
});
