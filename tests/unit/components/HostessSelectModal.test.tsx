import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostessSelectModal } from '@/components/cajero/forms/HostessSelectModal';

type RenderProps = {
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

vi.mock('react-native', () => ({
  View: ({ children }: RenderProps) => <div>{children}</div>,
  Text: ({ children }: RenderProps) => <span>{children}</span>,
  Pressable: ({ children, onPress, disabled }: RenderProps) => (
    <button onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
  ScrollView: ({ children }: RenderProps) => <div>{children}</div>,
  FlatList: ({ data, renderItem, keyExtractor }: any) => (
    <div>
      {data.map((item: any) => (
        <React.Fragment key={keyExtractor(item)}>
          {renderItem({ item })}
        </React.Fragment>
      ))}
    </div>
  ),
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@/api/client', () => ({ BASE_URL: 'http://localhost' }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#6366F1',
    textPrimary: '#111',
    borderColor: '#ddd',
  }),
}));
vi.mock('@/components/ui/AnimatedView', () => ({
  AnimatedView: ({ children }: RenderProps) => <div>{children}</div>,
}));
vi.mock('@/components/ui/AppModal', () => ({
  AppModal: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) =>
    visible ? <div>{children}</div> : null,
}));
vi.mock('@/components/ui/ModalBottomSheet', () => ({
  ModalBottomSheet: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) =>
    visible ? <div>{children}</div> : null,
}));

const hostesses = [
  { id: 1, nick: 'Libre', estado_servicio: 0 },
  { id: 2, nick: 'DeEsteServicio', estado_servicio: 1 },
  { id: 3, nick: 'DeOtroServicio', estado_servicio: 1 },
];

function renderModal(props: Partial<React.ComponentProps<typeof HostessSelectModal>> = {}) {
  const onToggle = vi.fn();
  render(
    <HostessSelectModal
      visible
      onClose={() => {}}
      onToggle={onToggle}
      hostesses={hostesses}
      selectedIds={[]}
      {...props}
    />,
  );
  return { onToggle };
}

function itemButton(nick: string) {
  const button = screen.getByText(nick).closest('button');
  if (!button) throw new Error(`No se encontró el botón de ${nick}`);
  return button;
}

afterEach(cleanup);

describe('HostessSelectModal', () => {
  it('permite seleccionar una anfitriona libre', () => {
    const { onToggle } = renderModal();
    expect(itemButton('Libre').disabled).toBe(false);
    fireEvent.click(itemButton('Libre'));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('bloquea una anfitriona ocupada en otro servicio', () => {
    const { onToggle } = renderModal();
    expect(itemButton('DeOtroServicio').disabled).toBe(true);
    fireEvent.click(itemButton('DeOtroServicio'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('deja seleccionable una ocupada incluida en allowedOccupiedIds', () => {
    const { onToggle } = renderModal({ allowedOccupiedIds: ['2'] });
    expect(itemButton('DeEsteServicio').disabled).toBe(false);
    fireEvent.click(itemButton('DeEsteServicio'));
    expect(onToggle).toHaveBeenCalledWith(2);
    // La de otro servicio sigue bloqueada.
    expect(itemButton('DeOtroServicio').disabled).toBe(true);
  });
});
