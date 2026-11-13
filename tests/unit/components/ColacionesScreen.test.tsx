import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ColacionesScreen from '@/components/screens/ColacionesScreen';
import type { ColacionRegistro } from '@/services/colaciones-helpers';

const state = vi.hoisted(() => ({
  registros: [] as ColacionRegistro[],
  loading: false,
  error: null as string | null,
  role: 'cajero',
}));
type Children = { children?: ReactNode; accessibilityLabel?: string };
vi.mock('react-native', () => ({
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
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
vi.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: vi.fn() }),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/components/ui/PremiumHeader', () => ({
  PremiumHeader: ({ rightComponent }: { rightComponent?: ReactNode }) => <div>{rightComponent}</div>,
}));
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (value: { user: { role: string } }) => unknown) =>
    selector({ user: { role: state.role } }),
}));
vi.mock('@/hooks/useAccentColor', () => ({ useAccentColor: () => ({}) }));
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
    cargarReglas: vi.fn(),
    cargarCatalogos: vi.fn(),
    cargarTrabajadores: vi.fn(),
    cargarRegistros: vi.fn(),
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
  it.each(['cajero', 'barman'])('muestra el rol %s de la sesión en el encabezado', role => {
    state.role = role;
    render(<ColacionesScreen />);
    expect(screen.getByText(role, { exact: true })).toBeTruthy();
  });
  it('cuenta registros, normaliza roles y conserva roles desconocidos o ausentes', () => {
    render(<ColacionesScreen />);
    expect(screen.getByText('6 registrados')).toBeTruthy();
    for (const name of [
      'Todos, 6 colaciones',
      'Anfitriona, 2 colaciones',
      'Barman, 1 colación',
      'Garzón, 1 colación',
      'Supervisor, 1 colación',
      'Sin rol, 1 colación',
    ]) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    const filters = screen.getByLabelText('Filtrar colaciones por rol');
    expect(
      [...filters.querySelectorAll('button')].map((node) => node.textContent),
    ).toEqual([
      'Todos · 6',
      'Anfitriona · 2',
      'Garzón · 1',
      'Barman · 1',
      'Sin rol · 1',
      'Supervisor · 1',
    ]);
  });

  it('filtra por rol del receptor, no por el operador, y el contador corresponde al detalle visible', () => {
    render(<ColacionesScreen />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Anfitriona, 2 colaciones' }),
    );
    expect(screen.getByText('2 registrados')).toBeTruthy();
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('Berta')).toBeTruthy();
    expect(screen.queryByText('Carlos')).toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Anfitriona, 2 colaciones' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: 'Todos, 6 colaciones' }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Barman, 1 colación' }),
    );
    expect(screen.getByText('1 registrado')).toBeTruthy();
    expect(screen.getByText('Carlos')).toBeTruthy();
    expect(screen.queryByText('Ana')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Todos, 6 colaciones' }),
    );
    expect(screen.getByText('6 registrados')).toBeTruthy();
  });

  it('vuelve a Todos cuando un refresco elimina el rol elegido', () => {
    const { rerender } = render(<ColacionesScreen />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Anfitriona, 2 colaciones' }),
    );
    state.registros = [row(3, 'Carlos', 'barman')];
    rerender(<ColacionesScreen />);
    expect(screen.getByText('Carlos')).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Todos, 1 colación' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('conserva carga, error y vacío sin filtros con datos obsoletos', () => {
    state.loading = true;
    const { rerender } = render(<ColacionesScreen />);
    expect(screen.getByText('Cargando colaciones…')).toBeTruthy();
    expect(screen.queryByLabelText('Filtrar colaciones por rol')).toBeNull();
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
    expect(screen.queryByLabelText('Filtrar colaciones por rol')).toBeNull();
  });
});
