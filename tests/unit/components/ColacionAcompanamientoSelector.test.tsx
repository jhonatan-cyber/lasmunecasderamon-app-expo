import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColacionAcompanamientoSelector } from '@/components/colaciones/ColacionAcompanamientoSelector';
import type { AcompanamientoOpcion } from '@/services/colaciones';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
  View: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Pressable: ({ children, onPress, accessibilityLabel, disabled }: any) => (
    <button onClick={onPress} aria-label={accessibilityLabel} disabled={disabled}>
      {children}
    </button>
  ),
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  FlatList: ({ data, renderItem, keyExtractor, ListEmptyComponent }: any) => (
    <div>
      {data.length > 0
        ? data.map((item: any, index: number) => (
            <React.Fragment key={keyExtractor(item, index)}>
              {renderItem({ item, index })}
            </React.Fragment>
          ))
        : ListEmptyComponent}
    </div>
  ),
  ScrollView: ({ children }: any) => <div>{children}</div>,
  Modal: ({ children, visible }: any) => (visible ? <div>{children}</div> : null),
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (s: any) => s },
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/components/ui/ModalBottomSheet', () => ({
  ModalBottomSheet: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#123',
    bg: '#fff',
    textPrimary: '#000',
    textSecondary: '#555',
  }),
}));

const opciones: AcompanamientoOpcion[] = [
  {
    id: 2,
    nombre: 'Sprite 1.5 L',
    presentacion_id: 2,
    presentacion_nombre: '1.5 L',
    ml: 1200,
    cantidad: 2,
    stock: 10,
  },
  {
    id: 3,
    nombre: 'Coca-Cola 1.5 L',
    presentacion_id: 3,
    presentacion_nombre: '1.5 L',
    ml: 900,
    cantidad: 2,
    stock: 4,
  },
];

describe('ColacionAcompanamientoSelector', () => {
  it('lista las bebidas del catálogo de analcohólicas', () => {
    render(
      <ColacionAcompanamientoSelector
        acompanamientos={opciones}
        selectedId=""
        loading={false}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Sprite 1\.5 L/)).toBeTruthy();
    expect(screen.getByLabelText(/Coca-Cola 1\.5 L/)).toBeTruthy();
    expect(screen.getAllByText('1.5 L')).toHaveLength(2);
  });

  it('selecciona la bebida pulsada', () => {
    const onSelect = vi.fn();
    render(
      <ColacionAcompanamientoSelector
        acompanamientos={opciones}
        selectedId=""
        loading={false}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByLabelText(/Sprite 1\.5 L/));
    expect(onSelect).toHaveBeenCalledWith('2');
  });

  it('mantiene la selección al pulsar la opción ya elegida', () => {
    const onSelect = vi.fn();
    render(
      <ColacionAcompanamientoSelector
        acompanamientos={opciones}
        selectedId="2"
        loading={false}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByLabelText(/Sprite 1\.5 L/));
    expect(onSelect).toHaveBeenCalledWith('2');
  });

  it('avisa cuando no hay bebidas disponibles para acompañar', () => {
    render(
      <ColacionAcompanamientoSelector
        acompanamientos={[]}
        selectedId=""
        loading={false}
        onSelect={vi.fn()}
      />
    );

    expect(
      screen.getByText('Sin bebidas con stock suficiente para acompañar.')
    ).toBeTruthy();
  });

  it('muestra el error del catálogo', () => {
    render(
      <ColacionAcompanamientoSelector
        acompanamientos={opciones}
        selectedId=""
        loading={false}
        error="No se pudo cargar el catálogo"
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('No se pudo cargar el catálogo')).toBeTruthy();
    expect(
      screen.queryByText('Sin bebidas con stock suficiente para acompañar.'),
    ).toBeNull();
  });
});
