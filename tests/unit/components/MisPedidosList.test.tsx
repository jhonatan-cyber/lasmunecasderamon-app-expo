import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MisPedidosList } from '@/components/garzon/pedidos/MisPedidosList';

const mockPedidosState = vi.hoisted(() => ({
  pedidos: [
    { id_pedido: '1', codigo: 'P-ANTERIOR', estado: 1, total: 50000, fecha_crea: '2026-11-26T10:00:00Z' },
    { id_pedido: '2', codigo: 'P-RECIENTE', estado: 1, total: 10000, fecha_crea: '2026-11-27T10:00:00Z' },
  ],
}));

type PressableProps = {
  children?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

vi.mock('react-native', () => ({
  ActivityIndicator: () => null,
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Pressable: ({ children, onPress, accessibilityLabel }: PressableProps) => (
    <button onClick={onPress} aria-label={accessibilityLabel}>{children}</button>
  ),
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
  RefreshControl: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  FlatList: ({ data, renderItem, ListHeaderComponent, ListEmptyComponent }: any) => (
    <div>
      {ListHeaderComponent}
      {data.length > 0
        ? data.map((item: unknown, index: number) => (
            <React.Fragment key={index}>{renderItem({ item })}</React.Fragment>
          ))
        : ListEmptyComponent}
    </div>
  ),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    accentOnSurface: '#933333',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#ddd',
  }),
}));
vi.mock('@/hooks/useMisPedidos', () => ({
  useMisPedidos: () => ({
    pedidos: mockPedidosState.pedidos,
    loading: false,
    refreshing: false,
    error: '',
    fromCache: false,
    onRefresh: vi.fn(),
    fetchPedidos: vi.fn(),
  }),
}));
vi.mock('@/components/ui/FilterTabs', () => ({
  FilterTabs: ({ tabs, activeKey, onTabPress }: any) => (
    <div>
      {tabs.map((tab: { key: string; label: string }) => (
        <button
          key={tab.key}
          aria-pressed={activeKey === tab.key}
          onClick={() => onTabPress(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('@/components/ui/SearchBar', () => ({
  SearchBar: ({ value, onChangeText, onClear, compact }: any) => (
    <div data-compact={compact ? 'true' : 'false'}>
      <input
        aria-label="Buscar pedidos"
        value={value}
        onChange={(event) => onChangeText(event.target.value)}
      />
      <button aria-label="Limpiar búsqueda" onClick={onClear}>Limpiar</button>
    </div>
  ),
}));
vi.mock('@/components/shared/EmployeeListError', () => ({ EmployeeListError: () => null }));
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, message, actionLabel, onAction }: any) => (
    <div>
      <span>{title}</span>
      <span>{message}</span>
      {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
    </div>
  ),
}));
vi.mock('@/components/garzon/pedidos/PedidosResumen', () => ({
  PedidosResumen: () => <div data-testid="pedidos-resumen">Resumen de pedidos</div>,
}));
vi.mock('@/components/garzon/pedidos/PedidoCard', () => ({
  PedidoCard: ({ pedido }: { pedido: { codigo: string } }) => (
    <div data-testid="pedido-card">{pedido.codigo}</div>
  ),
}));
vi.mock('@/components/garzon/pedidos/PedidoDetailModal', () => ({ PedidoDetailModal: () => null }));
vi.mock('@/components/ui/ActionSheet', async () => {
  const { default: React } = await import('react');
  return {
    ActionSheet: ({ visible, title, subtitle, items }: any) => visible ? (
      <div>
        <span>{title}</span>
        <span>{subtitle}</span>
        {items.map((item: { label: string; onPress: () => void }) => (
          <button key={item.label} onClick={item.onPress}>{item.label}</button>
        ))}
      </div>
    ) : null,
  };
});

afterEach(() => {
  cleanup();
  mockPedidosState.pedidos = [
    { id_pedido: '1', codigo: 'P-ANTERIOR', estado: 1, total: 50000, fecha_crea: '2026-11-26T10:00:00Z' },
    { id_pedido: '2', codigo: 'P-RECIENTE', estado: 1, total: 10000, fecha_crea: '2026-11-27T10:00:00Z' },
  ];
});

describe('MisPedidosList orden inicial', () => {
  it('omite las estadísticas y mantiene compacto el buscador', () => {
    render(<MisPedidosList onNuevoPedido={() => {}} />);

    expect(screen.queryByTestId('pedidos-resumen')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Buscar pedidos' }).parentElement?.getAttribute('data-compact')).toBe('true');
  });

  it('muestra primero el pedido con la fecha más reciente', () => {
    render(<MisPedidosList onNuevoPedido={() => {}} />);

    expect(screen.getAllByTestId('pedido-card').map((card) => card.textContent)).toEqual([
      'P-RECIENTE',
      'P-ANTERIOR',
    ]);
  });

  it('describe la dirección de fechas con claridad en el selector', () => {
    render(<MisPedidosList onNuevoPedido={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ordenar pedidos por Fecha' }));

    expect(screen.getByText('Más recientes primero · toca la flecha para invertir')).toBeTruthy();
  });

  it('permite limpiar la búsqueda y el estado cuando no hay coincidencias', () => {
    render(<MisPedidosList onNuevoPedido={() => {}} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar pedidos' }), {
      target: { value: 'sin coincidencias' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Aprobados' }));

    expect(screen.getByText('No se encontraron pedidos')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda y filtros' }));

    expect(screen.getByRole('textbox', { name: 'Buscar pedidos' }).getAttribute('value')).toBe('');
    expect(screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByTestId('pedido-card')).toHaveLength(2);
  });

  it('ofrece crear un pedido cuando el historial está realmente vacío', () => {
    mockPedidosState.pedidos = [];
    const onNuevoPedido = vi.fn();
    render(<MisPedidosList onNuevoPedido={onNuevoPedido} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo pedido' }));

    expect(onNuevoPedido).toHaveBeenCalledTimes(1);
  });
});