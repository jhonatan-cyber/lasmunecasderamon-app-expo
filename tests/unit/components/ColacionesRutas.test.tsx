import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BarmanColacionesRoute from '@/app/(app)/barman/colaciones';

const mocks = vi.hoisted(() => ({ user: null as { role?: string } | null }));

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <div>{`redirect:${href}`}</div>,
}));

vi.mock('@/components/screens/ColacionesScreen', () => ({
  default: () => <div>colaciones-registro</div>,
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
  it('permite al barman entregar las colaciones', () => {
    mocks.user = { role: 'Barman' };

    render(<BarmanColacionesRoute />);

    expect(screen.getByText('colaciones-registro')).toBeDefined();
  });

  it.each([
    ['cajero', '/(app)/cajero/(tabs)'],
    ['cajera', '/(app)/cajero/(tabs)'],
    ['administrador', '/(app)/cajero/(tabs)'],
    ['garzon', '/(app)/garzon/(tabs)'],
    ['anfitriona', '/(app)/anfitriona/(tabs)'],
  ])('expulsa al rol %s de la pantalla de colaciones del barman', (role, home) => {
    mocks.user = { role };

    render(<BarmanColacionesRoute />);

    expect(screen.getByText(`redirect:${home}`)).toBeDefined();
    expect(screen.queryByText('colaciones-registro')).toBeNull();
  });
});
