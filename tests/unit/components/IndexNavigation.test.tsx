import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Index from '@/app/index';

const navigation = vi.hoisted(() => ({
  user: null as { role?: string; forcePasswordChange?: boolean } | null,
  kioskMode: false,
}));

vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <div data-route={href} />,
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (state: { user: typeof navigation.user }) => unknown) =>
    selector({ user: navigation.user }),
}));
vi.mock('@/store/modoPantallaStore', () => ({
  RUTA_PANTALLA_ASISTENCIA: '/asistencia',
  useModoPantallaStore: (selector: (state: { activo: boolean }) => unknown) =>
    selector({ activo: navigation.kioskMode }),
}));

afterEach(() => {
  cleanup();
  navigation.user = null;
  navigation.kioskMode = false;
});

describe('redirección inicial según rol', () => {
  it('envía un rol no reconocido al login, no a una pantalla operativa', () => {
    navigation.user = { role: 'desconocido' };

    const { container } = render(<Index />);

    expect(container.querySelector('[data-route]')?.getAttribute('data-route')).toBe('/(auth)/login');
  });

  it('conserva el módulo correspondiente para un rol reconocido', () => {
    navigation.user = { role: 'garzon' };

    const { container } = render(<Index />);

    expect(container.querySelector('[data-route]')?.getAttribute('data-route')).toBe('/(app)/garzon/(tabs)');
  });
});