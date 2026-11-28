import React, { type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PedidosCatalogScreen } from '@/components/garzon/pedidos/PedidosCatalogScreen';

const state = vi.hoisted(() => ({
  loading: false,
  cart: [] as { quantity: number }[],
  total: 0,
  splitShorts: vi.fn(),
  router: { back: vi.fn(), push: vi.fn() },
  productSearch: {
    searchResults: [] as any[],
    searchLoading: false,
    searchError: '',
    setSearchProducto: vi.fn(),
    handleSearchNow: vi.fn(),
  },
}));
type Children = { children?: ReactNode };

vi.mock('react-native', () => ({
  View: ({ children }: Children) => <div>{children}</div>,
  Text: ({ children }: Children) => <span>{children}</span>,
  Pressable: ({ children, onPress, accessibilityLabel }: Children & {
    onPress?: () => void;
    accessibilityLabel?: string;
  }) => (
    <button onClick={onPress} aria-label={accessibilityLabel}>
      {children}
    </button>
  ),
  RefreshControl: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
}));

vi.mock('expo-router', () => ({
  useRouter: () => state.router,
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('@/hooks/useAccentColor', () => ({
  useAccentColor: () => ({
    accentColor: '#933333',
    gradientColors: ['#933333', '#711f1f'],
    bg: '#fff',
    cardBg: '#fff',
    borderColor: '#ddd',
    textPrimary: '#111',
    textSecondary: '#555',
    accentOnSurface: '#711f1f',
  }),
}));
vi.mock('@/hooks/useResponsiveMetrics', () => ({
  useResponsiveMetrics: () => ({ isTablet: false, isLandscape: false }),
}));
vi.mock('@/hooks/useVentaSearch', () => ({
  useVentaSearch: () => state.productSearch,
}));
vi.mock('@/hooks/usePedidosScreen', () => ({
  usePedidosScreen: () => ({
    categories: [],
    loading: state.loading,
    refreshing: false,
    error: '',
    fromCache: false,
    fetchCategories: vi.fn(),
    onRefresh: vi.fn(),
  }),
}));
vi.mock('@/store/cartStore', () => {
  const useCartStore = (
    selector: (cartState: { cart: typeof state.cart; getTotal: () => number }) => unknown,
  ) =>
    selector({ cart: state.cart, getTotal: () => state.total });
  useCartStore.getState = () => ({ splitShorts: state.splitShorts });
  return { useCartStore };
});
vi.mock('@/components/shared/VirtualizedList', () => ({
  default: ({ ListHeaderComponent, ListEmptyComponent }: any) => (
    <div>{ListHeaderComponent}{ListEmptyComponent}</div>
  ),
}));
vi.mock('@/components/shared/CategoryCard', () => ({ CategoryCard: () => null }));
vi.mock('@/components/shared/EmployeeListError', () => ({ EmployeeListError: () => null }));
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock('@/components/ui/SearchBar', () => ({
  SearchBar: ({ value, onChangeText, accessibilityLabel }: any) => (
    <input
      aria-label={accessibilityLabel}
      value={value}
      onChange={(event) => onChangeText(event.target.value)}
    />
  ),
}));
vi.mock('@/components/ui/PremiumHeader', () => ({
  PremiumHeader: ({
    tabs,
    activeTab,
    onTabChange,
  }: {
    tabs?: { id: string; label: string }[];
    activeTab?: string;
    onTabChange?: (key: string) => void;
  }) => (
    <div>
      {tabs?.map((tab) => (
        <button
          key={tab.id}
          aria-pressed={activeTab === tab.id}
          onClick={() => onTabChange?.(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('@/components/garzon/GarzonOfflineBanner', () => ({ GarzonOfflineBanner: () => null }));
vi.mock('@/components/barman/BarmanOfflineBanner', () => ({ BarmanOfflineBanner: () => null }));
vi.mock('@/components/garzon/pedidos/PedidosSkeleton', () => ({
  PedidosSkeleton: ({ headerSlot }: { headerSlot?: ReactNode }) => <>{headerSlot}</>,
}));
vi.mock('@/components/garzon/pedidos/MisPedidosList', () => ({
  MisPedidosList: ({ onNuevoPedido }: { onNuevoPedido: () => void }) => (
    <div>
      <span>Historial de pedidos propio</span>
      <button onClick={onNuevoPedido}>Crear desde historial</button>
    </div>
  ),
}));
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  state.loading = false;
  state.cart = [];
  state.total = 0;
  state.splitShorts.mockReset();
  state.productSearch.searchResults = [];
  state.productSearch.searchLoading = false;
  state.productSearch.searchError = '';
  state.productSearch.setSearchProducto.mockReset();
  state.productSearch.handleSearchNow.mockReset();
  state.router.back.mockReset();
  state.router.push.mockReset();
});

describe('PedidosCatalogScreen', () => {
  it.each(['garzon', 'barman'] as const)(
    'permite alternar entre crear y consultar pedidos para %s',
    (role) => {
      render(<PedidosCatalogScreen role={role} />);

      expect(screen.queryByText('Historial de pedidos propio')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Mis pedidos' }));
      expect(screen.getByText('Historial de pedidos propio')).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: 'Crear desde historial' }));
      expect(screen.queryByText('Historial de pedidos propio')).toBeNull();
      expect(screen.getByRole('button', { name: 'Mis pedidos' })).toBeTruthy();
    },
  );

  it.each(['garzon', 'barman'] as const)(
    'mantiene accesible el historial mientras carga el catálogo para %s',
    (role) => {
      state.loading = true;
      render(<PedidosCatalogScreen role={role} />);

      fireEvent.click(screen.getByRole('button', { name: 'Mis pedidos' }));
      expect(screen.getByText('Historial de pedidos propio')).toBeTruthy();
    },
  );

  it('mantiene un resumen fijo con cantidad y total y abre el detalle', () => {
    state.cart = [{ quantity: 2 }];
    state.total = 25000;
    render(<PedidosCatalogScreen role="garzon" />);

    const cartButton = screen.getByRole('button', {
      name: /Ver pedido: 2 productos, total/,
    });
    expect(cartButton).toBeTruthy();
    expect(cartButton.textContent).toContain('2 productos');
    expect(cartButton.textContent).toContain('25.000');

    fireEvent.click(cartButton);
    expect(state.splitShorts).toHaveBeenCalledTimes(1);
    expect(state.router.push).toHaveBeenCalledWith('/(app)/garzon/pedido-detalle');
  });

  it('mantiene el acceso al pedido mientras carga el catálogo', () => {
    state.loading = true;
    state.cart = [{ quantity: 1 }];
    state.total = 12000;
    render(<PedidosCatalogScreen role="garzon" />);

    expect(
      screen.getByRole('button', { name: /Ver pedido: 1 producto, total/ }),
    ).toBeTruthy();
  });

  it.each([
    ['garzon', '/(app)/garzon/productos'],
    ['barman', '/(app)/barman/productos'],
  ] as const)(
    'busca productos en todo el catálogo y abre su categoría para %s',
    (role, pathname) => {
      state.productSearch.searchResults = [{
        id: 'pres-corona-210',
        name: 'Corona 210 ml',
        categoria: 'Cervezas',
        category_id: 'cat-cervezas',
      }];
      render(<PedidosCatalogScreen role={role} />);

      fireEvent.change(screen.getByRole('textbox', { name: 'Buscar productos o categorías' }), {
        target: { value: 'Corona' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Abrir Corona 210 ml en Cervezas/ }));

      expect(state.productSearch.setSearchProducto).toHaveBeenLastCalledWith('Corona');
      expect(state.router.push).toHaveBeenCalledWith({
        pathname,
        params: {
          categoryId: 'cat-cervezas',
          categoryName: 'Cervezas',
          search: 'Corona',
        },
      });
    },
  );

  it('muestra un estado de búsqueda vacío distinto de categorías sin coincidencias', () => {
    render(<PedidosCatalogScreen role="garzon" />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar productos o categorías' }), {
      target: { value: 'Corona' },
    });

    expect(screen.getByText('No hay productos con ese nombre.')).toBeTruthy();
    expect(screen.queryByText('No se encontraron categorías')).toBeNull();
  });

  it('permite reintentar la búsqueda global cuando falla', () => {
    state.productSearch.searchError = 'No se pudo buscar productos.';
    render(<PedidosCatalogScreen role="garzon" />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar productos o categorías' }), {
      target: { value: 'Corona' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar búsqueda de productos' }));

    expect(state.productSearch.handleSearchNow).toHaveBeenCalledTimes(1);
  });
});