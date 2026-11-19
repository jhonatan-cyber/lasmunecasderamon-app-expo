import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ColacionesScreen from '@/components/screens/ColacionesScreen';
import type { ColacionRegistro } from '@/services/colaciones';

const state = vi.hoisted(() => ({
  registros: [] as ColacionRegistro[],
  loading: false,
  error: null as string | null,
  role: 'cajero',
}));
type Children = { children?: ReactNode; accessibilityLabel?: string };
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
  View: ({ children, accessibilityLabel }: Children) => (
    <div aria-label={accessibilityLabel}>{children}</div>
  ),
  ScrollView: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityState,
    disabled,
  }: Children & {
    onPress?: () => void;
    accessibilityState?: { selected?: boolean };
    disabled?: boolean;
  }) => (
    <button
      onClick={onPress}
      aria-label={accessibilityLabel}
      aria-pressed={accessibilityState?.selected}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  RefreshControl: () => null,
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
  Modal: ({ children, visible }: any) => (visible ? <div>{children}</div> : null),
  KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
vi.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: vi.fn() }),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/components/ui/ModalBottomSheet', () => ({
  ModalBottomSheet: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/AnimatedView', () => ({
  AnimatedView: ({ children }: Children) => <div>{children}</div>,
}));
vi.mock('@/components/ui/PremiumHeader', () => ({
  PremiumHeader: ({ title, subtitle }: { title?: string; subtitle?: string }) => (
    <div>
      <span>{title}</span>
      <span>{subtitle}</span>
    </div>
  ),
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (value: { user: { role: string } }) => unknown) =>
    selector({ user: { role: state.role } }),
}));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    bg: '#fff',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777',
    isDark: false,
  }),
}));
vi.mock('@/components/colaciones/ColacionWorkerModal', () => ({
  ColacionWorkerModal: () => null,
}));
vi.mock('@/components/colaciones/ColacionProductsCarousel', () => ({
  ColacionProductsCarousel: () => null,
}));
vi.mock('@/components/colaciones/ColacionAcompanamientoSelector', () => ({
  ColacionAcompanamientoSelector: () => null,
}));
vi.mock('@/hooks/useColacionesScreen', () => ({
  useColacionesScreen: () => ({
    accentColor: '#933333',
    bg: '#fff',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777',
    rule: null,
    ruleFromWorker: null,
    productos: [],
    analcoholicas: [],
    trabajadores: [],
    acompanamientos: [],
    catalogoVisible: [],
    registros: state.registros,
    registrosLoading: state.loading,
    registrosError: state.error,
    saving: false,
    workerId: '',
    productoId: '',
    acompanamientoId: '',
    cajaAbierta: false,
    isCajaAbierta: false,
    selectedWorker: null,
    productoSeleccionado: null,
    opcionBotella: null,
    selectedAcompanamiento: null,
    requiereAcompanamiento: false,
    setSelectedWorker: vi.fn(),
    setSelectedProducto: vi.fn(),
    setSelectedAcompanamiento: vi.fn(),
    registrar: vi.fn(),
    recargar: vi.fn(),
    recepcionesPorTrabajador: {},
  }),
}));
const row = (
  id: number,
  name: string,
  rol?: string | null,
): ColacionRegistro => ({
  id,
  usuario_id: String(id),
  usuario_nombre: name,
  rol,
  registrado_por_nombre: 'Operador',
  fecha: '2026-11-01',
  fecha_crea: '2026-11-01T12:00:00Z',
});
beforeEach(() => {
  state.registros = [
    row(1, 'Ana', 'anfitriona'),
    row(2, 'Berta', ' Anfitriona '),
    row(3, 'Carlos', 'barman'),
    row(4, 'Diego', 'garzon'),
    row(5, 'Elena', 'supervisor'),
    row(6, 'Felipe', null),
  ];
  state.loading = false;
  state.error = null;
  state.role = 'cajero';
});
afterEach(cleanup);

describe('ColacionesScreen: filtro del historial por rol receptor', () => {
  it('rotula el encabezado con las colaciones del turno', () => {
    render(<ColacionesScreen />);
    expect(screen.getByText('Colaciones')).toBeTruthy();
    expect(
      screen.getByText('Un corto por trabajador durante el turno'),
    ).toBeTruthy();
  });

  it('cuenta los registros y lista un filtro por rol con su conteo', () => {
    render(<ColacionesScreen />);
    expect(screen.getByText('6 registrados')).toBeTruthy();
    // El filtro usa el rol tal cual llega del backend: no lo normaliza, así que
    // 'anfitriona' y ' Anfitriona ' son dos pestañas distintas.
    for (const name of [
      'Todos (6)',
      'anfitriona (1)',
      'Anfitriona (1)',
      'barman (1)',
      'garzon (1)',
      'supervisor (1)',
    ]) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('filtra por rol del receptor, no por el operador', () => {
    render(<ColacionesScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'anfitriona (1)' }));
    // El contador muestra el total del turno, no el del filtro.
    expect(screen.getByText('6 registrados')).toBeTruthy();
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.queryByText('Berta')).toBeNull();
    expect(screen.queryByText('Carlos')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'barman (1)' }));
    expect(screen.getByText('Carlos')).toBeTruthy();
    expect(screen.queryByText('Ana')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Todos (6)' }));
    expect(screen.getByText('6 registrados')).toBeTruthy();
    expect(screen.getByText('Ana')).toBeTruthy();
  });

  it('deja el filtro vacío cuando un refresco se lleva el rol elegido', () => {
    const { rerender } = render(<ColacionesScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'anfitriona (1)' }));
    state.registros = [row(3, 'Carlos', 'barman')];
    rerender(<ColacionesScreen />);
    expect(screen.getByText('No hay colaciones para este filtro.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'anfitriona (1)' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Todos (1)' }));
    expect(screen.getByText('Carlos')).toBeTruthy();
  });

  it('conserva carga, error y vacío sin filtros con datos obsoletos', () => {
    state.loading = true;
    const { rerender } = render(<ColacionesScreen />);
    expect(screen.getByText('Cargando colaciones…')).toBeTruthy();
    state.loading = false;
    state.error = 'Error del historial';
    rerender(<ColacionesScreen />);
    expect(screen.getByText('Error del historial')).toBeTruthy();
    expect(screen.queryByText('Ana')).toBeNull();
    state.error = null;
    state.registros = [];
    rerender(<ColacionesScreen />);
    expect(
      screen.getByText('Aún no hay colaciones en este turno.'),
    ).toBeTruthy();
    expect(screen.getByText('0 registrados')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Todos (0)' })).toBeNull();
  });
});
