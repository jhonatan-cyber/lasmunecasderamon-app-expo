import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CajeroTabsLayout from '@/app/(app)/cajero/(tabs)/_layout';
import { useIsAdmin } from '@/hooks/useIsAdmin';

// `Tabs.Screen` se reemplaza por un marcador legible para poder verificar
// qué pestañas quedan ocultas (`href: null`) según el rol.
vi.mock('expo-router', () => {
  const Tabs: any = ({ children }: any) => <div>{children}</div>;
  Tabs.Screen = ({ name, options }: any) => (
    <div>{`${name}:${options?.href === null ? 'oculto' : 'visible'}`}</div>
  );
  return { Tabs };
});

vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/PremiumTabBar', () => ({
  PremiumTabBar: () => null,
}));

vi.mock('@/components/shared/ProfileEditModal', () => ({
  default: () => null,
}));

vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: vi.fn() }));

afterEach(() => {
  cleanup();
});

describe('CajeroTabsLayout — pestañas visibles según rol', () => {
  it('oculta asistencia, anticipos, propinas y horas extras para un administrador', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);

    render(<CajeroTabsLayout />);

    expect(screen.getByText('asistencia:oculto')).toBeDefined();
    expect(screen.getByText('anticipos:oculto')).toBeDefined();
    expect(screen.getByText('propinas:oculto')).toBeDefined();
    expect(screen.getByText('horas-extras:oculto')).toBeDefined();
    expect(screen.getByText('index:visible')).toBeDefined();
  });

  it('mantiene todas las pestañas para un cajero no administrador', () => {
    vi.mocked(useIsAdmin).mockReturnValue(false);

    render(<CajeroTabsLayout />);

    expect(screen.getByText('asistencia:visible')).toBeDefined();
    expect(screen.getByText('anticipos:visible')).toBeDefined();
    expect(screen.getByText('propinas:visible')).toBeDefined();
    expect(screen.getByText('horas-extras:visible')).toBeDefined();
    expect(screen.getByText('index:visible')).toBeDefined();
  });
});
