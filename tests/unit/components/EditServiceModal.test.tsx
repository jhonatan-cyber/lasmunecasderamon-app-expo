import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditServiceModal } from '@/components/cajero/forms/EditServiceModal';
import type { Timer } from '@/context/types';

type RenderProps = {
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

const h = vi.hoisted(() => ({
  apiClientSafe: vi.fn(),
  createTemporal: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('react-native', () => ({
  ActivityIndicator: () => null,
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  FlatList: ({ data, renderItem, keyExtractor }: any) => (
    <div>
      {data.map((item: any) => (
        <React.Fragment key={keyExtractor(item)}>
          {renderItem({ item })}
        </React.Fragment>
      ))}
    </div>
  ),
  Pressable: ({ children, onPress, disabled }: RenderProps) => (
    <button onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
  ScrollView: ({ children }: RenderProps) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Text: ({ children }: RenderProps) => <span>{children}</span>,
  TextInput: () => <input />,
  View: ({ children }: RenderProps) => <div>{children}</div>,
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@/components/ui/AppModal', () => ({
  AppModal: ({
    children,
    visible,
  }: {
    children?: React.ReactNode;
    visible?: boolean;
  }) => (visible ? <div>{children}</div> : null),
}));
vi.mock('@/components/ui/ModalBottomSheet', () => ({
  ModalBottomSheet: ({
    children,
    visible,
  }: {
    children?: React.ReactNode;
    visible?: boolean;
  }) => (visible ? <div>{children}</div> : null),
}));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#6366F1',
    accentOnSurface: '#6366F1',
    bg: '#FFF',
    cardBg: '#F5F5F5',
    borderColor: '#DDD',
    textPrimary: '#111',
    textSecondary: '#666',
    isDark: false,
  }),
}));
vi.mock('@/hooks/useDebouncedEventListener', () => ({
  useDebouncedEventListener: () => undefined,
}));
vi.mock('@/api/client', () => ({
  BASE_URL: 'http://localhost',
  apiClientSafe: h.apiClientSafe,
}));
vi.mock('@/services/servicios', () => ({
  serviciosService: { createTemporal: h.createTemporal },
}));
vi.mock('@/utils/offlineGuard', () => ({ blockOffline: () => true }));
vi.mock('@/utils/toast-lazy', () => ({ showToast: h.showToast }));
vi.mock('@/utils/logger', () => ({
  default: { debug: () => undefined, error: () => undefined, warn: () => undefined },
}));

const TIMER: Timer = {
  id: 'timer-1',
  servicioId: 'srv-1',
  roomId: 'room-1',
  roomName: 'Habitación 1',
  duration: 30,
  remainingTime: 20,
  isActive: true,
  isPaused: false,
  startTime: new Date('2026-01-01T00:00:00Z'),
  servicioCode: 'S-1',
  cliente_id: null,
  clienteNombre: 'Sin cliente',
  anfitrionas: 'Ana',
  anfitrionas_ids: ['1'],
};

/** Ana ya está en el servicio; Sofía está libre. */
function mockApi() {
  h.apiClientSafe.mockImplementation(async (path: string) => {
    if (path === '/hostesses/available') {
      return {
        success: true,
        data: [{ id_usuario: 2, nick: 'Sofía', nombre: 'Sofía', apellido: 'Ruiz' }],
      };
    }
    if (path === '/services/srv-1') {
      return {
        success: true,
        data: {
          usuarios: [{ id_usuario: 1, nick: 'Ana', nombre: 'Ana', apellido: 'Paz' }],
        },
      };
    }
    if (path === '/rooms') {
      return { success: true, data: [] };
    }
    return { success: false, data: null };
  });
}

function renderModal() {
  return render(
    <EditServiceModal visible onClose={() => {}} timer={TIMER} onSuccess={() => {}} />,
  );
}

/**
 * El nick se repite en el resumen del formulario y en el selector; la opción
 * del selector es la última que se pinta porque el bottom sheet va al final.
 */
function selectorOption(nick: string) {
  const matches = screen.getAllByText(nick);
  const option = matches[matches.length - 1].closest('button');
  if (!option) throw new Error(`No se encontró la opción de ${nick} en el selector`);
  return option;
}

/** El campo de anfitrionas muestra los nicks elegidos; sin ninguna, un texto fijo. */
async function waitForFormHostesses(visibleText: string) {
  const inFormField = () =>
    screen.getAllByText(visibleText).filter((element) => element.closest('button'));
  await waitFor(() => expect(inFormField().length).toBeGreaterThan(0));
}

/** Abre el selector pulsando el campo de anfitrionas del formulario. */
function openSelector() {
  const field = screen
    .getAllByText('Ana')
    .find((element) => element.closest('button'));
  if (!field) throw new Error('No se encontró el campo de anfitrionas');
  fireEvent.click(field);
}

afterEach(cleanup);

beforeEach(() => {
  h.apiClientSafe.mockReset();
  h.createTemporal.mockReset();
  h.createTemporal.mockResolvedValue({ success: true });
  h.showToast.mockReset();
  mockApi();
});

describe('EditServiceModal — anfitrionas del servicio', () => {
  it('deja quitar y volver a añadir a una anfitriona que ya está en el servicio', async () => {
    renderModal();
    await waitForFormHostesses('Ana');

    openSelector();

    // Ana viene con estado_servicio 1 porque ya está en el servicio, pero está
    // en allowedOccupiedIds: el selector debe dejarla deseleccionar.
    const opcion = selectorOption('Ana');
    expect(opcion.disabled).toBe(false);

    fireEvent.click(opcion);
    await waitForFormHostesses('Ninguna seleccionada');

    fireEvent.click(selectorOption('Ana'));
    await waitFor(() => expect(screen.queryAllByText('Ninguna seleccionada')).toHaveLength(0));
  });

  it('envía la lista de anfitrionas resultante al guardar', async () => {
    renderModal();
    await waitForFormHostesses('Ana');

    openSelector();

    // Quita a Ana y añade a Sofía, que está libre.
    fireEvent.click(selectorOption('Ana'));
    fireEvent.click(selectorOption('Sofía'));

    await waitFor(() => expect(screen.queryAllByText('Ninguna seleccionada')).toHaveLength(0));

    fireEvent.click(screen.getByText('INICIAR SERVICIO'));

    await waitFor(() => expect(h.createTemporal).toHaveBeenCalledTimes(1));
    const [payload] = h.createTemporal.mock.calls[0];
    expect(payload.usuarios).toEqual(['2']);
    expect(payload.servicio_original_id).toBe('srv-1');
    expect(payload.tiempo).toBe(30);
  });

  it('no guarda si el servicio se quedó sin anfitrionas', async () => {
    renderModal();
    await waitForFormHostesses('Ana');

    openSelector();
    fireEvent.click(selectorOption('Ana'));
    await waitForFormHostesses('Ninguna seleccionada');

    fireEvent.click(screen.getByText('INICIAR SERVICIO'));

    await waitFor(() =>
      expect(h.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          text2: 'Debe seleccionar al menos una anfitriona',
        }),
      ),
    );
    expect(h.createTemporal).not.toHaveBeenCalled();
  });
});
