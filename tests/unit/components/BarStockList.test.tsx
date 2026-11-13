import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarStockList } from '@/components/barman/bar/BarStockList';
import type { BarStockItem } from '@/hooks/useBarScreen';

const list = vi.hoisted(() => ({
  rows: [] as unknown[],
  numColumns: undefined as number | undefined,
}));
type Children = { children?: ReactNode; accessibilityLabel?: string };
vi.mock('react-native', () => ({
  View: ({ children, accessibilityLabel }: Children) => (
    <div aria-label={accessibilityLabel}>{children}</div>
  ),
  Text: ({
    children,
    accessibilityRole,
  }: Children & { accessibilityRole?: string }) =>
    accessibilityRole === 'header' ? (
      <h2>{children}</h2>
    ) : (
      <span>{children}</span>
    ),
  Pressable: ({
    children,
    onPress,
    accessibilityLabel,
    accessibilityState,
  }: Children & {
    onPress?: () => void;
    accessibilityState?: { selected?: boolean };
  }) => (
    <button
      onClick={onPress}
      aria-label={accessibilityLabel}
      aria-pressed={accessibilityState?.selected}
    >
      {children}
    </button>
  ),
  RefreshControl: ({ onRefresh }: { onRefresh: () => void }) => (
    <button onClick={onRefresh}>Actualizar</button>
  ),
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
vi.mock('@/components/ui/SkeletonLoader', () => ({
  SkeletonLoader: () => <div data-testid="skeleton" />,
}));
vi.mock('@/api/client', () => ({ BASE_URL: 'https://example.test' }));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    cardBg: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    borderColor: '#777',
  }),
}));
vi.mock('@/hooks/utils/saleChoice', () => ({
  resolverVentaProducto: (item: BarStockItem) => ({
    opciones: [
      {
        value: 'botella',
        nombre: 'Botella',
        precio: item.precio_venta,
        comision: item.comision,
        esShot: false,
      },
    ],
  }),
}));
vi.mock('@/components/shared/FlashList', () => ({
  default: <T,>({
    data,
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    refreshControl,
    numColumns,
  }: {
    data: T[];
    renderItem: (props: { item: T }) => ReactNode;
    keyExtractor: (item: T) => string;
    ListEmptyComponent?: ReactNode;
    refreshControl?: ReactNode;
    numColumns?: number;
  }) => {
    list.rows = data;
    list.numColumns = numColumns;
    return (
      <div>
        {refreshControl}
        {data.length
          ? data.map((item) => (
              <div key={keyExtractor(item)}>{renderItem({ item })}</div>
            ))
          : ListEmptyComponent}
      </div>
    );
  },
}));
afterEach(cleanup);

const product = (id: string, category?: string | null): BarStockItem => ({
  id,
  producto_id: id,
  producto_nombre: `Producto ${id}`,
  nombre: 'Presentación',
  categoria_nombre: category,
  codigo_barras: null,
  precio_venta: 100,
  comision: 10,
  stock: 1,
  stock_bar: 1,
});
const items = [
  product('1', 'Ron'),
  product('2', 'Vodka'),
  product('3', 'Ron'),
  product('4'),
  product('5', 'Ron'),
];
const props = { loading: false, refreshing: false, onRefresh: vi.fn() };

describe('BarStockList', () => {
  it('agrupa encabezados accesibles y pares sin mezclar categorías ni estirar la tarjeta impar', () => {
    render(<BarStockList {...props} items={items} />);
    expect(
      screen.getAllByRole('heading').map((node) => node.textContent),
    ).toEqual(['Ron (3)', 'Sin categoría (1)', 'Vodka (1)']);
    expect(list.numColumns).toBeUndefined();
    expect(list.rows).toMatchObject([
      { type: 'header', category: 'Ron', count: 3 },
      { type: 'products', items: [{ id: '1' }, { id: '3' }] },
      { type: 'products', items: [{ id: '5' }] },
      { type: 'header', category: 'Sin categoría', count: 1 },
      { type: 'products', items: [{ id: '4' }] },
      { type: 'header', category: 'Vodka', count: 1 },
      { type: 'products', items: [{ id: '2' }] },
    ]);
    expect(items.map((item) => item.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('navega a una categoría y vuelve a todas conservando conteos', () => {
    render(<BarStockList {...props} items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ron, 3 productos' }));
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.queryByText('Producto 2')).toBeNull();
    expect(
      screen
        .getByRole('button', { name: 'Ron, 3 productos' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Todas, 5 productos' }));
    expect(screen.getByText('Producto 2')).toBeTruthy();
  });

  it('muestra los resultados de búsqueda si desaparece la categoría elegida', () => {
    const { rerender } = render(<BarStockList {...props} items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ron, 3 productos' }));
    rerender(
      <BarStockList
        {...props}
        items={[product('2', 'Vodka')]}
        search="vodka"
      />,
    );
    expect(screen.getByText('Producto 2')).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Todas, 1 producto' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    rerender(<BarStockList {...props} items={[]} search="inexistente" />);
    expect(screen.getByText('Sin productos para esta búsqueda')).toBeTruthy();
    expect(screen.queryAllByRole('heading')).toHaveLength(0);
  });

  it('mantiene vacío, carga, error y refresco', () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <BarStockList {...props} items={[]} onRefresh={onRefresh} />,
    );
    expect(screen.getByText('Sin productos en el bar')).toBeTruthy();
    fireEvent.click(screen.getByText('Actualizar'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    rerender(<BarStockList {...props} items={[]} loading />);
    expect(screen.getAllByTestId('skeleton')).toHaveLength(8);
    rerender(
      <BarStockList {...props} items={[]} error="No se pudo cargar el stock" />,
    );
    expect(screen.getByText('No se pudo cargar el stock')).toBeTruthy();
  });
});
