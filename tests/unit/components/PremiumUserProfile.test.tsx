import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PremiumUserProfile } from '@/components/shared/PremiumUserProfile';

vi.mock('react-native', () => ({
  Image: () => <img alt="" />,
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/api/client', () => ({
  BASE_URL: 'http://localhost:3000',
}));

vi.mock('@/components/anfitriona/AttendanceCodeDisplay', () => ({
  AttendanceCodeDisplay: () => <div>CODIGO_ASISTENCIA</div>,
}));

afterEach(() => {
  cleanup();
});

describe('PremiumUserProfile — rol y código de asistencia', () => {
  it('muestra el rol real y oculta el código de asistencia para un administrador', () => {
    render(
      <PremiumUserProfile
        user={{ id: 1, name: 'Ana', role: 'administrador' }}
        userStatus={1}
        role="cajero"
      />,
    );

    expect(screen.getByText('Administrador')).toBeDefined();
    expect(screen.queryByText('CODIGO_ASISTENCIA')).toBeNull();
  });

  it('muestra el rol de la sección y el código de asistencia para un cajero', () => {
    render(
      <PremiumUserProfile
        user={{ id: 2, name: 'Luis', role: 'cajero' }}
        userStatus={1}
        role="cajero"
      />,
    );

    expect(screen.getByText('Cajero')).toBeDefined();
    expect(screen.getByText('CODIGO_ASISTENCIA')).toBeDefined();
  });
});
