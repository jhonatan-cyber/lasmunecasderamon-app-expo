import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ColacionWorkerModal } from '@/components/colaciones/ColacionWorkerModal';

type Children = { children?: React.ReactNode };

/** Aplana el style (objeto o array) para poder leer los colores en el test. */
const flatStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return (style as Record<string, unknown>) ?? {};
};
vi.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => { } }) },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  View: ({ children, style }: Children & { style?: unknown }) => (
    <div data-bg={String(flatStyle(style).backgroundColor ?? '')}>{children}</div>
  ),
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
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777',
  }),
}));

const trabajadores = [
  { id: '1', name: 'Ana', lastName: 'Pérez', role: 'anfitriona', roleId: '10' },
  { id: '2', name: 'Bruno', lastName: 'Soto', nick: 'Bru', role: 'barman', roleId: '20' },
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
        topesPorRol={{ '20': 2 }}
      />,
    );

    expect(screen.getByText('Anfitriona')).toBeTruthy();
    expect(screen.getByText('Barman · Recibió 1 de 2')).toBeTruthy();
  });

  it('oculta trabajadores que alcanzaron el tope de su rol y conserva a quienes aún tienen cupo', () => {
    render(
      <ColacionWorkerModal
        visible
        onClose={vi.fn()}
        workers={[
          { id: '1', name: 'Ana', lastName: 'Pérez', role: 'anfitriona', roleId: '10' },
          { id: '2', name: 'Bruno', lastName: 'Soto', role: 'barman', roleId: '20' },
          { id: '3', name: 'Carla', lastName: 'Díaz', role: 'garzon', roleId: '30' },
          { id: '4', name: 'Diego', lastName: 'Rojas', role: 'cajero', roleId: '40' },
        ]}
        selectedId={null}
        onSelect={vi.fn()}
        receivedCounts={{ '1': 1, '2': 1, '3': 1 }}
        topesPorRol={{ '10': 2, '20': 1, '40': 0 }}
      />,
    );

    expect(screen.getByRole('button', { name: /Ana Pérez/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Bruno Soto/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Carla Díaz/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Diego Rojas/ })).toBeNull();
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

  it('el card del modal tiene fondo propio y no deja ver el overlay detrás', () => {
    render(
      <ColacionWorkerModal
        visible
        onClose={vi.fn()}
        workers={trabajadores}
        selectedId={null}
        onSelect={vi.fn()}
      />,
    );

    const card = screen
      .getByText('Seleccionar trabajador')
      .closest('[data-bg="#fff"]');
    expect(card).toBeTruthy();
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
