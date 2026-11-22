import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceCard } from '@/components/cajero/servicios/ServiceCard';
import { ServiceDetailModal } from '@/components/cajero/servicios/ServiceDetailModal';

vi.mock('react-native', () => ({
  View: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Pressable: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) => (
    <button onClick={onPress}>{children}</button>
  ),
  ScrollView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));
vi.mock('@/components/ui/AnimatedView', () => ({
  AnimatedView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/AppModal', () => ({
  AppModal: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) =>
    visible ? <div>{children}</div> : null,
}));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@/api/client', () => ({ BASE_URL: 'http://localhost' }));
vi.mock('@/components/cajero/servicios/ServiceCardHeader', () => ({
  ServiceCardHeader: () => null,
}));
vi.mock('@/components/cajero/servicios/ServiceCardDetails', () => ({
  ServiceCardDetails: () => null,
}));
vi.mock('@/components/cajero/servicios/ServiceCardFinance', () => ({
  ServiceCardFinance: () => null,
}));
vi.mock('@/components/cajero/servicios/ServiceCardActions', () => ({
  ServiceCardActions: () => null,
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({ isDark: false }),
}));

const theme = {
  bg: '#fff',
  card: '#fff',
  text: '#111',
  textMuted: '#555',
  border: '#ddd',
  accent: '#933333',
  accentText: '#fff',
  success: '#0a0',
  danger: '#a00',
  warning: '#c80',
  info: '#08c',
  isDark: false,
};

const AHORA = new Date('2026-11-21T12:00:00.000Z').getTime();

const servicio = {
  id: '1-1',
  servicioId: '1',
  roomId: '1',
  roomName: 'Habitación 1',
  duration: 30,
  remainingTime: 0,
  isActive: true,
  isPaused: false,
  // Empezó hace un minuto: quedan 29:00.
  startTime: new Date(AHORA - 60 * 1000),
  servicioCode: 'ABC',
  clienteNombre: '',
  estado: 2,
};

describe('reloj de servicios activos', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('la tarjeta de servicios activos avanza sola cada segundo', () => {
    render(
      <ServiceCard
        item={servicio as any}
        activeTab="activos"
        serverOffset={0}
        theme={theme}
        readOnly
        sinAccionesBarman
      />,
    );

    expect(screen.getByText('29:00')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('28:57')).toBeTruthy();
  });

  it('el detalle de un servicio en curso avanza solo cada segundo', () => {
    render(
      <ServiceDetailModal
        visible
        service={servicio}
        theme={theme}
        onClose={vi.fn()}
        serverOffset={0}
      />,
    );

    expect(screen.getByText('29:00')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('28:57')).toBeTruthy();
  });

  it('el detalle de un servicio pausado no corre el reloj', () => {
    render(
      <ServiceDetailModal
        visible
        service={{ ...servicio, estado: 3, isPaused: true, remainingTime: 600 }}
        theme={theme}
        onClose={vi.fn()}
        serverOffset={0}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('10:00')).toBeTruthy();
  });
});
