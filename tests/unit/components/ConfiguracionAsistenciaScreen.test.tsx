import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConfiguracionAsistenciaScreen from '@/components/screens/ConfiguracionAsistenciaScreen';
import { useConfiguracionAsistencia } from '@/hooks/useConfiguracionAsistencia';
import { useIsAdmin } from '@/hooks/useIsAdmin';

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
  ActivityIndicator: () => <span>cargando</span>,
  Alert: { alert: vi.fn() },
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
  useWindowDimensions: () => ({ width: 390, height: 844, fontScale: 1 }),
  useColorScheme: () => 'dark',
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
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
  cargarPantallas: vi.fn(),
  revocarPantalla: vi.fn(() => Promise.resolve(true)),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useConfiguracionAsistencia).mockReturnValue(estadoPantallas as any);
});

afterEach(() => {
  cleanup();
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
});
