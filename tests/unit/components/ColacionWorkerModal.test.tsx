import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColacionWorkerModal } from '@/components/colaciones/ColacionWorkerModal';

type Children = { children?: React.ReactNode };
vi.mock('react-native', () => ({
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
  }: Children & { onPress?: () => void; accessibilityLabel?: string }) => (
    <button onClick={onPress} aria-label={accessibilityLabel}>
      {children}
    </button>
  ),
  FlatList: ({
    data,
    renderItem,
  }: {
    data: unknown[];
    renderItem: (args: { item: unknown; index: number }) => React.ReactNode;
  }) => (
    <div>{data.map((item, index) => <div key={index}>{renderItem({ item, index })}</div>)}</div>
  ),
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock('@/components/ui/AppModal', () => ({
  AppModal: ({ children, visible }: Children & { visible?: boolean }) =>
    visible ? <div>{children}</div> : null,
}));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777',
  }),
}));

const trabajadores = [
  { id: '1', name: 'Ana', lastName: 'Pérez', role: 'anfitriona' },
  { id: '2', name: 'Bruno', lastName: 'Soto', nick: 'Bru', role: 'barman' },
];

afterEach(cleanup);

describe('ColacionWorkerModal', () => {
  it('muestra rol y colaciones ya recibidas en el turno', () => {
    render(
      <ColacionWorkerModal
        visible
        onClose={vi.fn()}
        workers={trabajadores}
        selectedId={null}
        onSelect={vi.fn()}
        receivedCounts={{ '2': 1 }}
      />,
    );

    expect(screen.getByText('Anfitriona')).toBeTruthy();
    expect(screen.getByText('Barman · Ya recibió 1')).toBeTruthy();
  });

  it('permite volver a elegir al trabajador seleccionado y cierra el modal', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <ColacionWorkerModal
        visible
        onClose={onClose}
        workers={trabajadores}
        selectedId="1"
        onSelect={onSelect}
      />,
    );

    const ana = screen.getByRole('button', { name: /Ana Pérez, Anfitriona/ });
    fireEvent.click(ana);

    expect(onSelect).toHaveBeenCalledWith('1');
    expect(onClose).toHaveBeenCalled();
  });

  it('muestra el error de carga en lugar de una lista vacía', () => {
    render(
      <ColacionWorkerModal
        visible
        onClose={vi.fn()}
        workers={[]}
        selectedId={null}
        onSelect={vi.fn()}
        error="No se pudo cargar el personal"
      />,
    );

    expect(screen.getByText('No se pudo cargar el personal')).toBeTruthy();
    expect(screen.queryByText('No hay trabajadores disponibles.')).toBeNull();
  });
});
