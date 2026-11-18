import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PremiumCalendar } from '@/components/ui/PremiumCalendar';

type Children = { children?: ReactNode };

vi.mock('react-native', () => ({
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel
  }: Children & { onPress?: () => void; accessibilityLabel?: string }) => (
    <button aria-label={accessibilityLabel} onClick={onPress}>
      {children}
    </button>
  ),
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 }
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    accentText: '#fff',
    cardBg: '#fff',
    borderColor: '#777',
    surfaceMuted: '#eee',
    textPrimary: '#111',
    textSecondary: '#555'
  })
}));
afterEach(cleanup);

const renderCalendario = (events: { date: string; type: string }[] = []) =>
  render(
    <PremiumCalendar
      events={events}
      selectedDates={[]}
      onDateToggle={() => {}}
      currentMonth={new Date(2026, 10, 1)}
    />
  );

describe('PremiumCalendar', () => {
  it('arma la grilla de 6 semanas y navega de mes', () => {
    renderCalendario();

    // 42 días + los dos botones de navegación.
    expect(screen.getAllByRole('button')).toHaveLength(44);
    fireEvent.click(screen.getByLabelText('Mes siguiente'));
    expect(screen.getAllByRole('button')).toHaveLength(44);
  });

  it('toca un día y devuelve la fecha seleccionada', () => {
    const onDateToggle = vi.fn();
    render(
      <PremiumCalendar
        events={[]}
        selectedDates={[]}
        onDateToggle={onDateToggle}
        currentMonth={new Date(2026, 10, 1)}
      />
    );

    fireEvent.click(screen.getByLabelText('Día 15 de noviembre de 2026'));
    expect(onDateToggle).toHaveBeenCalledWith('2026-11-15');
  });

  it('la leyenda solo lista los tipos con eventos del mes visible', () => {
    renderCalendario([
      { date: '2026-11-15', type: 'propina' },
      { date: '2026-10-05', type: 'asistencia' }
    ]);

    expect(screen.getByText('Propina')).toBeTruthy();
    expect(screen.queryByText('Asistencia')).toBeNull();
  });
});
