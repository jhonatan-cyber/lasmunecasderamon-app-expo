import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CajeroCoversRoute from '@/app/(app)/cajero/covers';

vi.mock('@/components/screens/CoversScreen', () => ({
  CoversScreen: () => <div>covers-screen</div>,
}));

afterEach(() => {
  cleanup();
});

describe('ruta de covers del cajero', () => {
  it('abre la pantalla para que el cajero autorice las solicitudes del barman', () => {
    render(<CajeroCoversRoute />);
    expect(screen.getByText('covers-screen')).toBeDefined();
  });
});
