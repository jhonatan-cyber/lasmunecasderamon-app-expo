import React, { Fragment, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClientesScreen from '@/app/(app)/cajero/clientes';

const h = vi.hoisted(() => ({
  rowRenders: {} as Record<string, number>,
}));

type PressableRenderProps = RenderProps & {
  // Pressable de RN admite children como función ({ pressed }) => nodo.
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
};

type RenderProps = {
  children?: ReactNode;
  style?: unknown;
  onPress?: () => void;
  onRefresh?: () => void;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  value?: string;
};

vi.mock('react-native', () => {
  // Valores animados de RN: basta con que se puedan crear, interpolar y
  // arrancar para que AppModal/PremiumAlert/NotificationBanner rendericen.
  class AnimatedValue {
    value: number;
    constructor(value: number) {
      this.value = value;
    }
    setValue(value: number) {
      this.value = value;
    }
    interpolate() {
      return this;
    }
    addListener() {
      return 'id';
    }
    removeListener() {}
    stopAnimation() {}
  }
  const animation = () => ({
    start: (callback?: (result: { finished: boolean }) => void) =>
      callback?.({ finished: true }),
    stop: () => {},
    reset: () => {},
  });
  const Animated = {
    Value: AnimatedValue,
    View: ({ children }: RenderProps) => <div>{children}</div>,
    Text: ({ children }: RenderProps) => <span>{children}</span>,
    timing: animation,
    spring: animation,
    decay: animation,
    sequence: animation,
    parallel: animation,
    stagger: animation,
    loop: animation,
    event: () => () => {},
  };

  return {
    ActivityIndicator: () => null,
    Alert: { alert: vi.fn() },
    AccessibilityInfo: {
      isReduceMotionEnabled: () => Promise.resolve(false),
      addEventListener: () => ({ remove: () => {} }),
    },
    Animated,
    Appearance: {
      getColorScheme: () => 'light',
      addChangeListener: () => ({ remove: () => {} }),
    },
    useColorScheme: () => 'light',
    useWindowDimensions: () => ({ width: 400, height: 800, fontScale: 1 }),
    Modal: ({ children, visible = true }: RenderProps & { visible?: boolean }) =>
      visible ? <div>{children}</div> : null,
    KeyboardAvoidingView: ({ children }: RenderProps) => <div>{children}</div>,
    PanResponder: { create: () => ({ panHandlers: {} }) },
    Platform: { OS: 'ios', select: (obj: any) => obj?.ios ?? obj?.default },
    View: ({ children }: RenderProps) => <div>{children}</div>,
    ScrollView: ({ children }: RenderProps) => <div>{children}</div>,
    Text: ({ children }: RenderProps) => <span>{children}</span>,
    Pressable: ({ children, onPress }: PressableRenderProps) => (
      <button onClick={onPress}>
        {typeof children === 'function' ? children({ pressed: false }) : children}
      </button>
    ),
    TouchableOpacity: ({ children, onPress }: RenderProps) => <button onClick={onPress}>{children}</button>,
    RefreshControl: ({ onRefresh }: RenderProps) => <button onClick={onRefresh}>Actualizar</button>,
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
    StyleSheet: { create: (styles: unknown) => styles },
    FlatList: ({ data, renderItem, keyExtractor, ListEmptyComponent }: any) => (
      <div>
        {data.length > 0
          ? data.map((item: any, index: number) => (
              <Fragment key={keyExtractor(item)}>{renderItem({ item, index })}</Fragment>
            ))
          : typeof ListEmptyComponent === 'function'
            ? <ListEmptyComponent />
            : ListEmptyComponent}
      </div>
    ),
  };
});
vi.mock('@expo/vector-icons/Ionicons', () => ({ default: () => null }));
// El mock global de expo-image resuelve el `Image` desde react-native; con un
// mock local de RN eso carga el módulo real, así que se mockea aquí.
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
vi.mock('@/components/ui/PremiumHeader', () => ({ PremiumHeader: () => null }));
vi.mock('@/components/ui/PremiumFAB', () => ({ PremiumFAB: () => null }));
vi.mock('@/components/ui/Skeleton', () => ({ Skeleton: () => null }));
vi.mock('@/components/ui/EmptyState', () => ({ EmptyState: () => null }));
vi.mock('@/components/ui/SearchBar', () => ({
  SearchBar: ({ value, onChangeText, placeholder }: RenderProps) => (
    <input
      aria-label="buscar"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChangeText?.(event.target.value)}
    />
  ),
}));
vi.mock('@/components/cajero/clientes/ClientFormModal', () => ({ ClientFormModal: () => null }));
vi.mock('@/components/cajero/clientes/LoadBalanceModal', () => ({ LoadBalanceModal: () => null }));
vi.mock('@/components/cajero/clientes/ClientHistoryModal', () => ({ ClientHistoryModal: () => null }));
// use-color-scheme hace `import('react-native')` fuera de web; con un mock
// local de RN eso carga el módulo real, así que se fija el esquema claro.
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
vi.mock('@/hooks/useRenderCount', () => ({
  useRenderCount: (name: string, props?: Record<string, unknown>) => {
    if (name !== 'ClientCard' || props?.clientId === undefined) return;
    const id = String(props.clientId);
    h.rowRenders[id] = (h.rowRenders[id] ?? 0) + 1;
  },
}));
vi.mock('@/hooks/useClientes', async () => {
  const { useMemo, useState } = await import('react');
  const CLIENTS = [
    { id: 1, name: 'Ana', lastName: 'Pérez', run: '1-9', phone: '111', saldo: 5000, deuda: 0 },
    { id: 2, name: 'Bruno', lastName: 'Díaz', run: '2-7', phone: '222', saldo: 0, deuda: 3000 },
    { id: 3, name: 'Carla', lastName: 'Soto', run: '3-5', phone: '333', saldo: 1200, deuda: 0 },
  ];
  const noop = vi.fn();
  const stable = {
    fetchClients: vi.fn(),
    fetchHistory: vi.fn(),
    handleOpenEdit: noop,
    handleOpenNew: noop,
    handleSaveClient: noop,
    handleOpenLoad: noop,
    handleOpenHistory: noop,
    handleLoadBalance: noop,
    confirmDelete: noop,
  };
  return {
    useClientes: () => {
      const [search, setSearch] = useState('');
      const filteredClients = useMemo(
        () =>
          CLIENTS.filter((client) =>
            `${client.name} ${client.lastName}`.toLowerCase().includes(search.toLowerCase()),
          ),
        [search],
      );
      return {
        ...stable,
        accentColor: '#000',
        isDark: false,
        textPrimary: '#111',
        textSecondary: '#555',
        router: { back: vi.fn(), push: vi.fn() },
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
        isTablet: false,
        loading: false,
        refreshing: false,
        search,
        setSearch,
        cajaAbierta: true,
        clientModalVisible: false,
        setClientModalVisible: noop,
        loadModalVisible: false,
        setLoadModalVisible: noop,
        editingClient: null,
        loadingAmount: '',
        setLoadingAmount: noop,
        loadMetodoPago: 'efectivo',
        setLoadMetodoPago: noop,
        submitting: false,
        historyModalVisible: false,
        setHistoryModalVisible: noop,
        historyLoading: false,
        historyData: [],
        refreshingHistory: false,
        setRefreshingHistory: noop,
        primaryMethod: 'efectivo',
        setPrimaryMethod: noop,
        secondaryMethod: 'transferencia',
        setSecondaryMethod: noop,
        primaryAmount: '',
        setPrimaryAmount: noop,
        secondaryAmount: '',
        setSecondaryAmount: noop,
        formName: '',
        setFormName: noop,
        formLastName: '',
        setFormLastName: noop,
        formRun: '',
        setFormRun: noop,
        formPhone: '',
        setFormPhone: noop,
        filteredClients,
        totals: { totalSaldo: 6200, totalDeuda: 3000 },
        formatCurrency: (value: string) => value,
        unformatCurrency: (value: string) => value,
      };
    },
  };
});

beforeEach(() => {
  h.rowRenders = {};
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('ClientesScreen: repintado de filas al buscar', () => {
  it('no vuelve a renderizar las tarjetas que siguen en la lista', () => {
    render(<ClientesScreen />);
    expect(screen.getByText(/Ana/)).toBeTruthy();
    expect(h.rowRenders['1']).toBe(1);

    fireEvent.change(screen.getByLabelText('buscar'), { target: { value: 'ana' } });

    expect(screen.getByText(/Ana/)).toBeTruthy();
    expect(screen.queryByText(/Bruno/)).toBeNull();
    expect(h.rowRenders['1']).toBe(1);
  });
});
