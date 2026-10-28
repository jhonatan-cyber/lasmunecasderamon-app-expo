import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConfiguracionAsistenciaScreen from '@/components/screens/ConfiguracionAsistenciaScreen';
import { useConfiguracionAsistencia } from '@/hooks/useConfiguracionAsistencia';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useModoPantallaStore } from '@/store/modoPantallaStore';

// El mock global de `react-native` sólo cubre lo que usan los hooks; esta
// pantalla necesita además TextInput, ScrollView y Pressable, así que se
// re-declara lo mínimo para renderizar y verificar qué se muestra.
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  View: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  TextInput: ({ style, onChangeText, placeholderTextColor, keyboardType, accessibilityLabel, ...props }: any) => (
    <input {...props} onChange={(event) => onChangeText?.(event.target.value)} />
  ),
  ScrollView: ({ children }: any) => <div>{children}</div>,
  Pressable: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
  Modal: ({ visible, children }: any) => (visible ? <div>{children}</div> : null),
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  ActivityIndicator: () => <span>cargando</span>,
  Alert: { alert: vi.fn() },
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  useColorScheme: () => 'dark',
}));

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));

vi.mock('expo-router', () => ({
  useRouter: () => routerMock,
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({
  default: ({ name }: any) => <span>{name}</span>,
}));

vi.mock('@/components/ui/PremiumHeader', () => ({
  PremiumHeader: ({ title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/SkeletonLoader', () => ({
  SkeletonLoader: () => <span>cargando</span>,
}));

vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#E11D48',
    gradientColors: ['#000', '#111'],
    isDark: true,
    bg: '#000000',
    cardBg: '#111111',
    borderColor: 'rgba(0,0,0,0.05)',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
  }),
}));

vi.mock('@/utils/toast-lazy', () => ({ showToast: vi.fn() }));

vi.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: vi.fn() }));
vi.mock('@/hooks/useConfiguracionAsistencia', () => ({
  useConfiguracionAsistencia: vi.fn(),
}));

const estadoPantallas = {
  ventana: {
    asistencia_hora_inicio: 21,
    asistencia_minuto_inicio: 0,
    asistencia_hora_fin: 23,
    asistencia_minuto_fin: 0,
  },
  setVentana: vi.fn(),
  guardada: {
    asistencia_hora_inicio: 21,
    asistencia_minuto_inicio: 0,
    asistencia_hora_fin: 23,
    asistencia_minuto_fin: 0,
  },
  sucio: false,
  valida: true,
  loadingVentana: false,
  saving: false,
  guardarVentana: vi.fn(() => Promise.resolve(true)),
  pantallas: [],
  loadingPantallas: false,
  allowed: true,
  errorPantallas: '',
  revocando: null,
  activando: false,
  cargarPantallas: vi.fn(),
  activarPantalla: vi.fn(() => Promise.resolve(true)),
  revocarPantalla: vi.fn(() => Promise.resolve(true)),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useConfiguracionAsistencia).mockReturnValue(estadoPantallas as any);
});

afterEach(() => {
  cleanup();
  useModoPantallaStore.setState({ activo: false, nombre: null, cargado: false });
});

describe('ConfiguracionAsistenciaScreen — contenido exclusivo de administradores', () => {
  it('muestra las secciones "Ventana de asistencia" y "Pantallas de asistencia" para un admin', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);

    render(<ConfiguracionAsistenciaScreen />);

    expect(screen.getByText('Ventana de asistencia')).toBeDefined();
    expect(screen.getByText('Pantallas de asistencia')).toBeDefined();
  });

  it('oculta las secciones de configuración para un usuario no administrador', () => {
    vi.mocked(useIsAdmin).mockReturnValue(false);

    render(<ConfiguracionAsistenciaScreen />);

    expect(screen.queryByText('Ventana de asistencia')).toBeNull();
    expect(screen.queryByText('Pantallas de asistencia')).toBeNull();
    expect(screen.getByText('Solo administradores')).toBeDefined();
  });

  it('ofrece activar este dispositivo como pantalla de asistencia al admin', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);

    render(<ConfiguracionAsistenciaScreen />);

    expect(screen.getByText('Nombre de esta pantalla')).toBeDefined();
    expect(screen.getByText('Activar pantalla de asistencia')).toBeDefined();
  });

  it('no ofrece activar el dispositivo cuando el servidor niega el permiso', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.mocked(useConfiguracionAsistencia).mockReturnValue({
      ...estadoPantallas,
      allowed: false,
    } as any);

    render(<ConfiguracionAsistenciaScreen />);

    expect(screen.queryByText('Activar pantalla de asistencia')).toBeNull();
    expect(
      screen.getByText('No tenés permisos de administrador para ver las pantallas vinculadas.'),
    ).toBeDefined();
  });

  it('muestra un aviso antes de activar y sólo activa al confirmar', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);

    render(<ConfiguracionAsistenciaScreen />);

    fireEvent.change(screen.getByPlaceholderText('Ej. Entrada del local'), {
      target: { value: 'Entrada del local' },
    });
    fireEvent.click(screen.getByText('Activar pantalla de asistencia'));

    expect(
      screen.getByText(
        'Este dispositivo quedará vinculado como "Entrada del local" y pasará a mostrar la asistencia del personal. Podrás salir del modo pantalla desde el botón "Salir", que cierra la sesión.',
      ),
    ).toBeDefined();
    expect(estadoPantallas.activarPantalla).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText('Activar'));
    });

    expect(estadoPantallas.activarPantalla).toHaveBeenCalledWith('Entrada del local');
    expect(useModoPantallaStore.getState().activo).toBe(true);
    expect(useModoPantallaStore.getState().nombre).toBe('Entrada del local');
    expect(routerMock.replace).toHaveBeenCalledWith('/(app)/cajero/pantalla-asistencia');
  });

  it('cancelar el aviso no activa la pantalla', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);

    render(<ConfiguracionAsistenciaScreen />);

    fireEvent.change(screen.getByPlaceholderText('Ej. Entrada del local'), {
      target: { value: 'Entrada del local' },
    });
    fireEvent.click(screen.getByText('Activar pantalla de asistencia'));
    fireEvent.click(screen.getByText('Cancelar'));

    expect(estadoPantallas.activarPantalla).not.toHaveBeenCalled();
    expect(useModoPantallaStore.getState().activo).toBe(false);
    expect(screen.queryByText('Cancelar')).toBeNull();
  });
});

describe('ConfiguracionAsistenciaScreen — desvincular pantallas', () => {
  const pantalla = {
    id: 'kiosk-7',
    nombre: 'Barra',
    ultimo_uso: '2026-10-28 10:00',
    expira_en: '2026-11-28 10:00',
    revocado_en: null,
    activo: true,
  };

  beforeEach(() => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.mocked(useConfiguracionAsistencia).mockReturnValue({
      ...estadoPantallas,
      pantallas: [pantalla],
    } as any);
  });

  it('pide confirmación y desvincula sólo al confirmar', async () => {
    render(<ConfiguracionAsistenciaScreen />);

    fireEvent.click(screen.getByText('Desvincular'));

    expect(
      screen.getByText(
        '¿Desvincular "Barra" de la asistencia? El dispositivo dejará de estar autorizado para registrar asistencia.',
      ),
    ).toBeDefined();
    expect(estadoPantallas.revocarPantalla).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText('Sí, desvincular'));
    });

    expect(estadoPantallas.revocarPantalla).toHaveBeenCalledWith('kiosk-7');
  });

  it('cancelar el aviso no desvincula la pantalla', () => {
    render(<ConfiguracionAsistenciaScreen />);

    fireEvent.click(screen.getByText('Desvincular'));
    fireEvent.click(screen.getByText('Cancelar'));

    expect(estadoPantallas.revocarPantalla).not.toHaveBeenCalled();
  });
});
