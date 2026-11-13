import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RoomSelectModal,
  type Room,
} from '@/components/cajero/forms/RoomSelectModal';

type Children = { children?: ReactNode };
vi.mock('react-native', () => ({
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Modal: ({
    children,
    visible,
    onRequestClose,
  }: Children & { visible: boolean; onRequestClose: () => void }) =>
    visible ? (
      <div>
        <button onClick={onRequestClose}>Cerrar nativo</button>
        {children}
      </div>
    ) : null,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    disabled,
  }: Children & {
    onPress?: () => void;
    accessibilityLabel?: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onPress}
      aria-label={accessibilityLabel}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/hooks/useRenderCount', () => ({ useRenderCount: () => {} }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777',
  }),
}));
vi.mock('@/components/shared/FlashList', () => ({
  default: ({
    data,
    renderItem,
  }: {
    data: Room[];
    renderItem: (props: { item: Room }) => ReactNode;
  }) => (
    <div>
      {data.map((item) => (
        <div key={item.id}>{renderItem({ item })}</div>
      ))}
    </div>
  ),
}));
afterEach(cleanup);

const rooms: Room[] = [
  {
    id: '0',
    nombre: 'Inactiva',
    precio: 100,
    tiempo: 30,
    estado: 0,
    status: 1,
  },
  { id: '1', nombre: 'Libre', precio: 100, tiempo: 30, estado: 1 },
  { id: '2', nombre: 'Ocupada', precio: 100, tiempo: 30, status: 2 },
  { id: '3', nombre: 'Desconocida', precio: 100, tiempo: 30, estado: 9 },
];

describe('RoomSelectModal', () => {
  it('estado 0 es INACTIVA aunque status sea 1, y solo permite estado 1', () => {
    const onSelect = vi.fn();
    render(
      <RoomSelectModal
        visible
        rooms={rooms}
        onClose={vi.fn()}
        onSelect={onSelect}
      />,
    );
    for (const name of [
      'Inactiva, INACTIVA',
      'Ocupada, OCUPADA',
      'Desconocida, NO DISPONIBLE',
    ]) {
      const button = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      fireEvent.click(button);
    }
    expect(onSelect).not.toHaveBeenCalled();
    const libre = screen.getByRole('button', {
      name: 'Libre, LIBRE',
    }) as HTMLButtonElement;
    expect(libre.disabled).toBe(false);
    fireEvent.click(libre);
    expect(onSelect).toHaveBeenCalledWith(rooms[1]);
    expect(screen.getByText('● INACTIVA')).toBeTruthy();
    expect(screen.getByText('● OCUPADA')).toBeTruthy();
  });

  it('no habilita inactivas con configuración completa y excluye configuración incompleta', () => {
    render(
      <RoomSelectModal
        visible
        requireCompleteConfig
        rooms={[
          ...rooms,
          { id: '4', nombre: 'Sin precio', precio: 0, tiempo: 30, estado: 1 },
        ]}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByText('Sin precio')).toBeNull();
    expect(
      (
        screen.getByRole('button', {
          name: 'Inactiva, INACTIVA',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('cierra por la acción nativa del modal', () => {
    const onClose = vi.fn();
    render(
      <RoomSelectModal
        visible
        rooms={[]}
        onClose={onClose}
        onSelect={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Cerrar nativo'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
